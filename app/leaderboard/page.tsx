"use client";

import { useEffect, useMemo, useState } from "react";
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

function medalEmoji(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

function avatarInitial(name: string): string {
  const s = name.trim();
  if (!s) return "?";
  return s[0]!.toUpperCase();
}

function PodiumSlot({
  row,
  medal,
  tallClass,
}: {
  row: LeaderboardRow | undefined;
  medal: string;
  tallClass: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-end rounded-2xl border border-border/70 bg-card/90 px-2 pb-4 pt-5 text-center shadow-md dark:border-gold/15 ${tallClass}`}
    >
      <span className="text-3xl leading-none md:text-4xl" aria-hidden>
        {medal}
      </span>
      {row ? (
        <>
          <div className="mt-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-gold ring-2 ring-gold/35 md:h-16 md:w-16 md:text-xl">
            {avatarInitial(row.student_name)}
          </div>
          <p className="mt-2 max-w-full truncate px-1 text-xs font-semibold md:text-sm">{row.student_name}</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-gold md:text-base">{row.points}</p>
          <p className="text-[10px] text-muted-foreground md:text-xs">pts</p>
        </>
      ) : (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-2 pb-2 text-muted-foreground">
          <div className="h-12 w-12 rounded-full border border-dashed border-border/60 md:h-14 md:w-14" />
          <span className="text-xs">—</span>
        </div>
      )}
    </div>
  );
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

  const pointsLabel = tab === "week" ? "Weekly points" : "Total points";

  const second = useMemo(() => rows.find((r) => r.rank === 2), [rows]);
  const first = useMemo(() => rows.find((r) => r.rank === 1), [rows]);
  const third = useMemo(() => rows.find((r) => r.rank === 3), [rows]);
  const restRows = useMemo(() => rows.filter((r) => r.rank > 3), [rows]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center p-4 pb-24 md:pb-10">
          <p className="text-muted-foreground">Loading leaderboard…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background p-6 pb-24 md:pb-10">
        <div className="mx-auto max-w-3xl space-y-6 md:space-y-8">
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

          {mine && (
            <div className="rounded-2xl border border-gold/35 bg-gradient-to-br from-gold/10 via-background to-primary/5 p-5 shadow-md dark:border-gold/25">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your stats</p>
              <div className="mt-4 grid grid-cols-3 gap-3 divide-x divide-border/50 dark:divide-gold/15">
                <div className="pr-2 text-center">
                  <p className="text-xs text-muted-foreground">Your rank</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-gold">
                    #{tab === "week" ? mine.rank_weekly : mine.rank_all}
                  </p>
                </div>
                <div className="px-2 text-center">
                  <p className="text-xs text-muted-foreground">Total points</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{mine.total_points}</p>
                </div>
                <div className="pl-2 text-center">
                  <p className="text-xs text-muted-foreground">Weekly points</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{mine.weekly_points}</p>
                </div>
              </div>
            </div>
          )}

          <div className="md:hidden">
            <div className="flex items-end justify-center gap-2 px-1">
              <PodiumSlot row={second} medal="🥈" tallClass="min-h-[168px] w-[30%] max-w-[7rem]" />
              <PodiumSlot row={first} medal="🥇" tallClass="min-h-[200px] w-[34%] max-w-[8rem]" />
              <PodiumSlot row={third} medal="🥉" tallClass="min-h-[140px] w-[30%] max-w-[7rem]" />
            </div>

            <div className="mt-6 space-y-2">
              {restRows.map((r) => {
                const isYou = userId && r.user_id === userId;
                return (
                  <div
                    key={r.user_id}
                    className={[
                      "flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 text-sm",
                      isYou
                        ? "border-gold/50 bg-gold/15 ring-1 ring-gold/35 dark:bg-gold/10"
                        : "border-border/60 bg-card/40 dark:border-gold/10",
                    ].join(" ")}
                  >
                    <span className="w-8 shrink-0 font-bold tabular-nums text-muted-foreground">{r.rank}</span>
                    <span className="min-w-0 flex-1 font-medium truncate">{r.student_name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">Gr. {r.grade ?? "—"}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-gold">{r.points} pts</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{r.streak} 🔥</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-border/70 md:block dark:border-gold/15">
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
                        <span className="mr-2">{medalEmoji(r.rank)}</span>
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
