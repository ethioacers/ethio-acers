"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getProfile, getSessionDatesForUser } from "@/lib/streak";
import { StreakCalendar } from "@/components/StreakCalendar";
import { Button } from "@/components/ui/button";

async function signOut(router: ReturnType<typeof useRouter>) {
  const supabase = createClient();
  await supabase.auth.signOut();
  router.push("/login");
  router.refresh();
}

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [todayDone, setTodayDone] = useState(false);
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
        setStreak(profile.current_streak);
      }
      const dates = await getSessionDatesForUser(user.id);
      setSessionDates(dates);
      const today = new Date().toISOString().split("T")[0];
      setTodayDone(dates.includes(today));
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-lg space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="text-sm text-muted-foreground hover:underline"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={() => signOut(router)}
              className="text-sm text-muted-foreground hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl" role="img" aria-label="flame">
              🔥
            </span>
            <span className="text-2xl font-bold">{streak}</span>
            <span className="text-muted-foreground">day streak</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Today&apos;s session:{" "}
            <strong className={todayDone ? "text-green-600" : "text-muted-foreground"}>
              {todayDone ? "Done" : "Not done"}
            </strong>
          </p>
          <StreakCalendar sessionDates={sessionDates} />
        </div>

        <div className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/practice">Start Practice</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
