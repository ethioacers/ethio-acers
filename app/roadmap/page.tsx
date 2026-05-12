"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { getTodayRoadmapDay, type RoadmapStatus } from "@/lib/roadmap";

type Subject = { id: number; name: string; grade: number };
type RoadmapTopic = {
  id: number;
  subject_id: number;
  grade: number;
  unit: string;
  topic: string;
  day_number: number;
  topic_order: number;
  estimated_minutes: number;
  subjects?: { name: string }[] | { name: string } | null;
};

type TopicProgress = {
  topic_id: number;
  status: RoadmapStatus;
  score: number | null;
  total: number | null;
};

const GRADES = [9, 10, 11, 12];

export default function RoadmapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");
  const [selectedGrade, setSelectedGrade] = useState<number | "">("");
  const [topics, setTopics] = useState<RoadmapTopic[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, TopicProgress>>({});
  const [userId, setUserId] = useState<string | null>(null);

  // Daily checkbox state (local only — resets on refresh)
  const [checkedTopics, setCheckedTopics] = useState<Set<number>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const streakUpdatedRef = useRef(false);

  useEffect(() => {
    async function init() {
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

        const [{ data: profileData }, { data: subjectData }] = await Promise.all([
          supabase.from("profiles").select("grade").eq("id", user.id).single(),
          supabase.from("subjects").select("id, name, grade"),
        ]);

        const gradeFromProfile = Number(profileData?.grade ?? 0);
        if (gradeFromProfile >= 9 && gradeFromProfile <= 12) {
          setSelectedGrade(gradeFromProfile);
        }
        setSubjects((subjectData as Subject[]) ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Failed to load roadmap.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  useEffect(() => {
    async function fetchRoadmap() {
      if (loading) return;
      setError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
          .from("roadmap_topics")
          .select("id, subject_id, grade, unit, topic, day_number, topic_order, estimated_minutes, subjects(name)")
          .order("day_number", { ascending: true })
          .order("topic_order", { ascending: true })
          .order("id", { ascending: true });

        if (selectedSubjectId !== "") query = query.eq("subject_id", selectedSubjectId);
        if (selectedGrade !== "") query = query.eq("grade", selectedGrade);

        const { data: topicData, error: topicErr } = await query;
        if (topicErr) {
          setError(topicErr.message);
          setTopics([]);
          setProgressMap({});
          return;
        }

        const loadedTopics = (topicData as RoadmapTopic[]) ?? [];
        setTopics(loadedTopics);
        if (loadedTopics.length === 0) {
          setProgressMap({});
          return;
        }

        const topicIds = loadedTopics.map((t) => t.id);
        const { data: progressRows, error: progressErr } = await supabase
          .from("roadmap_progress")
          .select("topic_id, status, score, total")
          .eq("user_id", user.id)
          .in("topic_id", topicIds);

        if (progressErr) {
          setError(progressErr.message);
          setProgressMap({});
          return;
        }

        const map: Record<number, TopicProgress> = {};
        ((progressRows as TopicProgress[]) ?? []).forEach((row) => {
          map[row.topic_id] = row;
        });
        setProgressMap(map);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Failed to load roadmap topics.");
      }
    }
    fetchRoadmap();
  }, [selectedGrade, selectedSubjectId, loading]);

  const grouped = useMemo(() => {
    const out = new Map<number, RoadmapTopic[]>();
    topics.forEach((topic) => {
      const rows = out.get(topic.day_number) ?? [];
      rows.push(topic);
      out.set(topic.day_number, rows);
    });
    return [...out.entries()].sort((a, b) => a[0] - b[0]);
  }, [topics]);

  const completedCount = topics.filter((topic) => Boolean(progressMap[topic.id])).length;
  const totalCount = topics.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const xp = completedCount * 10;
  const maxDay = grouped[grouped.length - 1]?.[0] ?? 1;
  const todayDay = getTodayRoadmapDay(maxDay);

  // Toggle checkbox for a topic
  function toggleCheck(topicId: number) {
    setCheckedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }

  // Check if all today's topics are checked and update streak
  useEffect(() => {
    if (streakUpdatedRef.current) return;
    const todayGroup = grouped.find(([day]) => day === todayDay);
    if (!todayGroup) return;
    const todayTopicIds = todayGroup[1].map((t) => t.id);
    if (todayTopicIds.length === 0) return;
    const allChecked = todayTopicIds.every((id) => checkedTopics.has(id));
    if (!allChecked) return;

    // All today's topics are checked — update streak
    streakUpdatedRef.current = true;

    async function updateStreak() {
      if (!userId) return;
      try {
        const supabase = createClient();
        const today = new Date().toISOString().split("T")[0];
        const { data: profile } = await supabase
          .from("profiles")
          .select("current_streak, last_session_date")
          .eq("id", userId)
          .single();

        const lastDate = profile?.last_session_date;

        // If streak was already updated today, do nothing
        if (lastDate === today) {
          setToastMessage("🔥 Day Complete! Your streak was already updated today!");
          return;
        }

        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const newStreak = lastDate === yesterday ? (profile?.current_streak ?? 0) + 1 : 1;

        await supabase
          .from("profiles")
          .update({ current_streak: newStreak, last_session_date: today })
          .eq("id", userId);

        setToastMessage("🔥 Day Complete! Your streak has been updated!");
      } catch (err) {
        console.error("Failed to update streak:", err);
        setToastMessage("🔥 Day Complete! (streak update failed)");
      }
    }

    updateStreak();
  }, [checkedTopics, grouped, todayDay, userId]);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  function motivationalMessage() {
    if (percent === 0) return "Start your learning journey today! 🚀";
    if (percent <= 33) return "Great start! Keep going 💪";
    if (percent <= 66) return "You're halfway there! 🔥";
    if (percent <= 99) return "Almost done! Push through! 👑";
    return "Roadmap complete! You're a legend! 🏆";
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center p-4 pb-24 md:pb-4">
          <p className="text-muted-foreground">Loading roadmap...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background p-4 pb-24 md:p-6 md:pb-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="space-y-4 rounded-2xl border border-gold/30 bg-card/90 p-5 shadow-[0_0_30px_-12px_rgba(250,204,21,0.35)] animate-in fade-in duration-500">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-gold">Learning Roadmap</h1>
              <p className="text-sm font-semibold text-gold">⚡ {xp} XP</p>
            </div>
            <p className="text-sm text-muted-foreground">{motivationalMessage()}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="h-11 rounded-xl border border-input bg-background/90 px-3 text-sm"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">All subjects</option>
                {subjects
                  .filter((subject) => selectedGrade === "" || subject.grade === selectedGrade)
                  .map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
              </select>
              <select
                className="h-11 rounded-xl border border-input bg-background/90 px-3 text-sm"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">All grades</option>
                {GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {completedCount} of {totalCount} topics completed
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-gold transition-all duration-500" style={{ width: `${percent}%` }} />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </section>

          {grouped.length === 0 ? (
            <div className="rounded-2xl border border-border/70 bg-card/90 p-6 text-sm text-muted-foreground">
              Roadmap coming soon for this filter.
            </div>
          ) : (
            <section className="space-y-6 animate-in fade-in duration-500">
              {grouped.map(([dayNumber, dayTopics]) => {
                const isToday = dayNumber === todayDay;
                const dayCheckedCount = dayTopics.filter((t) => checkedTopics.has(t.id)).length;
                const dayTotal = dayTopics.length;
                const dayAllDone = dayCheckedCount === dayTotal && dayTotal > 0;
                const dayPercent = dayTotal > 0 ? Math.round((dayCheckedCount / dayTotal) * 100) : 0;
                return (
                  <div
                    key={dayNumber}
                    className={[
                      "rounded-2xl border bg-card/90 p-4 sm:p-5",
                      isToday
                        ? "border-gold/60 shadow-[0_0_24px_-10px_rgba(250,204,21,0.45)]"
                        : "border-border/70",
                    ].join(" ")}
                  >
                    {/* Day header with progress */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold text-gold">
                        Day {dayNumber}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          — {dayCheckedCount}/{dayTotal} done
                        </span>
                      </h2>
                      {dayAllDone && (
                        <span className="text-sm font-semibold text-green-500">✅ Complete!</span>
                      )}
                    </div>

                    {/* Gold progress bar for today's section */}
                    {isToday && (
                      <div className="mb-4 space-y-1">
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={[
                              "h-full transition-all duration-500",
                              dayAllDone
                                ? "bg-green-500"
                                : "bg-gold",
                            ].join(" ")}
                            style={{ width: `${dayPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {dayTopics.map((topic, idx) => {
                        const progress = progressMap[topic.id];
                        const status = progress?.status;
                        const started = Boolean(progress);
                        const isChecked = checkedTopics.has(topic.id);
                        const statusStyle =
                          status === "fully_understand"
                            ? "bg-green-500"
                            : status === "medium"
                              ? "bg-yellow-400"
                              : status === "needs_attention"
                                ? "bg-red-500"
                                : "bg-muted";
                        const lineStyle = started ? "bg-gradient-to-b from-gold to-gold/20" : "bg-muted";
                        return (
                          <div key={topic.id} className="relative grid grid-cols-[1.25rem_1fr] gap-4">
                            <div className="relative flex flex-col items-center">
                              <span className={`mt-1 h-4 w-4 rounded-full ring-2 ring-background ${statusStyle}`} />
                              {idx < dayTopics.length - 1 && <span className={`mt-1 h-full w-0.5 ${lineStyle}`} />}
                            </div>
                            <div
                              className={[
                                "rounded-xl border p-4 transition-colors duration-300",
                                isChecked
                                  ? "border-green-500/40 bg-green-500/5"
                                  : "border-border/70 bg-background/40",
                              ].join(" ")}
                            >
                              <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <button
                                  type="button"
                                  onClick={() => toggleCheck(topic.id)}
                                  className={[
                                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                                    isChecked
                                      ? "border-green-500 bg-green-500 text-white"
                                      : "border-muted-foreground/40 bg-transparent hover:border-gold/60",
                                  ].join(" ")}
                                  aria-label={isChecked ? `Uncheck ${topic.topic}` : `Check ${topic.topic}`}
                                >
                                  {isChecked && (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </button>

                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className={[
                                      "text-base font-bold transition-colors duration-200",
                                      isChecked ? "text-green-500/80 line-through" : "",
                                    ].join(" ")}>
                                      {topic.topic}
                                    </p>
                                    {status === "needs_attention" && (
                                      <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                                    )}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full border border-gold/40 px-2 py-1 text-gold">
                                      {topic.unit}
                                    </span>
                                    <span className="rounded-full border border-border px-2 py-1 text-muted-foreground">
                                      {(Array.isArray(topic.subjects) ? topic.subjects[0]?.name : topic.subjects?.name) ?? "Subject"}
                                    </span>
                                    <span className="rounded-full border border-border px-2 py-1 text-muted-foreground">
                                      Grade {topic.grade}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-muted-foreground">~{topic.estimated_minutes ?? 15} min</p>
                                  {progress?.score != null && progress?.total != null && (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {progress.score}/{progress.total} correct
                                    </p>
                                  )}
                                  <div className="mt-3">
                                    <Button
                                      asChild
                                      variant={started ? "outline" : "default"}
                                      className={started ? "" : "bg-gold text-black hover:bg-gold/90"}
                                    >
                                      <Link href={`/roadmap/${topic.id}`}>{started ? "Redo" : "Start"}</Link>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </main>

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="rounded-2xl border border-gold/50 bg-card px-6 py-4 shadow-[0_0_32px_-8px_rgba(250,204,21,0.5)]">
            <p className="text-sm font-semibold text-gold">{toastMessage}</p>
          </div>
        </div>
      )}
    </>
  );
}
