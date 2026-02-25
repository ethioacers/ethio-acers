"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LatexRenderer } from "@/components/LatexRenderer";

type SubjectRow = { id: number; name: string; grade: number };

type Flashcard = {
  id: number;
  subject_id: number;
  grade: number;
  chapter: string | null;
  front: string;
  back: string;
  is_ai_generated: boolean;
};

const GRADES = [9, 10, 11, 12];

type Phase = "select" | "session" | "results";

export default function FlashcardsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | "">("");
  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | "">("");
  const [topic, setTopic] = useState("");
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("select");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [knownIds, setKnownIds] = useState<number[]>([]);
  const [reviewIds, setReviewIds] = useState<number[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [loadingCards, setLoadingCards] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function init() {
      setLoadError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) {
          setLoadError(error.message);
          return;
        }
        if (!user) {
          router.replace("/login");
          return;
        }
        const { data, error: subjErr } = await supabase
          .from("subjects")
          .select("id, name, grade");
        if (subjErr) {
          setLoadError(subjErr.message);
        }
        setSubjects((data as SubjectRow[]) ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setLoadError(msg || "Failed to load flashcards page.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!selectedSubject || selectedGrade === "") {
      setChapters([]);
      setSelectedChapter("");
      setChapterError(null);
      return;
    }
    const subjectId = subjects.find(
      (s) => s.name === selectedSubject && s.grade === selectedGrade
    )?.id;
    if (!subjectId) {
      setChapters([]);
      setSelectedChapter("");
      setChapterError("Subject not found for this grade.");
      return;
    }
    let cancelled = false;
    async function fetchChapters() {
      setChapterLoading(true);
      setChapterError(null);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("flashcards")
          .select("chapter")
          .eq("subject_id", subjectId)
          .eq("grade", selectedGrade)
          .not("chapter", "is", null);
        if (cancelled) return;
        if (error) {
          setChapterError(error.message);
          setChapters([]);
          return;
        }
        const list = [...new Set((data ?? []).map((r) => (r.chapter as string).trim()).filter(Boolean))].sort();
        setChapters(list);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setChapterError(msg || "Failed to load chapters.");
        setChapters([]);
      } finally {
        setChapterLoading(false);
      }
    }
    fetchChapters();
    return () => {
      cancelled = true;
    };
  }, [selectedSubject, selectedGrade, subjects]);

  const subjectNames = useMemo(
    () => [...new Set(subjects.map((s) => s.name))].sort(),
    [subjects]
  );

  const total = cards.length;
  const remaining = total - currentIndex;

  function resetSession(newCards: Flashcard[]) {
    setCards(newCards);
    setCurrentIndex(0);
    setShowBack(false);
    setKnownIds([]);
    setReviewIds([]);
    setPhase(newCards.length > 0 ? "session" : "select");
  }

  async function loadFlashcardsFromDb() {
    if (!selectedSubject || selectedGrade === "") return;
    setSessionError(null);
    setLoadingCards(true);
    try {
      const subjectId = subjects.find(
        (s) => s.name === selectedSubject && s.grade === selectedGrade
      )?.id;
      if (!subjectId) {
        setSessionError("Subject not found for this grade.");
        return;
      }
      const supabase = createClient();
      let query = supabase
        .from("flashcards")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("grade", selectedGrade);
      if (selectedChapter && selectedChapter !== "ALL") {
        query = query.eq("chapter", selectedChapter);
      }
      const { data, error } = await query.order("created_at", {
        ascending: false,
      });
      if (error) {
        setSessionError(error.message);
        return;
      }
      const list = (data as Flashcard[]) ?? [];
      if (list.length === 0) {
        setSessionError("No flashcards found for this selection.");
        return;
      }
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      resetSession(shuffled);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSessionError(msg || "Failed to load flashcards.");
    } finally {
      setLoadingCards(false);
    }
  }

  async function handleGenerateAiFlashcards() {
    const trimmedTopic = topic.trim();
    if (!selectedSubject || selectedGrade === "" || !trimmedTopic) {
      setSessionError(
        "Please select subject, grade, and enter a topic before generating."
      );
      return;
    }
    setSessionError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedSubject,
          grade: selectedGrade,
          topic: trimmedTopic,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSessionError(
          data.message ?? data.error ?? "Failed to generate flashcards."
        );
        return;
      }
      const list = (data.flashcards as Flashcard[]) ?? [];
      if (list.length === 0) {
        setSessionError("No flashcards were generated for this topic.");
        return;
      }
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      resetSession(shuffled);
    } catch {
      setSessionError("Could not connect to the server.");
    } finally {
      setGenerating(false);
    }
  }

  function handleMark(result: "known" | "review") {
    if (!cards[currentIndex]) return;
    const id = cards[currentIndex].id;
    if (result === "known") {
      setKnownIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      setReviewIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= cards.length) {
      setPhase("results");
      setShowBack(false);
    } else {
      setCurrentIndex(nextIndex);
      setShowBack(false);
    }
  }

  function handleReviewWeak() {
    const weakCards = cards.filter((c) => reviewIds.includes(c.id));
    if (weakCards.length === 0) {
      setSessionError("No cards to review.");
      return;
    }
    const shuffled = [...weakCards].sort(() => Math.random() - 0.5);
    resetSession(shuffled);
  }

  function handleStartOver() {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    resetSession(shuffled);
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-background p-4">
          <p className="text-muted-foreground">Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background p-4 sm:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gold">Flashcards</h1>
          </div>

          {loadError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {loadError}
            </div>
          )}

          {phase === "select" && (
            <section className="space-y-4 rounded-lg border border-muted bg-card/80 p-6 shadow-sm">
              <h2 className="font-semibold">Select subject and topic</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <select
                    id="subject"
                    className="select-theme h-10 w-full rounded-md border border-input bg-muted/80 px-3 py-2 text-sm text-foreground"
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
                <div className="space-y-1.5">
                  <Label htmlFor="grade">Grade</Label>
                  <select
                    id="grade"
                    className="select-theme h-10 w-full rounded-md border border-input bg-muted/80 px-3 py-2 text-sm text-foreground"
                    value={selectedGrade}
                    onChange={(e) =>
                      setSelectedGrade(
                        e.target.value ? Number(e.target.value) : ""
                      )
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

              <div className="space-y-1.5">
                <Label htmlFor="chapter">Chapter</Label>
                <select
                  id="chapter"
                  className="select-theme h-10 w-full rounded-md border border-input bg-muted/80 px-3 py-2 text-sm text-foreground"
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                >
                  <option value="">All Chapters</option>
                  {chapterLoading && chapters.length === 0 && (
                    <option value="" disabled>
                      Loading…
                    </option>
                  )}
                  {chapters.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
                {chapterError && (
                  <p className="text-xs text-destructive">{chapterError}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="topic">Topic for AI flashcards</Label>
                <Input
                  id="topic"
                  type="text"
                  placeholder="e.g. Newton's laws of motion"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="bg-muted/80"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  onClick={loadFlashcardsFromDb}
                  disabled={
                    !selectedSubject || selectedGrade === "" || loadingCards
                  }
                  className="w-full sm:w-auto"
                >
                  {loadingCards ? "Loading…" : "Browse Flashcards"}
                </Button>
                <Button
                  type="button"
                  onClick={handleGenerateAiFlashcards}
                  disabled={
                    !selectedSubject ||
                    selectedGrade === "" ||
                    !topic.trim() ||
                    generating
                  }
                  className="w-full sm:w-auto bg-gold text-black hover:bg-gold/90"
                >
                  {generating ? "Generating…" : "Generate AI Flashcards"}
                </Button>
              </div>

              {sessionError && (
                <p className="text-sm text-destructive">{sessionError}</p>
              )}
            </section>
          )}

          {phase === "session" && cards[currentIndex] && (
            <section className="flex flex-1 flex-col items-center gap-4">
              <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                <span>
                  Card {currentIndex + 1} / {total}
                </span>
                <div className="h-1 flex-1 mx-3 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gold transition-all"
                    style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                  />
                </div>
                <span>{remaining} left</span>
              </div>

              {sessionError && (
                <p className="text-sm text-destructive">{sessionError}</p>
              )}

              <div className="relative mt-4 flex w-full flex-1 items-center justify-center">
                <div
                  className={`relative h-64 w-full max-w-sm cursor-pointer rounded-xl border border-yellow-500/60 bg-card/90 shadow-xl shadow-yellow-500/20 transition-transform duration-500 [transform-style:preserve-3d] ${
                    showBack ? "rotate-y-180" : ""
                  }`}
                  onClick={() => setShowBack((v) => !v)}
                >
                  <div className="absolute inset-0 flex flex-col justify-center px-6 [backface-visibility:hidden]">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Front
                    </p>
                    <div className="text-sm sm:text-base font-medium">
                      <LatexRenderer text={cards[currentIndex].front} />
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col justify-center px-6 [backface-visibility:hidden] rotate-y-180">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Back
                    </p>
                    <div className="text-sm sm:text-base">
                      <LatexRenderer text={cards[currentIndex].back} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full max-w-sm items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-red-500/60 text-red-500 hover:bg-red-500/10"
                  onClick={() => handleMark("review")}
                >
                  ❌ Review again
                </Button>
                <Button
                  type="button"
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={() => handleMark("known")}
                >
                  ✅ Got it
                </Button>
              </div>
            </section>
          )}

          {phase === "results" && (
            <section className="space-y-4 rounded-lg border border-muted bg-card/80 p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Session complete</h2>
              <p className="text-sm text-muted-foreground">
                Known:{" "}
                <span className="font-semibold text-emerald-500">
                  {knownIds.length}
                </span>{" "}
                · To review:{" "}
                <span className="font-semibold text-red-500">
                  {reviewIds.length}
                </span>
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  onClick={handleReviewWeak}
                  className="w-full sm:w-auto"
                  disabled={reviewIds.length === 0}
                >
                  Review weak cards
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleStartOver}
                >
                  Start over
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setPhase("select");
                    setCards([]);
                    setKnownIds([]);
                    setReviewIds([]);
                    setCurrentIndex(0);
                    setShowBack(false);
                  }}
                >
                  Back to selection
                </Button>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

