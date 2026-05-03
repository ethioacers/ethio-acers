"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import {
  fetchLeaderboard,
  fetchMyPointsSummary,
  type LeaderboardRow,
  type MyPointsSummary,
} from "@/lib/points";

type Tab = "all" | "week";

function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [mine, setMine] = useState<MyPointsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr || !user) {
          router.replace("/login?redirectTo=/leaderboard");
          return;
        }
        if (!cancelled) setUserId(user.id);

        const [list, summary] = await Promise.all([
          fetchLeaderboard(tab === "week"),
          fetchMyPointsSummary(),
        ]);
        if (!cancelled) {
          setRows(list);
          setMine(summary);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load leaderboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, tab]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center p-4 pb-28 md:pb-10">
          <p className="text-muted-foreground">Loading leaderboard…</p>
        </main>
      </>
    );
  }

  const pointsLabel = tab === "week" ? "Weekly points" : "Total points";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background p-6 pb-28 md:pb-10">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gold">Leaderboard</h1>
              <p className="text-sm text-muted-foreground">Top students by points.</p>
            </div>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
              ← Dashboard
            </Link>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
              <p className="mt-2 text-xs text-muted-foreground">
                If this is your first time, run <code className="rounded bg-muted px-1">supabase/points_leaderboard.sql</code> in
                Supabase and refresh.
              </p>
            </div>
          )}

          {mine && (
            <div className="rounded-2xl border border-gold/35 bg-gradient-to-br from-gold/10 via-background to-primary/5 p-5 shadow-md dark:border-gold/25">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your standing</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Your rank (all-time)</p>
                  <p className="text-2xl font-bold text-gold">#{mine.rank_all}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Your rank (this week)</p>
                  <p className="text-2xl font-bold text-gold">#{mine.rank_weekly}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Streak</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {mine.streak} <span className="text-base">🔥</span>
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-6 border-t border-border/60 pt-4 dark:border-gold/15">
                <div>
                  <p className="text-xs text-muted-foreground">Total points</p>
                  <p className="text-lg font-semibold tabular-nums">{mine.total_points}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Weekly points</p>
                  <p className="text-lg font-semibold tabular-nums">{mine.weekly_points}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 rounded-2xl border border-border/70 bg-card/40 p-1 dark:border-gold/15">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                tab === "all"
                  ? "bg-primary/20 text-gold ring-1 ring-gold/30"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              🏆 All-Time
            </button>
            <button
              type="button"
              onClick={() => setTab("week")}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                tab === "week"
                  ? "bg-primary/20 text-gold ring-1 ring-gold/30"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              📅 This Week
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/70 dark:border-gold/15">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Rank</th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Grade</th>
                  <th className="px-4 py-3 font-semibold">{pointsLabel}</th>
                  <th className="px-4 py-3 font-semibold">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 dark:divide-gold/10">
                {rows.map((r) => {
                  const isYou = userId && r.user_id === userId;
                  return (
                    <tr
                      key={r.user_id}
                      className={
                        isYou
                          ? "bg-gold/15 ring-1 ring-inset ring-gold/40 dark:bg-gold/10"
                          : "bg-card/20 hover:bg-accent/10"
                      }
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">
                        <span className="mr-2">{medal(r.rank)}</span>
                        {r.rank}
                      </td>
                      <td className="px-4 py-3 font-medium">{r.student_name}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.grade ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-gold">{r.points}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {r.streak} 🔥
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && !error && (
            <p className="text-center text-sm text-muted-foreground">No rankings yet — earn points by practicing!</p>
          )}
        </div>
      </main>
    </>
  );
}
