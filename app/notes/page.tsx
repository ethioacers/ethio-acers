"use client";

import {
  cloneElement,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { LatexRenderer } from "@/components/LatexRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Walk markdown-rendered React nodes and render string leaves with LatexRenderer ($...$, etc.). */
function mapMdLeaves(node: ReactNode): ReactNode {
  if (node == null || typeof node === "boolean") return node;
  if (typeof node === "string") return <LatexRenderer text={node} />;
  if (typeof node === "number") return <LatexRenderer text={String(node)} />;
  if (Array.isArray(node)) {
    return node.map((child, i) => <Fragment key={i}>{mapMdLeaves(child)}</Fragment>);
  }
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const ch = el.props.children;
    if (ch !== undefined && ch !== null) {
      return cloneElement(el, { children: mapMdLeaves(ch) });
    }
    return el;
  }
  return node;
}

function MarkdownLeafWithLatex({ children }: { children?: ReactNode }) {
  return <>{mapMdLeaves(children)}</>;
}

function noteMarkdownComponents(): Components {
  return {
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-border/90 bg-background/90 dark:border-gold/25 dark:bg-muted/40">
        <table className="w-full min-w-[min(100%,36rem)] border-collapse border border-border text-sm dark:border-gold/20">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b border-border dark:border-gold/25">{children}</thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className="even:bg-muted/30 dark:even:bg-muted/20">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="border border-border bg-muted px-3 py-2 text-left text-sm font-semibold text-gold dark:border-gold/25 dark:bg-muted/70">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-3 py-2 dark:border-gold/15">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </td>
    ),
    p: ({ children }) => (
      <p className="mb-3 leading-relaxed">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </p>
    ),
    h1: ({ children }) => (
      <h1 className="mb-3 text-xl font-bold text-primary">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2 text-lg font-bold text-primary">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 text-base font-semibold text-primary">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </h3>
    ),
    ul: ({ children }) => (
      <ul className="mb-3 list-inside list-disc space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 list-inside list-decimal space-y-1">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mb-3 border-l-4 border-gold/40 pl-4 italic text-muted-foreground">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="font-medium text-gold underline underline-offset-2 hover:text-gold/90"
        target="_blank"
        rel="noopener noreferrer"
      >
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </a>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </strong>
    ),
    em: ({ children }) => (
      <em>
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </em>
    ),
    hr: () => <hr className="my-6 border-border dark:border-gold/20" />,
    code: (props) => {
      const { inline, className, children, node: _node, ...rest } = props as ComponentPropsWithoutRef<"code"> & {
        inline?: boolean;
        node?: unknown;
      };
      if (inline) {
        return (
          <code
            className={`rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] dark:bg-muted/60 ${className ?? ""}`}
            {...rest}
          >
            <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
          </code>
        );
      }
      return (
        <code className={`block font-mono text-sm ${className ?? ""}`} {...rest}>
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="mb-3 overflow-x-auto rounded-lg border border-border bg-muted/70 p-3 text-xs dark:border-gold/20 dark:bg-muted/50">
        {children}
      </pre>
    ),
  };
}

function NoteMarkdown({ content }: { content: string }) {
  if (!content?.trim()) return null;
  return (
    <div className="note-markdown max-w-none text-sm leading-relaxed text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={noteMarkdownComponents()}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

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
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);

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
      setExpandedNoteId(null);
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

  useEffect(() => {
    setExpandedNoteId(null);
  }, [activeTab]);

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
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
          <p className="text-muted-foreground">Loading…</p>
        </main>
      </>
    );
  }

  const selectionReady = Boolean(selectedSubject && selectedGrade !== "");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pb-28 pt-6 md:pb-10">
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
                      const expanded = expandedNoteId === note.id;
                      return (
                        <li key={note.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedNoteId(expanded ? null : note.id)
                            }
                            className={`group w-full rounded-xl border bg-card/80 p-4 text-left shadow-sm transition-all hover:border-gold/45 hover:shadow-md dark:bg-card/40 ${
                              expanded ? "border-gold/50 ring-1 ring-gold/20" : "border-border/70 dark:border-gold/10"
                            }`}
                          >
                            <h3 className="font-semibold text-foreground group-hover:text-gold">
                              {note.topic}
                            </h3>
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {previewText(note.content)}
                            </p>
                            {expanded && (
                              <div className="mt-4 space-y-4 border-t border-border/60 pt-4 dark:border-gold/10">
                                {note.file_url && (
                                  <a
                                    href={note.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg border border-gold/35 bg-gold/10 px-3 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/20"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Download className="h-4 w-4 shrink-0" aria-hidden />
                                    Download PDF
                                  </a>
                                )}
                                {note.content?.trim() && <NoteMarkdown content={note.content} />}
                                {!note.content?.trim() && !note.file_url && (
                                  <p className="text-sm text-muted-foreground">No content for this note.</p>
                                )}
                              </div>
                            )}
                          </button>
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
