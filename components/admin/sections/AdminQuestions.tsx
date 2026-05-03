"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminSpinner } from "@/components/admin/AdminSpinner";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";

type SubjectRow = { id: number; name: string; grade: number };

type QuestionRow = {
  id: number;
  subject_id: number | null;
  grade: number | null;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string | null;
  explanation: string | null;
  chapter: string | null;
  year: number | null;
  is_weekly_only: boolean | null;
  subjects?: { name: string } | { name: string }[] | null;
};

const GRADES = [9, 10, 11, 12] as const;
const OPTIONS = ["A", "B", "C", "D"] as const;

type Props = { showToast: (kind: "success" | "error", text: string) => void };

export function AdminQuestions({ showToast }: Props) {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);

  const [filterSubjectId, setFilterSubjectId] = useState<string>("");
  const [filterGrade, setFilterGrade] = useState<string>("");
  const [filterChapter, setFilterChapter] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterWeeklyOnly, setFilterWeeklyOnly] = useState(false);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<QuestionRow | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addForm, setAddForm] = useState({
    subject_id: "",
    grade: "12",
    year: new Date().getFullYear(),
    chapter: "",
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A" as string,
    explanation: "",
    is_weekly_only: false,
  });

  const [subjectOpen, setSubjectOpen] = useState(false);
  const [subjectBusy, setSubjectBusy] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectGrade, setNewSubjectGrade] = useState("12");

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; label: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadSubjects = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("subjects").select("id, name, grade").order("name");
    if (error) {
      showToast("error", error.message);
      return;
    }
    setSubjects((data ?? []) as SubjectRow[]);
  }, [showToast]);

  const fetchQuestions = useCallback(async () => {
    setLoadingList(true);
    try {
      const supabase = createClient();
      let q = supabase
        .from("questions")
        .select(
          "id, subject_id, grade, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, chapter, year, is_weekly_only, subjects(name)"
        )
        .order("id", { ascending: false })
        .limit(600);

      if (filterSubjectId) q = q.eq("subject_id", Number(filterSubjectId));
      if (filterGrade) q = q.eq("grade", Number(filterGrade));
      if (filterChapter.trim()) q = q.ilike("chapter", `%${filterChapter.trim()}%`);
      if (filterKeyword.trim()) q = q.ilike("question_text", `%${filterKeyword.trim()}%`);
      if (filterWeeklyOnly) q = q.eq("is_weekly_only", true);

      const { data, error } = await q;
      if (error) {
        showToast("error", error.message);
        return;
      }
      setQuestions((data ?? []) as QuestionRow[]);
      setSelected(new Set());
    } finally {
      setLoadingList(false);
    }
  }, [
    filterSubjectId,
    filterGrade,
    filterChapter,
    filterKeyword,
    filterWeeklyOnly,
    showToast,
  ]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadingList(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("questions")
          .select(
            "id, subject_id, grade, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, chapter, year, is_weekly_only, subjects(name)"
          )
          .order("id", { ascending: false })
          .limit(600);
        if (error) showToast("error", error.message);
        else if (!cancelled) setQuestions((data ?? []) as QuestionRow[]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingList(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const subjectOptions = useMemo(() => {
    return [...subjects].sort((a, b) => a.name.localeCompare(b.name) || a.grade - b.grade);
  }, [subjects]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === questions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(questions.map((q) => q.id)));
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      const supabase = createClient();
      const ids = [...selected];
      const { error } = await supabase.from("questions").delete().in("id", ids);
      if (error) {
        showToast("error", error.message);
        return;
      }
      showToast("success", `Deleted ${ids.length} question(s).`);
      await fetchQuestions();
    } finally {
      setBulkBusy(false);
    }
  }

  async function saveEdit() {
    if (!editRow) return;
    setEditBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("questions")
        .update({
          question_text: editRow.question_text,
          option_a: editRow.option_a,
          option_b: editRow.option_b,
          option_c: editRow.option_c,
          option_d: editRow.option_d,
          correct_answer: editRow.correct_answer,
          explanation: editRow.explanation,
          chapter: editRow.chapter,
          year: editRow.year,
          is_weekly_only: Boolean(editRow.is_weekly_only),
        })
        .eq("id", editRow.id);
      if (error) {
        showToast("error", error.message);
        return;
      }
      showToast("success", "Question saved.");
      setEditOpen(false);
      await fetchQuestions();
    } finally {
      setEditBusy(false);
    }
  }

  async function submitAdd() {
    const sid = Number(addForm.subject_id);
    if (!Number.isFinite(sid)) {
      showToast("error", "Choose a subject.");
      return;
    }
    setAddBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("questions").insert({
        subject_id: sid,
        grade: Number(addForm.grade),
        question_text: addForm.question_text,
        option_a: addForm.option_a || null,
        option_b: addForm.option_b || null,
        option_c: addForm.option_c || null,
        option_d: addForm.option_d || null,
        correct_answer: addForm.correct_answer as "A" | "B" | "C" | "D",
        explanation: addForm.explanation || null,
        chapter: addForm.chapter || null,
        year: Number(addForm.year),
        is_weekly_only: addForm.is_weekly_only,
      });
      if (error) {
        showToast("error", error.message);
        return;
      }
      showToast("success", "Question added.");
      setAddOpen(false);
      setAddForm((f) => ({
        ...f,
        question_text: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        explanation: "",
        chapter: "",
      }));
      await fetchQuestions();
    } finally {
      setAddBusy(false);
    }
  }

  async function submitNewSubject() {
    const name = newSubjectName.trim();
    if (!name) {
      showToast("error", "Subject name is required.");
      return;
    }
    setSubjectBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("subjects").insert({
        name,
        grade: Number(newSubjectGrade),
      });
      if (error) {
        showToast("error", error.message);
        return;
      }
      showToast("success", "Subject added.");
      setSubjectOpen(false);
      setNewSubjectName("");
      await loadSubjects();
    } finally {
      setSubjectBusy(false);
    }
  }

  async function deleteOne(id: number) {
    setDeleteBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) {
        showToast("error", error.message);
        return;
      }
      showToast("success", "Question deleted.");
      setDeleteConfirm(null);
      await fetchQuestions();
    } finally {
      setDeleteBusy(false);
    }
  }

  function preview(text: string, max = 60) {
    const t = text.replace(/\s+/g, " ").trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max)}…`;
  }

  if (loading && questions.length === 0) {
    return <AdminSpinner label="Loading questions…" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gold">Questions</h2>
          <p className="text-sm text-muted-foreground">Manage bank items and weekly-only flags.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-gold/30 text-gold hover:bg-gold/10"
            onClick={() => setAddOpen(true)}
          >
            Add New Question
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSubjectOpen(true)}
          >
            Add New Subject
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-border/70 p-4 dark:border-gold/15 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Subject</Label>
          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm dark:border-gold/15"
          >
            <option value="">All subjects</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (G{s.grade})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Grade</Label>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm dark:border-gold/15"
          >
            <option value="">All grades</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ch-search">Chapter contains</Label>
          <Input
            id="ch-search"
            value={filterChapter}
            onChange={(e) => setFilterChapter(e.target.value)}
            placeholder="Text search"
            className="dark:border-gold/15"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kw-search">Keyword (question text)</Label>
          <Input
            id="kw-search"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            placeholder="Search wording…"
            className="dark:border-gold/15"
          />
        </div>
        <div className="flex items-end gap-3 pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filterWeeklyOnly}
              onChange={(e) => setFilterWeeklyOnly(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Weekly only
          </label>
        </div>
        <div className="flex items-end">
          <Button type="button" onClick={() => void fetchQuestions()} disabled={loadingList}>
            {loadingList ? "Applying…" : "Apply filters"}
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button
            type="button"
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            disabled={bulkBusy}
            onClick={() => void bulkDelete()}
          >
            {bulkBusy ? "Deleting…" : "Bulk delete"}
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border/70 dark:border-gold/15">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground dark:border-gold/15">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={questions.length > 0 && selected.size === questions.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
              </th>
              <th className="px-3 py-3 font-semibold">ID</th>
              <th className="px-3 py-3 font-semibold">Subject</th>
              <th className="px-3 py-3 font-semibold">Grade</th>
              <th className="px-3 py-3 font-semibold">Chapter</th>
              <th className="px-3 py-3 font-semibold">Year</th>
              <th className="px-3 py-3 font-semibold">Preview</th>
              <th className="px-3 py-3 font-semibold">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 dark:divide-gold/10">
            {questions.map((row) => (
              <tr key={row.id} className="bg-card/30 hover:bg-accent/15">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                </td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">{row.id}</td>
                <td className="px-3 py-3">
                  {Array.isArray(row.subjects)
                    ? row.subjects[0]?.name
                    : row.subjects?.name ?? "—"}
                </td>
                <td className="px-3 py-3 tabular-nums">{row.grade ?? "—"}</td>
                <td className="max-w-[140px] truncate px-3 py-3 text-muted-foreground">{row.chapter ?? "—"}</td>
                <td className="px-3 py-3 tabular-nums">{row.year ?? "—"}</td>
                <td className="max-w-[280px] px-3 py-3 text-muted-foreground">{preview(row.question_text)}</td>
                <td className="px-3 py-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditRow({ ...row });
                      setEditOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {questions.length === 0 && !loadingList && (
        <p className="text-sm text-muted-foreground">No questions match these filters.</p>
      )}

      <AdminModal
        open={editOpen}
        title="Edit question"
        onClose={() => setEditOpen(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveEdit()} disabled={editBusy}>
              {editBusy ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (editRow) {
                  setDeleteConfirm({
                    id: editRow.id,
                    label: `question #${editRow.id}`,
                  });
                }
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        {editRow && (
          <div className="space-y-4">
            <Field label="Question text">
              <textarea
                value={editRow.question_text}
                onChange={(e) => setEditRow({ ...editRow, question_text: e.target.value })}
                rows={5}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm dark:border-gold/15"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["option_a", "option_b", "option_c", "option_d"] as const).map((k, i) => (
                <Field key={k} label={`Option ${OPTIONS[i]}`}>
                  <Input
                    value={editRow[k] ?? ""}
                    onChange={(e) => setEditRow({ ...editRow, [k]: e.target.value })}
                    className="dark:border-gold/15"
                  />
                </Field>
              ))}
            </div>
            <Field label="Correct answer">
              <select
                value={editRow.correct_answer ?? "A"}
                onChange={(e) => setEditRow({ ...editRow, correct_answer: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm dark:border-gold/15"
              >
                {OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Explanation">
              <textarea
                value={editRow.explanation ?? ""}
                onChange={(e) => setEditRow({ ...editRow, explanation: e.target.value })}
                rows={4}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm dark:border-gold/15"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Chapter">
                <Input
                  value={editRow.chapter ?? ""}
                  onChange={(e) => setEditRow({ ...editRow, chapter: e.target.value })}
                  className="dark:border-gold/15"
                />
              </Field>
              <Field label="Year">
                <Input
                  type="number"
                  value={editRow.year ?? ""}
                  onChange={(e) =>
                    setEditRow({
                      ...editRow,
                      year: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="dark:border-gold/15"
                />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(editRow.is_weekly_only)}
                onChange={(e) => setEditRow({ ...editRow, is_weekly_only: e.target.checked })}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Is weekly only
            </label>
          </div>
        )}
      </AdminModal>

      <AdminModal
        open={addOpen}
        title="Add question"
        onClose={() => setAddOpen(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitAdd()} disabled={addBusy}>
              {addBusy ? "Submitting…" : "Submit"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Subject">
            <select
              value={addForm.subject_id}
              onChange={(e) => setAddForm({ ...addForm, subject_id: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm dark:border-gold/15"
            >
              <option value="">Select subject…</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (G{s.grade})
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Grade">
              <select
                value={addForm.grade}
                onChange={(e) => setAddForm({ ...addForm, grade: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm dark:border-gold/15"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Year">
              <Input
                type="number"
                value={addForm.year}
                onChange={(e) => setAddForm({ ...addForm, year: Number(e.target.value) })}
                className="dark:border-gold/15"
              />
            </Field>
          </div>
          <Field label="Chapter">
            <Input
              value={addForm.chapter}
              onChange={(e) => setAddForm({ ...addForm, chapter: e.target.value })}
              className="dark:border-gold/15"
            />
          </Field>
          <Field label="Question text">
            <textarea
              value={addForm.question_text}
              onChange={(e) => setAddForm({ ...addForm, question_text: e.target.value })}
              rows={5}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm dark:border-gold/15"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["option_a", "option_b", "option_c", "option_d"] as const).map((k, i) => (
              <Field key={k} label={`Option ${OPTIONS[i]}`}>
                <Input
                  value={addForm[k]}
                  onChange={(e) => setAddForm({ ...addForm, [k]: e.target.value })}
                  className="dark:border-gold/15"
                />
              </Field>
            ))}
          </div>
          <Field label="Correct answer">
            <select
              value={addForm.correct_answer}
              onChange={(e) => setAddForm({ ...addForm, correct_answer: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm dark:border-gold/15"
            >
              {OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Explanation">
            <textarea
              value={addForm.explanation}
              onChange={(e) => setAddForm({ ...addForm, explanation: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm dark:border-gold/15"
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={addForm.is_weekly_only}
              onChange={(e) => setAddForm({ ...addForm, is_weekly_only: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Is weekly only
          </label>
        </div>
      </AdminModal>

      <AdminModal
        open={subjectOpen}
        title="Add subject"
        onClose={() => setSubjectOpen(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setSubjectOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitNewSubject()} disabled={subjectBusy}>
              {subjectBusy ? "Saving…" : "Submit"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} className="dark:border-gold/15" />
          </Field>
          <Field label="Grade">
            <select
              value={newSubjectGrade}
              onChange={(e) => setNewSubjectGrade(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm dark:border-gold/15"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={!!deleteConfirm}
        itemName={deleteConfirm?.label ?? ""}
        loading={deleteBusy}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) void deleteOne(deleteConfirm.id).then(() => setEditOpen(false));
        }}
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
