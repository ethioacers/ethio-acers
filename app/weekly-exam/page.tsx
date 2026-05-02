"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { LatexRenderer } from "@/components/LatexRenderer";

type WeeklyExamRow = {
  id: number;
  title: string;
  description: string | null;
  subject_id: number | null;
  grade: number | null;
  duration_minutes: number | null;
  week_start: string;
  week_end: string;
  is_active: boolean;
  subjects?: { name: string } | null;
};

type WeeklyAttemptRow = {
  id?: string | number;
  weekly_exam_id: number;
  user_id: string;
  score?: number | null;
  total?: number | null;
  time_taken_seconds?: number | null;
  answers_json?: string | null;
  created_at?: string | null;
};

type QuestionRow = {
  id: number;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string | null;
};

type ExamQuestion = {
  order: number;
  question: QuestionRow;
};

type Phase = "landing" | "exam" | "results";

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getOptionText(q: QuestionRow, key: "A" | "B" | "C" | "D"): string {
  const map = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
  return map[key] ?? "";
}

export default function WeeklyExamPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exams, setExams] = useState<WeeklyExamRow[]>([]);
  const [exam, setExam] = useState<WeeklyExamRow | null>(null);
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>({});
  const [latestAttempts, setLatestAttempts] = useState<Record<number, WeeklyAttemptRow>>({});
  const [attempt, setAttempt] = useState<WeeklyAttemptRow | null>(null);
  const [attemptsToday, setAttemptsToday] = useState(0);
  const [attemptLimit] = useState(3);

  const [phase, setPhase] = useState<Phase>("landing");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<( "A" | "B" | "C" | "D" | null)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [examStartedAt, setExamStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    percentage: number;
    passed: boolean;
    timeTakenSeconds: number;
  } | null>(null);

  useEffect(() => {
    async function loadLanding() {
      setError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr) {
          setError(userErr.message);
          return;
        }
        if (!user) {
          router.replace("/login");
          return;
        }
        setUserId(user.id);

        const today = new Date().toISOString().split("T")[0];
        const { data: activeExams, error: examErr } = await supabase
          .from("weekly_exams")
          .select("id, title, description, subject_id, grade, duration_minutes, week_start, week_end, is_active, subjects(name)")
          .eq("is_active", true)
          .lte("week_start", today)
          .gte("week_end", today);

        if (examErr) {
          setError(examErr.message);
          return;
        }
        const list = (activeExams as unknown as WeeklyExamRow[]) ?? [];
        setExams(list);
        setExam(null);
        setAttempt(null);
        setResult(null);
        setQuestions([]);
        setAnswers([]);
        setCurrentIndex(0);
        setSecondsLeft(null);
        setExamStartedAt(null);
        setAttemptsToday(0);

        if (!list || list.length === 0) {
          setQuestionCounts({});
          setLatestAttempts({});
          return;
        }

        // Fetch latest attempts for all active exams (for badge display)
        const examIds = list.map((e) => e.id);
        const { data: atRows, error: atErr } = await supabase
          .from("weekly_exam_attempts")
          .select("*")
          .eq("user_id", user.id)
          .in("weekly_exam_id", examIds)
          .order("created_at", { ascending: false });
        if (!atErr && atRows) {
          const map: Record<number, WeeklyAttemptRow> = {};
          for (const row of atRows as any[]) {
            const id = Number(row.weekly_exam_id);
            if (!map[id]) {
              map[id] = row as WeeklyAttemptRow;
            }
          }
          setLatestAttempts(map);
        } else {
          setLatestAttempts({});
        }

        // Fetch question counts per exam (small N, simple fan-out)
        const counts: Record<number, number> = {};
        await Promise.all(
          examIds.map(async (id) => {
            const { count } = await supabase
              .from("weekly_exam_questions")
              .select("*", { count: "exact", head: true })
              .eq("weekly_exam_id", id);
            counts[id] = count ?? 0;
          })
        );
        setQuestionCounts(counts);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Failed to load weekly exam.");
      } finally {
        setLoading(false);
      }
    }
    loadLanding();
  }, [router]);

  async function selectExamAndStart(chosen: WeeklyExamRow) {
    try {
      setError(null);
      setExam(chosen);
      setAttempt(null);
      setResult(null);
      setQuestions([]);
      setAnswers([]);
      setCurrentIndex(0);
      setSecondsLeft(null);
      setExamStartedAt(null);

      if (!userId) return;
      const supabase = createClient();
      const { data: at } = await supabase
        .from("weekly_exam_attempts")
        .select("*")
        .eq("weekly_exam_id", chosen.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (at) {
        setAttempt(at as WeeklyAttemptRow);
        const score = Number((at as any).score ?? 0);
        const total = Number((at as any).total ?? 0);
        const timeTakenSeconds = Number((at as any).time_taken_seconds ?? 0);
        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
        setResult({
          score,
          total,
          percentage,
          passed: percentage >= 50,
          timeTakenSeconds,
        });
      }

      const todayStartIso = new Date(new Date().toISOString().split("T")[0]).toISOString();
      const { count: todayCount } = await supabase
        .from("weekly_exam_attempts")
        .select("*", { count: "exact", head: true })
        .eq("weekly_exam_id", chosen.id)
        .eq("user_id", userId)
        .gte("created_at", todayStartIso);
      setAttemptsToday(todayCount ?? 0);

      const attemptsLeft = Math.max(0, attemptLimit - (todayCount ?? 0));
      if (attemptsLeft <= 0) return;

      const q = await loadExamQuestions();
      if (q.length === 0) {
        setError("No weekly exam questions found.");
        return;
      }
      setQuestions(q);
      setAnswers(new Array(q.length).fill(null));
      setCurrentIndex(0);
      setExamStartedAt(Date.now());
      setSecondsLeft((chosen.duration_minutes ?? 45) * 60);
      setPhase("exam");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to start weekly exam.");
    }
  }

  useEffect(() => {
    if (phase !== "exam" || secondsLeft == null) return;
    if (secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((prev) => (prev == null ? prev : Math.max(0, prev - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, [phase, secondsLeft]);

  useEffect(() => {
    if (phase === "exam" && secondsLeft === 0) {
      void submitExam();
    }
  }, [phase, secondsLeft]);

  async function loadExamQuestions(): Promise<ExamQuestion[]> {
    if (!exam) return [];
    const supabase = createClient();
    const { data, error: qErr } = await supabase
      .from("weekly_exam_questions")
      .select("question_id, questions(id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)")
      .eq("weekly_exam_id", exam.id)
      .order("question_id", { ascending: true });

    if (qErr) throw new Error(qErr.message);

    const mapped: ExamQuestion[] = ((data ?? []) as any[])
      .map((row, idx) => {
        const qRaw = Array.isArray(row.questions) ? row.questions[0] : row.questions;
        if (!qRaw) return null;
        return {
          order: idx + 1,
          question: qRaw as QuestionRow,
        };
      })
      .filter(Boolean) as ExamQuestion[];

    return mapped;
  }

  async function handleStartExam() {
    if (!exam) return;
    await selectExamAndStart(exam);
  }

  function handleChooseAnswer(answer: "A" | "B" | "C" | "D") {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = answer;
      return next;
    });
  }

  async function submitExam() {
    if (!exam || !userId || questions.length === 0) return;
    const total = questions.length;
    let score = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] != null && answers[idx] === q.question.correct_answer) {
        score++;
      }
    });
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const elapsedSeconds =
      examStartedAt != null
        ? Math.max(0, Math.round((Date.now() - examStartedAt) / 1000))
        : 0;
    const allowedSeconds = (exam.duration_minutes ?? 45) * 60;
    const timeTakenSeconds = Math.min(allowedSeconds, elapsedSeconds || allowedSeconds);

    setResult({
      score,
      total,
      percentage,
      passed: percentage >= 50,
      timeTakenSeconds,
    });
    setPhase("results");

    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = {
        weekly_exam_id: exam.id,
        user_id: userId,
        score,
        total,
        time_taken_seconds: timeTakenSeconds,
        answers_json: JSON.stringify(answers),
      };
      const { data, error: saveErr } = await supabase
        .from("weekly_exam_attempts")
        .insert(payload)
        .select("*")
        .single();
      if (!saveErr && data) {
        setAttempt(data as WeeklyAttemptRow);
        setAttemptsToday((prev) => Math.min(attemptLimit, prev + 1));
      }
    } catch {
      // non-fatal for UI; results already shown
    }
  }

  async function handleViewResults() {
    if (!exam) return;
    try {
      const q = await loadExamQuestions();
      setQuestions(q);
      if (attempt?.answers_json) {
        try {
          const parsed = JSON.parse(attempt.answers_json) as ( "A" | "B" | "C" | "D" | null)[];
          setAnswers(parsed);
        } catch {
          setAnswers(new Array(q.length).fill(null));
        }
      } else {
        setAnswers(new Array(q.length).fill(null));
      }
      setPhase("results");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to load exam results.");
    }
  }

  const currentQuestion = questions[currentIndex]?.question;
  const progressPct =
    questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const attemptsLeft = Math.max(0, attemptLimit - attemptsToday);

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
      <main className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gold">Weekly Exam</h1>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
              ← Dashboard
            </Link>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {phase === "landing" && (
            <>
              {exams.length === 0 ? (
                <div className="rounded-2xl border border-border/70 bg-card/90 p-6 shadow-lg">
                  <p className="text-muted-foreground">No weekly exams this week. Check back soon!</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-muted-foreground">
                      {exams.length} exam{exams.length === 1 ? "" : "s"} available this week
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Each exam can be attempted up to {attemptLimit} times per day.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {exams.map((ex) => {
                      const cnt = questionCounts[ex.id] ?? 0;
                      const at = latestAttempts[ex.id];
                      const score = Number((at as any)?.score ?? 0);
                      const total = Number((at as any)?.total ?? 0);
                      const completed = Boolean(at && total >= 0);
                      return (
                        <div
                          key={ex.id}
                          className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-md transition-all hover:border-gold/35 hover:shadow-lg"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="truncate text-lg font-bold text-gold">{ex.title}</h2>
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {ex.description ?? "Weekly challenge exam"}
                              </p>
                            </div>
                            {completed && (
                              <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                                {score}/{total}
                              </span>
                            )}
                          </div>

                          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                            <p>
                              <span className="text-muted-foreground">Subject:</span>{" "}
                              <span className="font-medium">{ex.subjects?.name ?? "General"}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Grade:</span>{" "}
                              <span className="font-medium">{ex.grade ?? "—"}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Questions:</span>{" "}
                              <span className="font-medium">{cnt}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Time limit:</span>{" "}
                              <span className="font-medium">{ex.duration_minutes ?? 45} min</span>
                            </p>
                            <p className="sm:col-span-2">
                              <span className="text-muted-foreground">Deadline:</span>{" "}
                              <span className="font-medium">
                                {new Date(ex.week_end).toLocaleDateString(undefined, { dateStyle: "medium" })}
                              </span>
                            </p>
                          </div>

                          <div className="mt-5">
                            {!completed ? (
                              <Button
                                type="button"
                                onClick={() => void selectExamAndStart(ex)}
                                className="w-full bg-gold text-black hover:bg-gold/90"
                              >
                                Start Exam
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => void selectExamAndStart(ex)}
                                className="w-full"
                              >
                                Retake Exam
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {phase === "exam" && currentQuestion && (
            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-6 shadow-lg">
              <div className="flex items-center justify-between text-sm">
                <span>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="font-mono">{formatTime(secondsLeft ?? 0)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progressPct}%` }} />
              </div>

              <div className="space-y-4">
                <p className="text-base font-medium">
                  <LatexRenderer text={currentQuestion.question_text} />
                </p>
                {(["A", "B", "C", "D"] as const).map((key) => {
                  const option = getOptionText(currentQuestion, key);
                  if (!option) return null;
                  const selected = answers[currentIndex] === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleChooseAnswer(key)}
                      className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                        selected
                          ? "border-gold bg-gold/10 text-foreground"
                          : "border-input bg-background text-foreground hover:border-gold/60"
                      }`}
                    >
                      <span className="font-semibold mr-2">{key}.</span>
                      <LatexRenderer text={option} />
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                >
                  Previous
                </Button>
                {currentIndex + 1 < questions.length ? (
                  <Button type="button" onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}>
                    Next
                  </Button>
                ) : (
                  <Button type="button" className="bg-gold text-black hover:bg-gold/90" onClick={submitExam}>
                    Submit Exam
                  </Button>
                )}
              </div>
            </div>
          )}

          {phase === "results" && result && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-yellow-500/60 bg-card/95 p-6 text-center shadow-lg shadow-yellow-500/10">
                <p className="text-sm text-muted-foreground">Weekly Exam Result</p>
                <p className="mt-2 text-4xl font-bold text-gold">
                  {result.score} / {result.total}
                </p>
                <p className="mt-1 text-sm">
                  {result.percentage}% ·{" "}
                  <span className={result.passed ? "text-green-600" : "text-red-600"}>
                    {result.passed ? "Pass" : "Fail"}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Time taken: {formatTime(result.timeTakenSeconds)}
                </p>
              </div>

              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const chosen = answers[idx];
                  const chosenText = chosen ? getOptionText(q.question, chosen) : "No answer";
                  const correctText = getOptionText(q.question, q.question.correct_answer);
                  const correct = chosen != null && chosen === q.question.correct_answer;
                  return (
                    <div key={q.question.id} className="space-y-2 rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm">
                      <p className="text-xs text-muted-foreground">Question {idx + 1}</p>
                      <p className="font-medium">
                        <LatexRenderer text={q.question.question_text} />
                      </p>
                      <p className={`text-sm ${correct ? "text-green-600" : "text-red-600"}`}>
                        Your answer:{" "}
                        {chosen ? (
                          <>
                            <span className="font-medium">{chosen}.</span>{" "}
                            <LatexRenderer text={chosenText} />
                          </>
                        ) : (
                          "No answer"
                        )}
                      </p>
                      <p className="text-sm text-green-600">
                        Correct answer:{" "}
                        <span className="font-medium">{q.question.correct_answer}.</span>{" "}
                        <LatexRenderer text={correctText} />
                      </p>
                      {q.question.explanation && (
                        <p className="text-sm text-muted-foreground">
                          <LatexRenderer text={q.question.explanation} />
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button asChild className="bg-gold text-black hover:bg-gold/90">
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

