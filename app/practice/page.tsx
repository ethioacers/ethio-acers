 "use client";

 import { useEffect, useState, useCallback } from "react";
 import { useRouter } from "next/navigation";
 import Link from "next/link";
 import { createClient } from "@/lib/supabase";
 import { logSession } from "@/lib/streak";
 import { QuestionCard, type Question } from "@/components/QuestionCard";
 import { ScoreSummary } from "@/components/ScoreSummary";
 import { ExamScoreBreakdown } from "@/components/ExamScoreBreakdown";
 import { Button } from "@/components/ui/button";
 import { Navbar } from "@/components/Navbar";
 import { StreakPopup } from "@/components/StreakPopup";
 import { getExamQuestionCount, getExamTimeMinutes } from "@/lib/exam-config";

type SubjectRow = { id: number; name: string; grade: number };

const GRADES = [9, 10, 11, 12];
const QUESTIONS_PER_SESSION = 10;
type Mode = "practice" | "exam" | "learn";

export default function PracticePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [subjectName, setSubjectName] = useState<string>("");
  const [grade, setGrade] = useState<number | "">("");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [availableChapters, setAvailableChapters] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("practice");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [emptyQuestionsMessage, setEmptyQuestionsMessage] = useState<string | null>(null);
  const [nonBlockingError, setNonBlockingError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState<{ questionId: number; correct: boolean }[]>([]);
  const [sessionLogged, setSessionLogged] = useState(false);
  const [logging, setLogging] = useState(false);
  const [streakPopupStreak, setStreakPopupStreak] = useState<number | null>(null);
  const [showStreakPopup, setShowStreakPopup] = useState(false);

  // Full Exam Mode state
  const [examAnswers, setExamAnswers] = useState<( "A" | "B" | "C" | "D" | null)[]>([]);
  const [examSecondsLeft, setExamSecondsLeft] = useState<number | null>(null);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examResult, setExamResult] = useState<{
    score: number;
    total: number;
    wrongEntries: { index: number; question: Question; selectedAnswer: "A" | "B" | "C" | "D" | null }[];
  } | null>(null);

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
        setUserId(user.id);
        const { data: subj, error: subjErr } = await supabase.from("subjects").select("id, name, grade");
        if (subjErr) {
          setInitError(subjErr.message);
        }
        setSubjects((subj as SubjectRow[]) ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setInitError(msg || "Failed to load practice page.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const startExamTimer = useCallback((minutes: number) => {
    setExamSecondsLeft(minutes * 60);
  }, []);

  useEffect(() => {
    if (examSecondsLeft === null || examSecondsLeft <= 0 || examSubmitted) return;
    const t = setInterval(() => {
      setExamSecondsLeft((s) => {
        if (s === null || s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [examSecondsLeft, examSubmitted]);

  useEffect(() => {
    if (mode === "exam" && examSecondsLeft === 0 && questions.length > 0 && !examSubmitted) {
      handleSubmitExam();
    }
  }, [mode, examSecondsLeft, examSubmitted, questions.length]);

  useEffect(() => {
    if (!subjectName || grade === "") {
      setAvailableYears([]);
      setSelectedYear(null);
      setAvailableChapters([]);
      setSelectedChapter(null);
      setFiltersError(null);
      return;
    }
    const resolvedId = subjects.find(
      (s) => s.name.trim().toLowerCase() === subjectName.trim().toLowerCase() && Number(s.grade) === Number(grade)
    )?.id;
    if (!resolvedId) {
      setAvailableYears([]);
      setAvailableChapters([]);
      return;
    }
    let cancelled = false;
    async function fetchYears() {
      setYearsLoading(true);
      setFiltersError(null);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("questions")
          .select("year")
          .eq("subject_id", resolvedId)
          .eq("grade", grade)
          .not("year", "is", null);
        if (cancelled) return;
        if (error) {
          setFiltersError(error.message);
          setAvailableYears([]);
          return;
        }
        const years = [...new Set((data ?? []).map((r) => r.year as number))].sort((a, b) => b - a);
        setAvailableYears(years);
        setSelectedYear(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setFiltersError(msg || "Failed to load years.");
        setAvailableYears([]);
      } finally {
        setYearsLoading(false);
      }
    }
    async function fetchChapters() {
      setChaptersLoading(true);
      setFiltersError(null);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("questions")
          .select("chapter")
          .eq("subject_id", resolvedId)
          .eq("grade", grade)
          .not("chapter", "is", null);
        if (cancelled) return;
        if (error) {
          setFiltersError(error.message);
          setAvailableChapters([]);
          return;
        }
        const chaps = [...new Set((data ?? []).map((r) => (r.chapter as string).trim()).filter(Boolean))].sort();
        setAvailableChapters(chaps);
        setSelectedChapter(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setFiltersError(msg || "Failed to load chapters.");
        setAvailableChapters([]);
      } finally {
        setChaptersLoading(false);
      }
    }
    fetchYears();
    fetchChapters();
    return () => {
      cancelled = true;
    };
  }, [subjectName, grade, subjects]);

  async function loadQuestions() {
    if (!subjectName || grade === "") return;
    setQuestionsError(null);
    setEmptyQuestionsMessage(null);
    setNonBlockingError(null);
    const resolvedId = subjects.find(
      (s) => s.name.trim().toLowerCase() === subjectName.trim().toLowerCase() && Number(s.grade) === Number(grade)
    )?.id;
    if (!resolvedId) return;
    setSubjectId(resolvedId);
    setLoadingQuestions(true);
    try {
      const supabase = createClient();
      const isFull = mode === "exam" || mode === "learn";
      const limit = isFull ? getExamQuestionCount(subjectName) : QUESTIONS_PER_SESSION * 3;
      let query = supabase
        .from("questions")
        .select("*")
        .eq("subject_id", resolvedId)
        .eq("grade", grade);
      if (selectedYear != null) {
        query = query.eq("year", selectedYear);
      }
      if (selectedChapter != null && selectedChapter !== "") {
        query = query.eq("chapter", selectedChapter);
      }
      const { data, error } = await query.limit(limit);
      if (error) {
        setQuestionsError(error.message);
        setQuestions([]);
        return;
      }

      const all = (data ?? []) as Question[];
      if (all.length === 0) {
        setQuestions([]);
        setEmptyQuestionsMessage("No questions found for the selected filters.");
        return;
      }

      const shuffled = all.sort(() => Math.random() - 0.5);
      const toTake = isFull
        ? Math.min(shuffled.length, getExamQuestionCount(subjectName))
        : Math.min(QUESTIONS_PER_SESSION, shuffled.length);
      const selected = shuffled.slice(0, toTake) as Question[];
      setQuestions(selected);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setScore(0);
      setAttempts([]);
      setSessionLogged(false);
      setExamSubmitted(false);
      setExamResult(null);
      if (mode === "exam") {
        setExamAnswers(new Array(selected.length).fill(null));
        startExamTimer(getExamTimeMinutes(subjectName));
      } else {
        setExamAnswers([]);
        setExamSecondsLeft(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setQuestionsError(msg || "Failed to load questions.");
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function recordAttempt(questionId: number, selected: "A" | "B" | "C" | "D", correct: boolean) {
    if (!userId) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("attempts").insert({
        user_id: userId,
        question_id: questionId,
        selected_answer: selected,
        is_correct: correct,
      });
      if (error) {
        setNonBlockingError(error.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setNonBlockingError(msg || "Failed to save attempt.");
    }
  }

  function handleSelectAnswer(answer: "A" | "B" | "C" | "D") {
    if (mode === "exam") {
      setExamAnswers((prev) => {
        const next = [...prev];
        next[currentIndex] = answer;
        return next;
      });
      setSelectedAnswer(answer);
      return;
    }
    if (showResult) return;
    const question = questions[currentIndex];
    const isCorrect = question.correct_answer === answer;
    setSelectedAnswer(answer);
    setShowResult(true);
    setAttempts((a) => [...a, { questionId: question.id, correct: isCorrect }]);
    setScore((s) => s + (isCorrect ? 1 : 0));
    recordAttempt(question.id, answer, isCorrect);
  }

  function handleNext() {
    if (mode === "exam") {
      if (currentIndex + 1 >= questions.length) {
        handleSubmitExam();
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer(examAnswers[currentIndex + 1] ?? null);
      }
      return;
    }
    if (currentIndex + 1 >= questions.length) return;
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setShowResult(false);
  }

  function handleSubmitExam() {
    if (examSubmitted || questions.length === 0) return;
    setExamSubmitted(true);
    let correctCount = 0;
    const wrongEntries: { index: number; question: Question; selectedAnswer: "A" | "B" | "C" | "D" | null }[] = [];
    questions.forEach((q, i) => {
      const chosen = examAnswers[i] ?? null;
      if (chosen === q.correct_answer) correctCount++;
      else wrongEntries.push({ index: i, question: q, selectedAnswer: chosen });
    });
    setExamResult({ score: correctCount, total: questions.length, wrongEntries });
  }

  async function handleLogSession() {
    if (!userId || subjectId == null || sessionLogged) return;
    setLogging(true);
    setNonBlockingError(null);
    try {
      await logSession(userId, subjectId, score, questions.length);
      setSessionLogged(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("current_streak")
          .eq("id", userId)
          .single();
        if (!error && data && typeof data.current_streak === "number") {
          setStreakPopupStreak(data.current_streak);
          setShowStreakPopup(true);
        }
      } catch {
        // Ignore streak popup errors; logging already succeeded
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setNonBlockingError(msg || "Failed to log your session.");
    } finally {
      setLogging(false);
    }
  }

  function handleBackToStart() {
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setExamAnswers([]);
    setExamSecondsLeft(null);
    setExamSubmitted(false);
    setExamResult(null);
  }

  const isExam = mode === "exam";
  const showSummary =
    questions.length > 0 &&
    !isExam &&
    currentIndex === questions.length - 1 &&
    showResult;
  const showExamResult = isExam && examSubmitted && examResult !== null;
  const canStart = !!subjectName && grade !== "" && !loadingQuestions;

  let startLabel = "Start session";
  if (mode === "practice") {
    startLabel = loadingQuestions ? "Loading…" : "Start session (10 questions)";
  } else if (mode === "exam") {
    startLabel = loadingQuestions
      ? "Loading…"
      : `Start exam (up to ${getExamQuestionCount(subjectName)} questions, ${getExamTimeMinutes(
          subjectName
        )} min)`;
  } else {
    startLabel = loadingQuestions
      ? "Loading…"
      : `Start learn session (up to ${getExamQuestionCount(subjectName)} questions)`;
  }

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
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
              ← Dashboard
            </Link>
          </div>

          {questions.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
              <h1 className="text-xl font-bold">Practice</h1>

              {initError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {initError}
                </div>
              )}
              {filtersError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {filtersError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("practice")}
                  className={`flex flex-col items-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    mode === "practice"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-foreground hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  <span>Practice</span>
                  <span className={`mt-0.5 text-xs ${mode === "practice" ? "opacity-90" : "text-muted-foreground"}`}>
                    10 questions
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("exam")}
                  className={`flex flex-col items-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    mode === "exam"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-foreground hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  <span>Exam</span>
                  <span className={`mt-0.5 text-xs ${mode === "exam" ? "opacity-90" : "text-muted-foreground"}`}>
                    Timed
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("learn")}
                  className={`flex flex-col items-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    mode === "learn"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-foreground hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  <span>Learn</span>
                  <span className={`mt-0.5 text-xs ${mode === "learn" ? "opacity-90" : "text-muted-foreground"}`}>
                    With explanations
                  </span>
                </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Subject & grade</label>
                <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="select-theme h-11 w-full rounded-lg border-2 border-border bg-muted/80 pl-3 pr-10 py-2 text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                >
                  <option value="">Select subject</option>
                  {Array.from(new Set(subjects.map((s) => s.name)))
                    .sort()
                    .map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                </select>
                <select
                  className="select-theme h-11 w-full rounded-lg border-2 border-border bg-muted/80 pl-3 pr-10 py-2 text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : "")}
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

              {subjectName && grade !== "" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Past exam year</label>
                  <select
                    className="select-theme h-11 w-full rounded-lg border-2 border-border bg-muted/80 pl-3 pr-10 py-2 text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-[12rem]"
                    value={selectedYear ?? ""}
                    onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">All Years</option>
                    {yearsLoading && availableYears.length === 0 && (
                      <option value="" disabled>
                        Loading…
                      </option>
                    )}
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {subjectName && grade !== "" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Chapter</label>
                  <select
                    className="select-theme h-11 w-full rounded-lg border-2 border-border bg-muted/80 pl-3 pr-10 py-2 text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-[12rem]"
                    value={selectedChapter ?? ""}
                    onChange={(e) => setSelectedChapter(e.target.value === "" ? null : e.target.value)}
                  >
                    <option value="">All Chapters</option>
                    {chaptersLoading && availableChapters.length === 0 && (
                      <option value="" disabled>
                        Loading…
                      </option>
                    )}
                    {availableChapters.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button onClick={loadQuestions} disabled={!canStart} className="w-full sm:w-auto">
                {startLabel}
              </Button>

              {questionsError && (
                <p className="text-sm text-destructive">{questionsError}</p>
              )}
              {emptyQuestionsMessage && (
                <p className="text-sm text-muted-foreground">{emptyQuestionsMessage}</p>
              )}
            </div>
          ) : showExamResult && examResult ? (
            <ExamScoreBreakdown
              score={examResult.score}
              total={examResult.total}
              wrongEntries={examResult.wrongEntries}
              onBack={handleBackToStart}
            />
          ) : showSummary ? (
            <div className="space-y-4">
              <ScoreSummary
                score={score}
                total={questions.length}
                onLogSession={handleLogSession}
                logging={logging}
              />
              {sessionLogged && (
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {nonBlockingError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {nonBlockingError}
                </div>
              )}
              {mode !== "practice" && (
                <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-medium">
                    Question {currentIndex + 1} / {questions.length}
                    {selectedYear != null && (
                      <span className="ml-2 text-muted-foreground">· {selectedYear}</span>
                    )}
                    {selectedChapter != null && selectedChapter !== "" && (
                      <span className="ml-2 text-muted-foreground">· {selectedChapter}</span>
                    )}
                  </div>
                  <div className="h-2 flex-1 rounded-full bg-muted sm:mx-4">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                  <div className="text-sm font-mono tabular-nums">
                    {isExam && examSecondsLeft !== null && (
                      <>
                        {Math.floor(examSecondsLeft / 60)}:
                        {String(examSecondsLeft % 60).padStart(2, "0")}
                      </>
                    )}
                  </div>
                </div>
              )}
              <QuestionCard
                key={questions[currentIndex].id}
                question={questions[currentIndex]}
                questionNumber={currentIndex + 1}
                total={questions.length}
                onSelect={handleSelectAnswer}
                selectedAnswer={isExam ? (examAnswers[currentIndex] ?? null) : selectedAnswer}
                showResult={showResult}
                isCorrect={
                  !isExam && selectedAnswer
                    ? questions[currentIndex].correct_answer === selectedAnswer
                    : null
                }
                subject={subjectName}
                examMode={isExam}
              />
              {isExam ? (
                <Button onClick={handleNext} className="w-full">
                  {currentIndex + 1 >= questions.length ? "Submit exam" : "Next"}
                </Button>
              ) : (
                showResult &&
                currentIndex + 1 < questions.length && (
                  <Button onClick={handleNext} className="w-full">
                    Next
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      </main>
      {showStreakPopup && streakPopupStreak !== null && (
        <StreakPopup
          streak={streakPopupStreak}
          onClose={() => setShowStreakPopup(false)}
        />
      )}
    </>
  );
}
