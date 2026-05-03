"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
};

const GRADES = [9, 10, 11, 12] as const;

const AI_TAB_KEY = "__ai_generate__";
const UNCATEGORIZED_KEY = "__uncategorized__";

function previewText(content: string | null, max = 100): string {
  if (!content?.trim()) return "No preview available.";
  const stripped = content
    .replace(/\r\n/g, "\n")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/[*_`]/g, "")
    .replace(/\n+/g, " ")
    .trim();
  if (stripped.length <= max) return stripped;
  return `${stripped.slice(0, max)}…`;
}

export default function NotesPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | "">("");

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>(AI_TAB_KEY);

  const [aiTopic, setAiTopic] = useState("");
  const [aiResult, setAiResult] = useState<{ content: string; isFromDb: boolean } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setInitError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) {
          setInitError(error.message);
          return;
        }
        if (!user) {
          router.replace("/login");
          return;
        }
        const { data, error: subjErr } = await supabase.from("subjects").select("id, name, grade");
        if (subjErr) {
          setInitError(subjErr.message);
        }
        setSubjects((data as SubjectRow[]) ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setInitError(msg || "Failed to load notes page.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const subjectId = useMemo(() => {
    if (!selectedSubject || selectedGrade === "") return null;
    return subjects.find((s) => s.name === selectedSubject && s.grade === selectedGrade)?.id ?? null;
  }, [selectedSubject, selectedGrade, subjects]);

  const subjectNames = useMemo(
    () => [...new Set(subjects.map((s) => s.name))].sort(),
    [subjects]
  );

  const sortedUnits = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      const u = n.unit?.trim();
      if (u) set.add(u);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const hasUncategorized = useMemo(
    () => notes.some((n) => !n.unit?.trim()),
    [notes]
  );

  const tabOrder = useMemo(() => {
    const tabs: string[] = [...sortedUnits];
    if (hasUncategorized) tabs.push(UNCATEGORIZED_KEY);
    tabs.push(AI_TAB_KEY);
    return tabs;
  }, [sortedUnits, hasUncategorized]);

  /** Dropdown options mirror tab destinations (explicit unit picker + AI). */
  const unitPickerOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const u of sortedUnits) {
      opts.push({ value: u, label: u });
    }
    if (hasUncategorized) {
      opts.push({ value: UNCATEGORIZED_KEY, label: "Uncategorized" });
    }
    opts.push({ value: AI_TAB_KEY, label: "✨ AI Generate" });
    return opts;
  }, [sortedUnits, hasUncategorized]);

  const loadNotes = useCallback(async () => {
    if (!subjectId || selectedGrade === "") {
      setNotes([]);
      setNotesError(null);
      return;
    }
    setNotesLoading(true);
    setNotesError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notes")
        .select("id, subject_id, grade, topic, unit, content, file_url, is_ai_generated, created_at")
        .eq("subject_id", subjectId)
        .eq("grade", selectedGrade)
        .order("created_at", { ascending: false });

      if (error) {
        setNotesError(error.message);
        setNotes([]);
        return;
      }
      setNotes((data as NoteRow[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotesError(msg || "Failed to load notes.");
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [subjectId, selectedGrade]);

  useEffect(() => {
    if (!selectedSubject || selectedGrade === "") {
      setNotes([]);
      setNotesError(null);
      setActiveTab(AI_TAB_KEY);
      return;
    }
    if (!subjectId) {
      setNotes([]);
      setNotesError("Subject not found for this grade.");
      return;
    }
    void loadNotes();
  }, [selectedSubject, selectedGrade, subjectId, loadNotes]);

  useEffect(() => {
    if (!tabOrder.includes(activeTab)) {
      setActiveTab(tabOrder[0] ?? AI_TAB_KEY);
    }
  }, [tabOrder, activeTab]);

  const notesForActiveUnit = useMemo(() => {
    if (activeTab === AI_TAB_KEY) return [];
    if (activeTab === UNCATEGORIZED_KEY) {
      return notes.filter((n) => !n.unit?.trim());
    }
    return notes.filter((n) => (n.unit ?? "").trim() === activeTab);
  }, [notes, activeTab]);

  async function handleGenerateNotes() {
    const topicTrimmed = aiTopic.trim();
    if (!selectedSubject || selectedGrade === "" || !topicTrimmed) {
      setAiError("Select subject and grade, then enter a topic.");
      return;
    }
    if (!subjectId) {
      setAiError("Subject not found for this grade.");
      return;
    }

    setAiError(null);
    setAiLoading(true);
    setAiResult(null);

    const supabase = createClient();

    try {
      const { data: existing, error: existingErr } = await supabase
        .from("notes")
        .select("id, content")
        .eq("subject_id", subjectId)
        .eq("grade", selectedGrade)
        .eq("topic", topicTrimmed)
        .maybeSingle();

      if (existingErr) {
        setAiError(existingErr.message);
        setAiLoading(false);
        return;
      }
      if (existing?.content) {
        setAiResult({ content: existing.content as string, isFromDb: true });
        setAiLoading(false);
        return;
      }
    } catch {
      setAiError("Failed to check saved notes.");
      setAiLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedSubject,
          grade: selectedGrade,
          topic: topicTrimmed,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAiError(data.message ?? data.error ?? "Failed to generate notes.");
        return;
      }

      setAiResult({ content: data.content as string, isFromDb: false });

      const newId = data.id as number | undefined;
      if (newId != null) {
        const { error: unitErr } = await supabase
          .from("notes")
          .update({ unit: "AI Generated" })
          .eq("id", newId);
        if (unitErr) {
          console.error("notes unit update:", unitErr);
        }
      }

      await loadNotes();
      setActiveTab("AI Generated");
    } catch {
      setAiError("Could not connect to the server.");
    } finally {
      setAiLoading(false);
    }
  }

  const selectChrome =
    "select-theme h-11 w-full rounded-xl border bg-background/90 px-4 py-2.5 text-sm shadow-sm transition-[box-shadow,border-color] focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25";

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-background p-6 pb-24 md:pb-6">
          <p className="text-muted-foreground">Loading…</p>
        </main>
      </>
    );
  }

  const selectionReady = Boolean(selectedSubject && selectedGrade !== "");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pb-24 pt-6 md:pb-10">
        <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6">
          {initError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {initError}
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gold sm:text-3xl">Notes</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse by unit or generate new notes with AI.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground transition-colors hover:text-gold"
            >
              ← Dashboard
            </Link>
          </div>

          {/* Top: subject + grade */}
          <section className="rounded-2xl border border-border/60 bg-card/40 p-5 shadow-sm backdrop-blur-sm dark:border-gold/15 dark:bg-card/60">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="notes-subject" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Subject
                </Label>
                <select
                  id="notes-subject"
                  className={`${selectChrome} ${
                    selectedSubject ? "border-gold/40 ring-1 ring-gold/20" : "border-input"
                  }`}
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="">Select subject</option>
                  {subjectNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes-grade" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Grade
                </Label>
                <select
                  id="notes-grade"
                  className={`${selectChrome} ${
                    selectedGrade !== "" ? "border-gold/40 ring-1 ring-gold/20" : "border-input"
                  }`}
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Select grade</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>
              {/* Unit picker: mirrors tabs; avoids relying only on horizontally scrolled tab bar */}
              {selectionReady && subjectId !== null && !notesLoading && unitPickerOptions.length > 0 && (
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="notes-unit" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Unit
                  </Label>
                  <select
                    id="notes-unit"
                    className={`${selectChrome} ${
                      activeTab ? "border-gold/40 ring-1 ring-gold/20" : "border-input"
                    }`}
                    value={
                      tabOrder.includes(activeTab) ? activeTab : unitPickerOptions[0]?.value ?? AI_TAB_KEY
                    }
                    onChange={(e) => setActiveTab(e.target.value)}
                  >
                    {unitPickerOptions.map(({ value: v, label }) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    List comes from the <span className="font-medium text-foreground/90">unit</span> stored on notes.
                    Missing a unit here? Confirm your SQL inserts use the matching subject ID and grade, and a non‑empty{" "}
                    <code className="rounded bg-muted px-1 py-px text-[11px]">unit</code> column.
                  </p>
                </div>
              )}
              {selectionReady && subjectId !== null && notesLoading && (
                <div className="flex items-end pb-2 sm:col-span-2 lg:col-span-1">
                  <p className="text-sm text-muted-foreground">Loading units…</p>
                </div>
              )}
            </div>
          </section>

          {!selectionReady && (
            <div className="rounded-2xl border border-dashed border-gold/30 bg-muted/20 px-6 py-16 text-center">
              <p className="text-base font-medium text-foreground">Select a subject and grade to view notes</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose both fields above to load units and notes for that course.
              </p>
            </div>
          )}

          {selectionReady && (
            <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/30 shadow-lg dark:border-gold/15 dark:bg-card/50">
              {/* Tab bar */}
              <div className="border-b border-border/60 bg-muted/20 dark:border-gold/10 dark:bg-muted/10">
                <div className="flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {tabOrder.map((tabKey) => {
                    const isAi = tabKey === AI_TAB_KEY;
                    const isUncat = tabKey === UNCATEGORIZED_KEY;
                    const label = isAi ? "✨ AI Generate" : isUncat ? "Uncategorized" : tabKey;
                    const active = activeTab === tabKey;
                    return (
                      <button
                        key={tabKey}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveTab(tabKey)}
                        className={`relative shrink-0 whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors sm:px-5 ${
                          active
                            ? "border-gold text-gold"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {active && (
                          <span
                            className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-gold to-transparent opacity-90"
                            aria-hidden
                          />
                        )}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {notesError && (
                  <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {notesError}
                  </p>
                )}

                {notesLoading && <p className="text-sm text-muted-foreground">Loading notes…</p>}

                {activeTab === AI_TAB_KEY && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="ai-topic" className="text-sm font-medium text-foreground">
                        Topic
                      </Label>
                      <Input
                        id="ai-topic"
                        type="text"
                        placeholder="Enter a topic…"
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        className="border-border/80 bg-background/80 focus-visible:ring-gold/30"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleGenerateNotes}
                      disabled={aiLoading}
                      className="bg-gold text-black hover:bg-gold/90"
                    >
                      {aiLoading ? "Generating…" : "Generate"}
                    </Button>
                    {aiError && (
                      <p className="text-sm text-destructive">{aiError}</p>
                    )}
                    {aiResult && (
                      <div className="rounded-xl border border-gold/25 bg-background/50 p-5 dark:bg-background/40">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {aiResult.isFromDb ? "Saved note" : "Generated note"}
                        </p>
                        <NoteMarkdown content={aiResult.content} />
                      </div>
                    )}
                  </div>
                )}

                {activeTab !== AI_TAB_KEY && !notesLoading && notes.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gold/25 bg-muted/10 px-4 py-12 text-center">
                    <p className="font-medium text-foreground">
                      No notes available yet for this subject. Try generating with AI!
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 border-gold/40 text-gold hover:bg-gold/10"
                      onClick={() => setActiveTab(AI_TAB_KEY)}
                    >
                      Open ✨ AI Generate
                    </Button>
                  </div>
                )}

                {activeTab !== AI_TAB_KEY && !notesLoading && notes.length > 0 && notesForActiveUnit.length === 0 && (
                  <p className="rounded-xl border border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                    No notes in this unit. Try another tab or generate with AI.
                  </p>
                )}

                {activeTab !== AI_TAB_KEY && !notesLoading && notesForActiveUnit.length > 0 && (
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {notesForActiveUnit.map((note) => {
                      return (
                        <li key={note.id}>
                          <Link
                            href={`/notes/${note.id}`}
                            className="group block w-full rounded-xl border border-border/70 bg-card/80 p-4 text-left shadow-sm transition-all hover:border-gold/45 hover:shadow-md dark:border-gold/10 dark:bg-card/40"
                          >
                            <h3 className="font-semibold text-foreground group-hover:text-gold">
                              {note.topic}
                            </h3>
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {previewText(note.content)}
                            </p>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
