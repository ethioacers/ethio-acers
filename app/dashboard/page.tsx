"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getProfile, getSessionDatesForUser } from "@/lib/streak";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      const profile = await getProfile(user.id);
      if (profile) {
        setStudentName(profile.full_name || "Student");
        setGrade(profile.grade);
        setSchoolName(profile.school_name || "");
        setStreak(profile.current_streak);
      }

      const dates = await getSessionDatesForUser(user.id);
      setSessionDates(dates);

      const { count: attemptsTotal } = await supabase
        .from("attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      const { count: correct } = await supabase
        .from("attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_correct", true);
      setTotalAttempts(attemptsTotal ?? 0);
      setCorrectAttempts(correct ?? 0);

      const { count: sessionsCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setTotalSessions(sessionsCount ?? 0);

      const { data: sessions } = await supabase
        .from("sessions")
        .select(`
          id,
          subject_id,
          score,
          total,
          session_date,
          created_at,
          subjects(name)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentSessions((sessions as SessionRow[]) ?? []);

      setLoading(false);
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
      <main className="min-h-screen p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
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
          <div className="rounded-lg border border-muted bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl" role="img" aria-label="flame">
                🔥
              </span>
              <span className="text-2xl font-bold text-gold">{streak}</span>
              <span className="text-muted-foreground">day streak</span>
            </div>
            <StreakCalendar sessionDates={sessionDates} />
          </div>

          {/* Stats row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-muted bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Questions answered
              </p>
              <p className="text-2xl font-bold text-gold">{totalAttempts}</p>
            </div>
            <div className="rounded-lg border border-muted bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Accuracy
              </p>
              <p className="text-2xl font-bold text-gold">{accuracy}%</p>
            </div>
            <div className="rounded-lg border border-muted bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">
                Sessions completed
              </p>
              <p className="text-2xl font-bold text-gold">{totalSessions}</p>
            </div>
          </div>

          {/* Recent sessions */}
          <div className="rounded-lg border border-muted bg-card p-6 shadow-sm">
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

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-gold text-black hover:bg-gold/90"
            >
              <Link href="/practice">Start Practice</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Link href="/profile">View Profile</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
