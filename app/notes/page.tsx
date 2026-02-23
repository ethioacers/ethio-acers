"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { LatexRenderer } from "@/components/LatexRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SubjectRow = { id: number; name: string; grade: number };
type NoteRow = {
  id: number;
  subject_id: number;
  grade: number;
  topic: string;
  content: string | null;
  file_url: string | null;
  is_ai_generated: boolean;
};

const GRADES = [9, 10, 11, 12];

export default function NotesPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Stored Notes state
  const [storedSubject, setStoredSubject] = useState("");
  const [storedGrade, setStoredGrade] = useState<number | "">("");
  const [storedNotes, setStoredNotes] = useState<NoteRow[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteRow | null>(null);

  // AI Notes state
  const [aiSubject, setAiSubject] = useState("");
  const [aiGrade, setAiGrade] = useState<number | "">("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiResult, setAiResult] = useState<{
    content: string;
    isFromDb: boolean;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase.from("subjects").select("id, name, grade");
      setSubjects((data as SubjectRow[]) ?? []);
      setLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!storedSubject || storedGrade === "") {
      setStoredNotes([]);
      setSelectedNote(null);
      return;
    }
    const subjectId = subjects.find(
      (s) => s.name === storedSubject && s.grade === storedGrade
    )?.id;
    if (!subjectId) {
      setStoredNotes([]);
      return;
    }
    async function fetchNotes() {
      const supabase = createClient();
      const { data } = await supabase
        .from("notes")
        .select("id, subject_id, grade, topic, content, file_url, is_ai_generated")
        .eq("subject_id", subjectId)
        .eq("grade", storedGrade)
        .order("created_at", { ascending: false });
      setStoredNotes((data as NoteRow[]) ?? []);
      setSelectedNote(null);
    }
    fetchNotes();
  }, [storedSubject, storedGrade, subjects]);

  async function handleGenerateNotes() {
    const topicTrimmed = aiTopic.trim();
    if (!aiSubject || aiGrade === "" || !topicTrimmed) {
      setAiError("Please select subject, grade, and enter a topic.");
      return;
    }

    const subjectId = subjects.find(
      (s) => s.name === aiSubject && s.grade === aiGrade
    )?.id;
    if (!subjectId) {
      setAiError("Subject not found for this grade.");
      return;
    }

    setAiError(null);
    setAiLoading(true);
    setAiResult(null);

    const supabase = createClient();

    // Check if note already exists
    const { data: existing } = await supabase
      .from("notes")
      .select("id, content")
      .eq("subject_id", subjectId)
      .eq("grade", aiGrade)
      .eq("topic", topicTrimmed)
      .maybeSingle();

    if (existing?.content) {
      setAiResult({ content: existing.content as string, isFromDb: true });
      setAiLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: aiSubject,
          grade: aiGrade,
          topic: topicTrimmed,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAiError(data.message ?? data.error ?? "Failed to generate notes.");
        return;
      }

      setAiResult({ content: data.content, isFromDb: false });
      // Refresh stored notes list if same subject/grade
      if (storedSubject === aiSubject && storedGrade === aiGrade) {
        const { data: refreshed } = await supabase
          .from("notes")
          .select("id, subject_id, grade, topic, content, file_url, is_ai_generated")
          .eq("subject_id", subjectId)
          .eq("grade", aiGrade)
          .order("created_at", { ascending: false });
        setStoredNotes((refreshed as NoteRow[]) ?? []);
      }
    } catch {
      setAiError("Could not connect to the server.");
    } finally {
      setAiLoading(false);
    }
  }

  const subjectNames = [...new Set(subjects.map((s) => s.name))].sort();

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center p-4">
          <p className="text-muted-foreground">Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Notes</h1>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:underline"
            >
              ← Dashboard
            </Link>
          </div>

          {/* Stored Notes section */}
          <section className="rounded-lg border border-muted bg-card p-6 shadow-sm">
            <h2 className="mb-4 font-semibold">Stored Notes</h2>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stored-subject">Subject</Label>
                <select
                  id="stored-subject"
                  className="select-theme h-10 w-full rounded-md border border-input bg-muted/80 px-3 py-2 text-sm text-foreground"
                  value={storedSubject}
                  onChange={(e) => setStoredSubject(e.target.value)}
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
                <Label htmlFor="stored-grade">Grade</Label>
                <select
                  id="stored-grade"
                  className="select-theme h-10 w-full rounded-md border border-input bg-muted/80 px-3 py-2 text-sm text-foreground"
                  value={storedGrade}
                  onChange={(e) =>
                    setStoredGrade(e.target.value ? Number(e.target.value) : "")
                  }
                >
                  <option value="">Select grade</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {storedNotes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {storedNotes.length} note(s) available
                </p>
                <ul className="space-y-1">
                  {storedNotes.map((note) => (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedNote(selectedNote?.id === note.id ? null : note)
                        }
                        className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                          selectedNote?.id === note.id ? "bg-muted" : ""
                        }`}
                      >
                        {note.topic}
                        {note.is_ai_generated && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (AI Generated)
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                {selectedNote && (
                  <div className="mt-4 rounded-md border border-muted bg-muted/30 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {selectedNote.is_ai_generated ? "AI Generated" : "Saved"}
                      </span>
                      {selectedNote.file_url && (
                        <a
                          href={selectedNote.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gold hover:underline"
                        >
                          Download PDF
                        </a>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap text-sm">
                      <LatexRenderer text={selectedNote.content || "No content."} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {storedSubject && storedGrade !== "" && storedNotes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No notes available for this subject and grade.
              </p>
            )}
          </section>

          {/* AI Notes section */}
          <section className="rounded-lg border border-muted bg-card p-6 shadow-sm">
            <h2 className="mb-4 font-semibold">AI Notes</h2>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ai-subject">Subject</Label>
                  <select
                    id="ai-subject"
                    className="select-theme h-10 w-full rounded-md border border-input bg-muted/80 px-3 py-2 text-sm text-foreground"
                    value={aiSubject}
                    onChange={(e) => setAiSubject(e.target.value)}
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
                  <Label htmlFor="ai-grade">Grade</Label>
                  <select
                    id="ai-grade"
                    className="select-theme h-10 w-full rounded-md border border-input bg-muted/80 px-3 py-2 text-sm text-foreground"
                    value={aiGrade}
                    onChange={(e) =>
                      setAiGrade(e.target.value ? Number(e.target.value) : "")
                    }
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-topic">Topic</Label>
                <Input
                  id="ai-topic"
                  type="text"
                  placeholder="e.g. Newton's Laws of Motion"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="bg-muted/80"
                />
              </div>
              <Button
                onClick={handleGenerateNotes}
                disabled={aiLoading}
                className="w-full sm:w-auto"
              >
                {aiLoading ? "Generating…" : "Generate Notes"}
              </Button>

              {aiError && (
                <p className="text-sm text-destructive">{aiError}</p>
              )}

              {aiResult && (
                <div className="rounded-md border border-muted bg-muted/30 p-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {aiResult.isFromDb ? "Saved" : "AI Generated"}
                  </p>
                  <div className="whitespace-pre-wrap text-sm">
                    <LatexRenderer text={aiResult.content} />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
