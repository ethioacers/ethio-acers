"use client";

import { useEffect, useMemo, useState } from "react";
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
                    <h2 className="mb-4 text-lg font-semibold text-gold">Day {dayNumber}</h2>
                    <div className="space-y-4">
                      {dayTopics.map((topic, idx) => {
                        const progress = progressMap[topic.id];
                        const status = progress?.status;
                        const started = Boolean(progress);
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
                            <div className="rounded-xl border border-border/70 bg-background/40 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-base font-bold">{topic.topic}</p>
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
    </>
  );
}
