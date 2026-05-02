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
  const [exam, setExam] = useState<WeeklyExamRow | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
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
        const { data: activeExam, error: examErr } = await supabase
          .from("weekly_exams")
          .select("id, title, description, subject_id, grade, duration_minutes, week_start, week_end, is_active, subjects(name)")
          .eq("is_active", true)
          .lte("week_start", today)
          .gte("week_end", today)
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (examErr) {
          setError(examErr.message);
          return;
        }
        if (!activeExam) {
          setExam(null);
          return;
        }
        setExam(activeExam as unknown as WeeklyExamRow);

        const { count, error: countErr } = await supabase
          .from("weekly_exam_questions")
          .select("*", { count: "exact", head: true })
          .eq("weekly_exam_id", (activeExam as any).id);
        if (!countErr) {
          setQuestionCount(count ?? 0);
        }

        const { data: at, error: atErr } = await supabase
          .from("weekly_exam_attempts")
          .select("*")
          .eq("weekly_exam_id", (activeExam as any).id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!atErr && at) {
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
        const { count: todayCount, error: todayCountErr } = await supabase
          .from("weekly_exam_attempts")
          .select("*", { count: "exact", head: true })
          .eq("weekly_exam_id", (activeExam as any).id)
          .eq("user_id", user.id)
          .gte("created_at", todayStartIso);
        if (!todayCountErr) {
          setAttemptsToday(todayCount ?? 0);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Failed to load weekly exam.");
      } finally {
        setLoading(false);
      }
    }
    loadLanding();
  }, [router]);

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
      .select("question_order, question_id, questions(id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)")
      .eq("weekly_exam_id", exam.id)
      .order("question_order", { ascending: true });

    if (qErr) throw new Error(qErr.message);

    const mapped: ExamQuestion[] = ((data ?? []) as any[])
      .map((row) => {
        const qRaw = Array.isArray(row.questions) ? row.questions[0] : row.questions;
        if (!qRaw) return null;
        return {
          order: Number(row.question_order ?? 0),
          question: qRaw as QuestionRow,
        };
      })
      .filter(Boolean) as ExamQuestion[];

    return mapped;
  }

  async function handleStartExam() {
    if (!exam || attemptsToday >= attemptLimit) return;
    try {
      setError(null);
      const q = await loadExamQuestions();
      if (q.length === 0) {
        setError("No weekly exam questions found.");
        return;
      }
      setQuestions(q);
      setAnswers(new Array(q.length).fill(null));
      setCurrentIndex(0);
      setExamStartedAt(Date.now());
      setSecondsLeft((exam.duration_minutes ?? 45) * 60);
      setPhase("exam");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to start weekly exam.");
    }
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
              {!exam ? (
                <div className="rounded-2xl border border-border/70 bg-card/90 p-6 shadow-lg">
                  <p className="text-muted-foreground">No weekly exam this week. Check back soon! 📅</p>
                </div>
              ) : (
                <div className="space-y-5 rounded-2xl border border-yellow-500/70 bg-card/95 p-6 shadow-lg shadow-yellow-500/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-yellow-500/80 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-gold">
                      Today's Weekly Exam
                    </span>
                    <span className="rounded-full border border-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {attemptsToday}/{attemptLimit} attempts used today
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-gold">{exam.title}</h2>
                    <p className="text-sm text-muted-foreground">{exam.description ?? "Weekly challenge exam"}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Subject:</span>{" "}
                      <span className="font-medium">{exam.subjects?.name ?? "General"}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Grade:</span>{" "}
                      <span className="font-medium">{exam.grade ?? "—"}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Questions:</span>{" "}
                      <span className="font-medium">{questionCount}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Duration:</span>{" "}
                      <span className="font-medium">{exam.duration_minutes ?? 45} min</span>
                    </p>
                    <p className="sm:col-span-2">
                      <span className="text-muted-foreground">Deadline:</span>{" "}
                      <span className="font-medium">
                        {new Date(exam.week_end).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-4 text-sm">
                    <p className="font-semibold text-gold">
                      One exam per day, all week
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      You can retake today's weekly exam up to {attemptLimit} times. Attempts left today:{" "}
                      <span className="font-semibold text-foreground">{attemptsLeft}</span>.
                    </p>
                  </div>

                  {attempt && result ? (
                    <div className="space-y-3 rounded-xl border border-border/70 bg-background/20 p-4">
                      <p className="text-sm">
                        Latest score:{" "}
                        <span className="font-semibold text-gold">
                          {result.score}/{result.total}
                        </span>{" "}
                        · {result.percentage}% · {formatTime(result.timeTakenSeconds)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={handleViewResults} variant="outline">
                          View Last Results
                        </Button>
                        <Button
                          onClick={handleStartExam}
                          disabled={attemptsLeft === 0}
                          className="bg-gold text-black hover:bg-gold/90"
                        >
                          {attemptsLeft === 0 ? "Today's Attempts Finished" : "Retake Weekly Exam"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={handleStartExam}
                      disabled={attemptsLeft === 0}
                      className="w-full sm:w-auto bg-gold text-black hover:bg-gold/90"
                    >
                      {attemptsLeft === 0 ? "Today's Attempts Finished" : "Start Weekly Exam"}
                    </Button>
                  )}
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

