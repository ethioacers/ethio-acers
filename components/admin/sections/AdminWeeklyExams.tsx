"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminSpinner } from "@/components/admin/AdminSpinner";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";

type SubjectRow = { id: number; name: string; grade: number };

type ExamRow = {
  id: number;
  title: string;
  description: string | null;
  subject_id: number | null;
  grade: number | null;
  duration_minutes: number;
  week_start: string;
  week_end: string;
  is_active: boolean;
  subjects?: { name: string } | { name: string }[] | null;
};

type QuestionMini = {
  id: number;
  question_text: string;
};

type LinkedQ = {
  question_id: number;
  question_order: number;
  questions: QuestionMini | QuestionMini[] | null;
};

const GRADES = [9, 10, 11, 12] as const;

type Props = { showToast: (kind: "success" | "error", text: string) => void };

export function AdminWeeklyExams({ showToast }: Props) {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyExamId, setBusyExamId] = useState<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    subject_id: "",
    grade: "12",
    duration_minutes: 60,
    week_start: "",
    week_end: "",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editExam, setEditExam] = useState<ExamRow | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewExam, setViewExam] = useState<ExamRow | null>(null);
  const [linked, setLinked] = useState<LinkedQ[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const [addQOpen, setAddQOpen] = useState(false);
  const [addQExam, setAddQExam] = useState<ExamRow | null>(null);
  const [addQKeyword, setAddQKeyword] = useState("");
  const [addQResults, setAddQResults] = useState<QuestionMini[]>([]);
  const [addQBusy, setAddQBusy] = useState(false);

  const [deleteExam, setDeleteExam] = useState<ExamRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadSubjects = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("subjects").select("id, name, grade").order("name");
    if (error) showToast("error", error.message);
    else setSubjects((data ?? []) as SubjectRow[]);
  }, [showToast]);

  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("weekly_exams")
        .select("id, title, description, subject_id, grade, duration_minutes, week_start, week_end, is_active, subjects(name)")
        .order("week_start", { ascending: false });
      if (error) {
        showToast("error", error.message);
        return;
      }
      const list = (data ?? []) as ExamRow[];
      setExams(list);

      const countMap: Record<number, number> = {};
      await Promise.all(
        list.map(async (ex) => {
          const { count, error: cErr } = await supabase
            .from("weekly_exam_questions")
            .select("*", { count: "exact", head: true })
            .eq("weekly_exam_id", ex.id);
          if (!cErr) countMap[ex.id] = count ?? 0;
        })
      );
      setCounts(countMap);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadSubjects();
    void loadExams();
  }, [loadSubjects, loadExams]);

  async function toggleActive(ex: ExamRow, next: boolean) {
    setBusyExamId(ex.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("weekly_exams").update({ is_active: next }).eq("id", ex.id);
      if (error) {
        showToast("error", error.message);
        return;
      }
      setExams((prev) => prev.map((e) => (e.id === ex.id ? { ...e, is_active: next } : e)));
      showToast("success", next ? "Exam activated." : "Exam deactivated.");
    } finally {
      setBusyExamId(null);
    }
  }

  async function openView(ex: ExamRow) {
    setViewExam(ex);
    setViewOpen(true);
    setViewLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("weekly_exam_questions")
        .select("question_id, question_order, questions(id, question_text)")
        .eq("weekly_exam_id", ex.id)
        .order("question_order", { ascending: true });
      if (error) {
        showToast("error", error.message);
        return;
      }
      setLinked((data ?? []) as LinkedQ[]);
    } finally {
      setViewLoading(false);
    }
  }

  async function removeLinkedQuestion(examId: number, questionId: number) {
    setAddQBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("weekly_exam_questions")
        .delete()
        .eq("weekly_exam_id", examId)
        .eq("question_id", questionId);
      if (error) {
        showToast("error", error.message);
        return;
      }
      setLinked((prev) => prev.filter((r) => r.question_id !== questionId));
      setCounts((c) => ({ ...c, [examId]: Math.max(0, (c[examId] ?? 1) - 1) }));
      showToast("success", "Question removed from exam.");
    } finally {
      setAddQBusy(false);
    }
  }

  async function searchQuestionsForAdd() {
    if (!addQExam) return;
    setAddQBusy(true);
    try {
      const supabase = createClient();
      let q = supabase
        .from("questions")
        .select("id, question_text")
        .order("id", { ascending: false })
        .limit(40);
      if (addQKeyword.trim()) q = q.ilike("question_text", `%${addQKeyword.trim()}%`);
      const { data, error } = await q;
      if (error) {
        showToast("error", error.message);
        return;
      }
      setAddQResults((data ?? []) as QuestionMini[]);
    } finally {
      setAddQBusy(false);
    }
  }

  async function addQuestionToExam(qid: number) {
    if (!addQExam) return;
    setAddQBusy(true);
    try {
      const supabase = createClient();
      const { data: ordRow } = await supabase
        .from("weekly_exam_questions")
        .select("question_order")
        .eq("weekly_exam_id", addQExam.id)
        .order("question_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = (ordRow?.question_order ?? 0) + 1;
      const { error } = await supabase.from("weekly_exam_questions").insert({
        weekly_exam_id: addQExam.id,
        question_id: qid,
        question_order: nextOrder,
      });
      if (error) {
        showToast("error", error.message);
        return;
      }
      showToast("success", "Question added to exam.");
      setCounts((c) => ({ ...c, [addQExam.id]: (c[addQExam.id] ?? 0) + 1 }));
      if (viewOpen && viewExam?.id === addQExam.id) {
        const { data } = await supabase
          .from("weekly_exam_questions")
          .select("question_id, question_order, questions(id, question_text)")
          .eq("weekly_exam_id", addQExam.id)
          .order("question_order", { ascending: true });
        setLinked((data ?? []) as LinkedQ[]);
      }
    } finally {
      setAddQBusy(false);
    }
  }

  async function saveEdit() {
    if (!editExam) return;
    setEditBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("weekly_exams")
        .update({
          title: editExam.title,
          description: editExam.description,
          subject_id: editExam.subject_id,
          grade: editExam.grade,
          duration_minutes: editExam.duration_minutes,
          week_start: editExam.week_start,
          week_end: editExam.week_end,
        })
        .eq("id", editExam.id);
      if (error) {
        showToast("error", error.message);
        return;
      }
      showToast("success", "Weekly exam updated.");
      setEditOpen(false);
      await loadExams();
    } finally {
      setEditBusy(false);
    }
  }

  async function submitCreate() {
    if (!createForm.title.trim() || !createForm.week_start || !createForm.week_end) {
      showToast("error", "Title and week range are required.");
      return;
    }
    setCreateBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("weekly_exams").insert({
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        subject_id: createForm.subject_id ? Number(createForm.subject_id) : null,
        grade: createForm.grade ? Number(createForm.grade) : null,
        duration_minutes: Number(createForm.duration_minutes) || 60,
        week_start: createForm.week_start,
        week_end: createForm.week_end,
        is_active: false,
      });
      if (error) {
        showToast("error", error.message);
        return;
      }
      showToast("success", "Weekly exam created.");
      setCreateOpen(false);
      setCreateForm({
        title: "",
        description: "",
        subject_id: "",
        grade: "12",
        duration_minutes: 60,
        week_start: "",
        week_end: "",
      });
      await loadExams();
    } finally {
      setCreateBusy(false);
    }
  }

  async function confirmDeleteExam() {
    if (!deleteExam) return;
    setDeleteBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("weekly_exams").delete().eq("id", deleteExam.id);
      if (error) {
        showToast("error", error.message);
        return;
      }
      showToast("success", "Weekly exam deleted.");
      setDeleteExam(null);
      await loadExams();
    } finally {
      setDeleteBusy(false);
    }
  }

  function fmtDate(d: string) {
    try {
      return new Date(d + "T12:00:00").toLocaleDateString();
    } catch {
      return d;
    }
  }

  if (loading && exams.length === 0) {
    return <AdminSpinner label="Loading weekly exams…" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gold">Weekly exams</h2>
          <p className="text-sm text-muted-foreground">Create, publish, and attach questions.</p>
        </div>
        <Button
          type="button"
          className="border border-gold/30 bg-gold/10 text-gold hover:bg-gold/20"
          onClick={() => setCreateOpen(true)}
        >
          Create New Weekly Exam
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {exams.map((ex) => (
          <div
            key={ex.id}
            className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/40 p-5 shadow-sm dark:border-gold/15"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground">{ex.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(Array.isArray(ex.subjects) ? ex.subjects[0]?.name : ex.subjects?.name) ??
                    "No subject"}{" "}
                  · Grade {ex.grade ?? "—"}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                Active
                <button
                  type="button"
                  role="switch"
                  aria-checked={ex.is_active}
                  disabled={busyExamId === ex.id}
                  onClick={() => void toggleActive(ex, !ex.is_active)}
                  className={[
                    "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
                    ex.is_active
                      ? "border-primary/50 bg-primary/25"
                      : "border-border/80 bg-muted/50 dark:border-gold/10",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-block h-5 w-5 transform rounded-full bg-background shadow-sm ring-1 ring-border transition-transform",
                      ex.is_active ? "translate-x-6" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </label>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
              <div>
                <dt className="uppercase tracking-wide">Questions</dt>
                <dd className="font-semibold text-foreground">{counts[ex.id] ?? 0}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide">Duration</dt>
                <dd className="font-semibold text-foreground">{ex.duration_minutes} min</dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="uppercase tracking-wide">Week</dt>
                <dd className="font-medium text-foreground">
                  {fmtDate(ex.week_start)} – {fmtDate(ex.week_end)}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => {
                setEditExam(ex);
                setEditOpen(true);
              }}>
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteExam(ex)}
              >
                Delete
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void openView(ex)}>
                View Questions
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setAddQExam(ex);
                  setAddQKeyword("");
                  setAddQResults([]);
                  setAddQOpen(true);
                }}
              >
                Add Questions
              </Button>
            </div>
          </div>
        ))}
      </div>

      {exams.length === 0 && (
        <p className="text-sm text-muted-foreground">No weekly exams yet. Create one to get started.</p>
      )}

      <AdminModal
        open={createOpen}
        title="Create weekly exam"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitCreate()} disabled={createBusy}>
              {createBusy ? "Creating…" : "Create"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Title">
            <Input
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="dark:border-gold/15"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm dark:border-gold/15"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject">
              <select
                value={createForm.subject_id}
                onChange={(e) => setCreateForm({ ...createForm, subject_id: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm dark:border-gold/15"
              >
                <option value="">Optional</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (G{s.grade})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Grade">
              <select
                value={createForm.grade}
                onChange={(e) => setCreateForm({ ...createForm, grade: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm dark:border-gold/15"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Duration (minutes)">
            <Input
              type="number"
              min={1}
              value={createForm.duration_minutes}
              onChange={(e) =>
                setCreateForm({ ...createForm, duration_minutes: Number(e.target.value) })
              }
              className="dark:border-gold/15"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Week start">
              <Input
                type="date"
                value={createForm.week_start}
                onChange={(e) => setCreateForm({ ...createForm, week_start: e.target.value })}
                className="dark:border-gold/15"
              />
            </Field>
            <Field label="Week end">
              <Input
                type="date"
                value={createForm.week_end}
                onChange={(e) => setCreateForm({ ...createForm, week_end: e.target.value })}
                className="dark:border-gold/15"
              />
            </Field>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={editOpen}
        title="Edit weekly exam"
        onClose={() => setEditOpen(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveEdit()} disabled={editBusy}>
              {editBusy ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        {editExam && (
          <div className="space-y-4">
            <Field label="Title">
              <Input
                value={editExam.title}
                onChange={(e) => setEditExam({ ...editExam, title: e.target.value })}
                className="dark:border-gold/15"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={editExam.description ?? ""}
                onChange={(e) => setEditExam({ ...editExam, description: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm dark:border-gold/15"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Subject">
                <select
                  value={editExam.subject_id ?? ""}
                  onChange={(e) =>
                    setEditExam({
                      ...editExam,
                      subject_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm dark:border-gold/15"
                >
                  <option value="">None</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (G{s.grade})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Grade">
                <select
                  value={editExam.grade ?? ""}
                  onChange={(e) =>
                    setEditExam({
                      ...editExam,
                      grade: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm dark:border-gold/15"
                >
                  <option value="">—</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Duration (minutes)">
              <Input
                type="number"
                min={1}
                value={editExam.duration_minutes}
                onChange={(e) =>
                  setEditExam({ ...editExam, duration_minutes: Number(e.target.value) })
                }
                className="dark:border-gold/15"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Week start">
                <Input
                  type="date"
                  value={editExam.week_start?.slice(0, 10) ?? ""}
                  onChange={(e) => setEditExam({ ...editExam, week_start: e.target.value })}
                  className="dark:border-gold/15"
                />
              </Field>
              <Field label="Week end">
                <Input
                  type="date"
                  value={editExam.week_end?.slice(0, 10) ?? ""}
                  onChange={(e) => setEditExam({ ...editExam, week_end: e.target.value })}
                  className="dark:border-gold/15"
                />
              </Field>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={viewOpen}
        title={viewExam ? `Questions — ${viewExam.title}` : "Questions"}
        onClose={() => setViewOpen(false)}
      >
        {viewLoading ? (
          <AdminSpinner label="Loading questions…" />
        ) : (
          <ul className="space-y-3">
            {linked.map((row) => {
              const q = Array.isArray(row.questions) ? row.questions[0] : row.questions;
              const text = q?.question_text?.slice(0, 120) ?? "—";
              return (
                <li
                  key={row.question_id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/60 p-3 dark:border-gold/10"
                >
                  <span className="text-sm text-muted-foreground">
                    <span className="font-mono text-xs text-gold/90">#{row.question_id}</span> — {text}
                    {q?.question_text && q.question_text.length > 120 ? "…" : ""}
                  </span>
                  {viewExam ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-destructive/40 text-destructive"
                      disabled={addQBusy}
                      onClick={() => void removeLinkedQuestion(viewExam.id, row.question_id)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </li>
              );
            })}
            {linked.length === 0 && (
              <p className="text-sm text-muted-foreground">No questions linked yet.</p>
            )}
          </ul>
        )}
      </AdminModal>

      <AdminModal
        open={addQOpen}
        title={addQExam ? `Add questions — ${addQExam.title}` : "Add questions"}
        onClose={() => setAddQOpen(false)}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Keyword search…"
              value={addQKeyword}
              onChange={(e) => setAddQKeyword(e.target.value)}
              className="max-w-md dark:border-gold/15"
            />
            <Button type="button" onClick={() => void searchQuestionsForAdd()} disabled={addQBusy}>
              Search
            </Button>
          </div>
          <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
            {addQResults.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm dark:border-gold/10"
              >
                <span className="min-w-0 flex-1 text-muted-foreground">
                  <span className="font-mono text-gold/90">#{q.id}</span> {q.question_text.slice(0, 100)}
                  {q.question_text.length > 100 ? "…" : ""}
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={addQBusy}
                  onClick={() => void addQuestionToExam(q.id)}
                >
                  Add
                </Button>
              </li>
            ))}
          </ul>
          {addQResults.length === 0 && (
            <p className="text-xs text-muted-foreground">Run a search to find questions.</p>
          )}
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={!!deleteExam}
        itemName={deleteExam ? `“${deleteExam.title}”` : ""}
        loading={deleteBusy}
        onCancel={() => setDeleteExam(null)}
        onConfirm={() => void confirmDeleteExam()}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
