"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { QuestionCard, type Question } from "@/components/QuestionCard";
import { createClient } from "@/lib/supabase";
import { awardPoints } from "@/lib/points";
import { getRoadmapStatusLabel, type RoadmapStatus } from "@/lib/roadmap";

type TopicRow = {
  id: number;
  topic: string;
  unit: string;
  grade: number;
  subject_id: number;
  subjects?: { name: string }[] | { name: string } | null;
};

export default function RoadmapTopicPage() {
  const router = useRouter();
  const params = useParams();
  const topicId = Number(params.topicId as string);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [topic, setTopic] = useState<TopicRow | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savedStatus, setSavedStatus] = useState<RoadmapStatus | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  useEffect(() => {
    async function init() {
      if (!Number.isFinite(topicId)) {
        setError("Invalid topic.");
        setLoading(false);
        return;
      }
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

        const { data: topicData, error: topicErr } = await supabase
          .from("roadmap_topics")
          .select("id, topic, unit, grade, subject_id, subjects(name)")
          .eq("id", topicId)
          .single();
        if (topicErr || !topicData) {
          setError(topicErr?.message ?? "Topic not found.");
          return;
        }
        const loadedTopic = topicData as TopicRow;
        setTopic(loadedTopic);

        const { data: existingProgress } = await supabase
          .from("roadmap_progress")
          .select("id")
          .eq("user_id", user.id)
          .eq("topic_id", topicId)
          .maybeSingle();
        setAlreadyCompleted(Boolean(existingProgress?.id));

        const { data: questionRows, error: questionErr } = await supabase
          .from("questions")
          .select("*")
          .eq("subject_id", loadedTopic.subject_id)
          .eq("grade", loadedTopic.grade)
          .eq("chapter", loadedTopic.topic)
          .eq("is_weekly_only", false)
          .limit(5);
        if (questionErr) {
          setError(questionErr.message);
          return;
        }
        setQuestions((questionRows as Question[]) ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Failed to load topic lesson.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, topicId]);

  const currentQuestion = useMemo(() => questions[questionIndex], [questions, questionIndex]);

  function onSelect(answer: "A" | "B" | "C" | "D") {
    if (!currentQuestion || showResult) return;
    const isCorrect = currentQuestion.correct_answer === answer;
    setSelectedAnswer(answer);
    setShowResult(true);
    setScore((prev) => prev + (isCorrect ? 1 : 0));
  }

  function next() {
    if (!showResult) return;
    if (questionIndex + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setQuestionIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setShowResult(false);
  }

  async function saveAssessment(status: RoadmapStatus) {
    if (!userId || !topic || savingStatus) return;
    setSavingStatus(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: upsertErr } = await supabase.from("roadmap_progress").upsert(
        {
          user_id: userId,
          topic_id: topic.id,
          status,
          score,
          total: questions.length,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,topic_id" }
      );
      if (upsertErr) {
        setError(upsertErr.message);
        return;
      }

      if (!alreadyCompleted) {
        await awardPoints(userId, 10, "Roadmap topic completion");
      }
      setSavedStatus(status);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to save your progress.");
    } finally {
      setSavingStatus(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center p-4 pb-24 md:pb-4">
          <p className="text-muted-foreground">Loading topic...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-4 pb-24 md:p-6 md:pb-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {topic && (
            <header className="space-y-2 rounded-2xl border border-border/70 bg-card/90 p-5">
              <h1 className="text-2xl font-bold">{topic.topic}</h1>
              <p className="text-sm text-muted-foreground">
                {topic.unit} · {(Array.isArray(topic.subjects) ? topic.subjects[0]?.name : topic.subjects?.name) ?? "Subject"}
              </p>
            </header>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {questions.length === 0 ? (
            <div className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-6">
              <p className="text-sm text-muted-foreground">Questions coming soon for this topic!</p>
              <Button asChild variant="outline">
                <Link href="/roadmap">Back</Link>
              </Button>
            </div>
          ) : finished ? (
            <section className="space-y-4 rounded-2xl border border-gold/35 bg-card/90 p-6">
              <p className="text-3xl font-extrabold text-gold">You got {score}/{questions.length} correct! 🎉</p>
              <p className="text-lg font-semibold text-gold">+10 XP ⚡</p>
              {!savedStatus ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    onClick={() => saveAssessment("fully_understand")}
                    disabled={savingStatus}
                    className="bg-green-600 text-white hover:bg-green-600/90"
                  >
                    ✅ Got it! Fully Understand
                  </Button>
                  <Button
                    onClick={() => saveAssessment("medium")}
                    disabled={savingStatus}
                    className="bg-yellow-500 text-black hover:bg-yellow-500/90"
                  >
                    🟡 Getting there - Medium
                  </Button>
                  <Button
                    onClick={() => saveAssessment("needs_attention")}
                    disabled={savingStatus}
                    className="bg-red-600 text-white hover:bg-red-600/90"
                  >
                    🔴 Need more practice
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Saved status: <span className="font-medium">{getRoadmapStatusLabel(savedStatus)}</span>
                  </p>
                  {savedStatus === "needs_attention" && (
                    <p className="text-sm text-red-400">We'll remind you to revisit this topic!</p>
                  )}
                </div>
              )}

              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/roadmap">Back to Roadmap</Link>
              </Button>
            </section>
          ) : currentQuestion ? (
            <section className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-5">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Question {questionIndex + 1} of 5
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gold transition-all duration-300"
                    style={{ width: `${((questionIndex + 1) / Math.max(questions.length, 1)) * 100}%` }}
                  />
                </div>
              </div>

              <QuestionCard
                question={currentQuestion}
                questionNumber={questionIndex + 1}
                total={questions.length}
                onSelect={onSelect}
                selectedAnswer={selectedAnswer}
                showResult={showResult}
                isCorrect={selectedAnswer ? currentQuestion.correct_answer === selectedAnswer : null}
                subject={(Array.isArray(topic?.subjects) ? topic.subjects[0]?.name : topic?.subjects?.name) ?? "Subject"}
              />
              {showResult && (
                <Button className="w-full sm:w-auto" onClick={next}>
                  {questionIndex + 1 >= questions.length ? "Finish" : "Next question"}
                </Button>
              )}
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
