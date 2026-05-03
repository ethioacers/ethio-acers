"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminSpinner } from "@/components/admin/AdminSpinner";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";

type SubjectRow = { id: number; name: string; grade: number };

type NoteRow = {
  id: number;
  subject_id: number;
  grade: number;
  topic: string;
  unit: string | null;
  content: string | null;
  file_url: string | null;
  is_ai_generated: boolean;
  subjects?: { name: string } | { name: string }[] | null;
};

const GRADES = [9, 10, 11, 12] as const;

type Props = { showToast: (kind: "success" | "error", text: string) => void };

export function AdminNotes({ showToast }: Props) {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addForm, setAddForm] = useState({
    subject_id: "",
    grade: "12",
    topic: "",
    unit: "",
    content: "",
    file_url: "",
  });

  const [deleteNote, setDeleteNote] = useState<NoteRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadSubjects = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("subjects").select("id, name, grade").order("name");
    if (error) showToast("error", error.message);
    else setSubjects((data ?? []) as SubjectRow[]);
  }, [showToast]);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notes")
        .select(
          "id, subject_id, grade, topic, unit, content, file_url, is_ai_generated, subjects(name)"
        )
        .order("id", { ascending: false });
      if (error) {
        showToast("error", error.message);
        return;
      }
      setNotes((data ?? []) as unknown as NoteRow[]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadSubjects();
    void loadNotes();
  }, [loadSubjects, loadNotes]);

  async function saveInline(row: NoteRow, patch: Partial<Pick<NoteRow, "topic" | "unit">>) {
    setSavingId(row.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("notes")
        .update({
          topic: patch.topic ?? row.topic,
          unit: patch.unit !== undefined ? patch.unit : row.unit,
        })
        .eq("id", row.id);
      if (error) {
        showToast("error", error.message);
        return;
      }
      setNotes((prev) =>
        prev.map((n) =>
          n.id === row.id ? { ...n, ...patch } : n
        )
      );
      showToast("success", "Note updated.");
    } finally {
      setSavingId(null);
    }
  }

  async function submitAdd() {
    if (!addForm.subject_id || !addForm.topic.trim()) {
      showToast("error", "Subject and topic are required.");
      return;
    }
    setAddBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("notes").insert({
        subject_id: Number(addForm.subject_id),
        grade: Number(addForm.grade),
        topic: addForm.topic.trim(),
        unit: addForm.unit.trim() || null,
        content: addForm.content.trim() || null,
        file_url: addForm.file_url.trim() || null,
        is_ai_generated: false,
      });
      if (error) {
        showToast("error", error.message);
        return;
      }
      showToast("success", "Note created.");
      setAddOpen(false);
      setAddForm({
        subject_id: "",
        grade: "12",
        topic: "",
        unit: "",
        content: "",
        file_url: "",
      });
      await loadNotes();
    } finally {
      setAddBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteNote) return;
    setDeleteBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("notes").delete().eq("id", deleteNote.id);
      if (error) {
        showToast("error", error.message);
        return;
      }
      showToast("success", "Note deleted.");
      setDeleteNote(null);
      setNotes((prev) => prev.filter((n) => n.id !== deleteNote.id));
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loading && notes.length === 0) {
    return <AdminSpinner label="Loading notes…" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gold">Notes</h2>
          <p className="text-sm text-muted-foreground">Library maintenance and quick edits.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-gold/30 text-gold hover:bg-gold/10"
          onClick={() => setAddOpen(true)}
        >
          Add New Note
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/70 dark:border-gold/15">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground dark:border-gold/15">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Subject</th>
              <th className="px-4 py-3 font-semibold">Grade</th>
              <th className="px-4 py-3 font-semibold">Unit</th>
              <th className="px-4 py-3 font-semibold">AI</th>
              <th className="px-4 py-3 font-semibold">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 dark:divide-gold/10">
            {notes.map((row) => (
              <tr key={row.id} className="bg-card/30 hover:bg-accent/10">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.id}</td>
                <td className="max-w-[220px] px-4 py-3">
                  <Input
                    value={row.topic}
                    disabled={savingId === row.id}
                    onChange={(e) =>
                      setNotes((prev) =>
                        prev.map((n) => (n.id === row.id ? { ...n, topic: e.target.value } : n))
                      )
                    }
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== row.topic) void saveInline(row, { topic: v });
                    }}
                    className="h-9 text-sm dark:border-gold/15"
                  />
                </td>
                <td className="px-4 py-3">
                  {Array.isArray(row.subjects) ? row.subjects[0]?.name : row.subjects?.name ?? "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">{row.grade}</td>
                <td className="max-w-[180px] px-4 py-3">
                  <Input
                    value={row.unit ?? ""}
                    placeholder="Unit"
                    disabled={savingId === row.id}
                    onChange={(e) =>
                      setNotes((prev) =>
                        prev.map((n) =>
                          n.id === row.id ? { ...n, unit: e.target.value } : n
                        )
                      )
                    }
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== row.unit) void saveInline(row, { unit: v });
                    }}
                    className="h-9 text-sm dark:border-gold/15"
                  />
                </td>
                <td className="px-4 py-3 text-xs">{row.is_ai_generated ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteNote(row)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {notes.length === 0 && (
        <p className="text-sm text-muted-foreground">No notes in the database yet.</p>
      )}

      <AdminModal
        open={addOpen}
        title="Add note"
        onClose={() => setAddOpen(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitAdd()} disabled={addBusy}>
              {addBusy ? "Saving…" : "Submit"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <select
                value={addForm.subject_id}
                onChange={(e) => setAddForm({ ...addForm, subject_id: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm dark:border-gold/15"
              >
                <option value="">Select…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (G{s.grade})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
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
            </div>
          </div>
          <div className="space-y-2">
            <Label>Topic (title)</Label>
            <Input
              value={addForm.topic}
              onChange={(e) => setAddForm({ ...addForm, topic: e.target.value })}
              className="dark:border-gold/15"
            />
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Input
              value={addForm.unit}
              onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
              className="dark:border-gold/15"
            />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <textarea
              value={addForm.content}
              onChange={(e) => setAddForm({ ...addForm, content: e.target.value })}
              rows={8}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm dark:border-gold/15"
            />
          </div>
          <div className="space-y-2">
            <Label>File URL</Label>
            <Input
              value={addForm.file_url}
              onChange={(e) => setAddForm({ ...addForm, file_url: e.target.value })}
              placeholder="https://..."
              className="dark:border-gold/15"
            />
          </div>
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={!!deleteNote}
        itemName={deleteNote ? `“${deleteNote.topic}”` : ""}
        loading={deleteBusy}
        onCancel={() => setDeleteNote(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
