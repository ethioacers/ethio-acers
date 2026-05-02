"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getProfile, getSessionDatesForUser } from "@/lib/streak";
import { getUsageForUser, type UsageResult } from "@/lib/usage";
import { StreakCalendar } from "@/components/StreakCalendar";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";

type SessionRow = {
  id: string;
  subject_id: number;
  score: number | null;
  total: number | null;
  session_date: string;
  created_at: string;
  subjects?: { name: string } | null;
};

type WeeklyExamSummary = {
  id: number;
  title: string;
  week_end: string;
  attemptScore?: number | null;
  attemptTotal?: number | null;
  attemptsToday?: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [streak, setStreak] = useState(0);
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [recentSessions, setRecentSessions] = useState<SessionRow[]>([]);
  const [weeklyExam, setWeeklyExam] = useState<WeeklyExamSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageResult | null>(null);

  useEffect(() => {
    async function load() {
      setLoadError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr) {
          setLoadError(userErr.message);
          return;
        }
        if (!user) {
          router.replace("/login");
          return;
        }
        setUserId(user.id);

        try {
          const profile = await getProfile(user.id);
          if (profile) {
            setStudentName(profile.full_name || "Student");
            setGrade(profile.grade);
            setSchoolName(profile.school_name || "");
            setStreak(profile.current_streak);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setLoadError(msg || "Failed to load profile.");
        }

        try {
          const dates = await getSessionDatesForUser(user.id);
          setSessionDates(dates);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setLoadError(msg || "Failed to load streak calendar.");
        }

        try {
          const usageData = await getUsageForUser(user.id);
          setUsage(usageData);
        } catch (err) {
          // Non-fatal: dashboard can still render without usage
          console.error("dashboard usage load error:", err);
        }

        const { count: attemptsTotal, error: attemptsErr } = await supabase
          .from("attempts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        const { count: correct, error: correctErr } = await supabase
          .from("attempts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_correct", true);
        if (attemptsErr || correctErr) {
          setLoadError((attemptsErr ?? correctErr)?.message ?? "Failed to load stats.");
        }
        setTotalAttempts(attemptsTotal ?? 0);
        setCorrectAttempts(correct ?? 0);

        const { count: sessionsCount, error: sessionsCountErr } = await supabase
          .from("sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (sessionsCountErr) {
          setLoadError(sessionsCountErr.message);
        }
        setTotalSessions(sessionsCount ?? 0);

      const { data: sessions, error: sessionsErr } = await supabase
        .from("sessions")
        .select("id, score, total, session_date, subject_id, subjects(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
        if (sessionsErr) {
          setLoadError(sessionsErr.message);
        }
        setRecentSessions((sessions as unknown as SessionRow[]) ?? []);

        const today = new Date().toISOString().split("T")[0];
        const { data: activeWeekly } = await supabase
          .from("weekly_exams")
          .select("id, title, week_end")
          .eq("is_active", true)
          .lte("week_start", today)
          .gte("week_end", today)
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeWeekly) {
          const todayStartIso = new Date(new Date().toISOString().split("T")[0]).toISOString();
          const { data: attemptRow } = await supabase
            .from("weekly_exam_attempts")
            .select("score, total")
            .eq("user_id", user.id)
            .eq("weekly_exam_id", (activeWeekly as any).id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const { count: attemptsToday } = await supabase
            .from("weekly_exam_attempts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("weekly_exam_id", (activeWeekly as any).id)
            .gte("created_at", todayStartIso);
          setWeeklyExam({
            id: (activeWeekly as any).id,
            title: (activeWeekly as any).title,
            week_end: (activeWeekly as any).week_end,
            attemptScore: (attemptRow as any)?.score ?? null,
            attemptTotal: (attemptRow as any)?.total ?? null,
            attemptsToday: attemptsToday ?? 0,
          });
        } else {
          setWeeklyExam(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setLoadError(msg || "Something went wrong while loading the dashboard.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

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

  const accuracy =
    totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {loadError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 sm:p-4 text-sm text-destructive">
              {loadError}
            </div>
          )}
          {/* Welcome header */}
          <div>
            <h1 className="text-2xl font-bold text-gold">
              Welcome back, {studentName}!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {grade != null && `Grade ${grade}`}
              {grade != null && schoolName && " · "}
              {schoolName}
            </p>
          </div>

          {/* Streak card */}
          <div className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-6 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-3xl" role="img" aria-label="flame">
                🔥
              </span>
              <span className="text-2xl font-bold text-gold">{streak}</span>
              <span className="text-muted-foreground">day streak</span>
            </div>
            <StreakCalendar sessionDates={sessionDates} />
          </div>

          {/* Stats row */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
            <div className="h-full rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Questions answered
              </p>
              <p className="text-lg sm:text-2xl font-bold text-gold">{totalAttempts}</p>
            </div>
            <div className="h-full rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Accuracy
              </p>
              <p className="text-lg sm:text-2xl font-bold text-gold">{accuracy}%</p>
            </div>
            <div className="col-span-2 h-full rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm md:col-span-1">
              <p className="text-xs font-medium text-muted-foreground">
                Sessions completed
              </p>
              <p className="text-lg sm:text-2xl font-bold text-gold">{totalSessions}</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="md:hidden grid grid-cols-2 gap-3">
            <Button
              asChild
              size="lg"
              className="col-span-2 bg-gold text-black hover:bg-gold/90 w-full"
            >
              <Link href="/practice">Start Practice</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full"
            >
              <Link href="/notes">Notes</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full"
            >
              <Link href="/profile">View Profile</Link>
            </Button>
          </div>

          {/* Desktop quick actions unchanged */}
          <div className="hidden md:grid md:grid-cols-2 md:gap-3 md:flex md:flex-wrap md:gap-3">
            <Button
              asChild
              size="lg"
              className="w-full aspect-square md:w-auto md:aspect-auto bg-gold text-black hover:bg-gold/90 flex flex-col items-center justify-center gap-1"
            >
              <Link href="/practice" className="flex flex-col items-center justify-center gap-1">
                <span className="text-2xl sm:hidden" aria-hidden>
                  📝
                </span>
                <span className="sm:text-sm">Start Practice</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full aspect-square md:w-auto md:aspect-auto flex flex-col items-center justify-center gap-1"
            >
              <Link href="/notes" className="flex flex-col items-center justify-center gap-1">
                <span className="text-2xl sm:hidden" aria-hidden>
                  📖
                </span>
                <span className="sm:text-sm">Notes</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full aspect-square md:w-auto md:aspect-auto flex flex-col items-center justify-center gap-1"
            >
              <Link href="/profile" className="flex flex-col items-center justify-center gap-1">
                <span className="text-2xl sm:hidden" aria-hidden>
                  👤
                </span>
                <span className="sm:text-sm">View Profile</span>
              </Link>
            </Button>
          </div>

          {/* Usage limits (free users) */}
          {usage && (
            <>
              {/* Desktop usage unchanged */}
              <div className="hidden rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm md:block">
                {usage.isPro ? (
                  <p className="text-sm font-medium text-gold">
                    ✨ Pro — Unlimited Access
                  </p>
                ) : (
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-gold">
                      Practice: {usage.practiceUsed}/2 sessions used today
                    </p>
                    <p className="font-medium text-gold">
                      Flashcards: {usage.flashcardsUsed}/1 sessions used today
                    </p>
                    <p className="font-medium text-gold">
                      Full Exam: {usage.examUsed}/1 sessions used today
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile compact usage */}
              <div className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm md:hidden">
                {usage.isPro ? (
                  <p className="text-sm font-medium text-gold">Pro — Unlimited Access</p>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Practice</span>
                        <span className="font-medium text-foreground">
                          {usage.practiceUsed}/2
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gold"
                          style={{ width: `${Math.min(100, (usage.practiceUsed / 2) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Flashcards</span>
                        <span className="font-medium text-foreground">
                          {usage.flashcardsUsed}/1
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gold"
                          style={{ width: `${Math.min(100, (usage.flashcardsUsed / 1) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Full Exam</span>
                        <span className="font-medium text-foreground">
                          {usage.examUsed}/1
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gold"
                          style={{ width: `${Math.min(100, (usage.examUsed / 1) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {weeklyExam && (
            <div className="rounded-2xl border border-yellow-500/70 bg-card/95 p-6 shadow-lg shadow-yellow-500/10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold">Priority: Weekly Exam</p>
                  <p className="font-semibold text-gold text-lg">{weeklyExam.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    1 exam per day throughout the week · up to 3 attempts each day
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deadline:{" "}
                    {new Date(weeklyExam.week_end).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-yellow-500/60 px-3 py-1 text-xs font-semibold text-gold">
                    {weeklyExam.attemptsToday ?? 0}/3 today
                  </span>
                  {weeklyExam.attemptScore != null && weeklyExam.attemptTotal != null && (
                    <span className="rounded-full border border-yellow-500/60 px-3 py-1 text-xs font-semibold text-gold">
                      Last: {weeklyExam.attemptScore}/{weeklyExam.attemptTotal}
                    </span>
                  )}
                  <Button asChild className="bg-gold text-black hover:bg-gold/90">
                    <Link href="/weekly-exam">
                      {(weeklyExam.attemptsToday ?? 0) >= 3 ? "View Weekly Exam →" : "Take Weekly Exam →"}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Features overview */}
          {usage && !usage.isPro && (
            <div className="md:hidden">
              <Button asChild className="w-full bg-gold text-black hover:bg-gold/90">
                <Link href="/pricing">View Plans</Link>
              </Button>
            </div>
          )}
          {usage && !usage.isPro && (
            <div className="hidden md:block">
              <Button asChild className="w-auto bg-gold text-black hover:bg-gold/90">
                <Link href="/pricing">View Plans</Link>
              </Button>
            </div>
          )}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">
              Everything You Need to Ace Your Exams{" "}
              <span className="hidden md:inline">🎓</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-yellow-500/50 bg-card/90 p-5 shadow-md">
                <div className="hidden md:block text-3xl mb-2">🤖</div>
                <h3 className="font-semibold mb-1">AI-Powered Explanations</h3>
                <p className="text-sm text-muted-foreground">
                  Got a question wrong? Our AI tutor explains exactly why the correct answer is right, step by step in
                  simple language.
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-500/50 bg-card/90 p-5 shadow-md">
                <div className="hidden md:block text-3xl mb-2">📝</div>
                <h3 className="font-semibold mb-1">Past Exam Questions</h3>
                <p className="text-sm text-muted-foreground">
                  Practice thousands of real past exam questions filtered by subject, grade, chapter and year. Build
                  confidence before exam day.
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-500/50 bg-card/90 p-5 shadow-md">
                <div className="hidden md:block text-3xl mb-2">📖</div>
                <h3 className="font-semibold mb-1">Study Notes &amp; AI Summaries</h3>
                <p className="text-sm text-muted-foreground">
                  Access textbook summaries or generate instant AI notes on any topic you need help with.
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-500/50 bg-card/90 p-5 shadow-md">
                <div className="hidden md:block text-3xl mb-2">🔥</div>
                <h3 className="font-semibold mb-1">Daily Streak Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Build a daily study habit and track your consistency with a visual streak calendar. Never miss a day!
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-500/50 bg-card/90 p-5 shadow-md">
                <div className="hidden md:block text-3xl mb-2">📊</div>
                <h3 className="font-semibold mb-1">Timed Full Exams</h3>
                <p className="text-sm text-muted-foreground">
                  Simulate the real national exam experience with full timed mock exams. Get a detailed score breakdown
                  after.
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-500/50 bg-card/90 p-5 shadow-md">
                <div className="hidden md:block text-3xl mb-2">🎯</div>
                <h3 className="font-semibold mb-1">Track Your Progress</h3>
                <p className="text-sm text-muted-foreground">
                  See your accuracy, total questions answered, and study sessions at a glance. Know exactly where you
                  stand.
                </p>
              </div>
            </div>
          </section>

          {/* Recent sessions */}
          <div className="rounded-2xl border border-border/70 bg-card/90 p-6 shadow-lg">
            <h2 className="font-semibold mb-4">Recent sessions</h2>
            {recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sessions yet. Start practicing!
              </p>
            ) : (
              <ul className="space-y-2">
                {recentSessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {s.subjects?.name ?? "Unknown"}
                      {s.score != null && s.total != null && (
                        <span className="text-muted-foreground ml-2">
                          {s.score}/{s.total}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(s.session_date).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
