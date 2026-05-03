import { createClient } from "@/lib/supabase";

type PointsFields = {
  total_points: number | null;
  weekly_points: number | null;
  weekly_points_reset: string | null;
};

function todayUtcDateStr(): string {
  return new Date().toISOString().split("T")[0]!;
}

/** Award points and append history. Resets weekly bucket if 7+ days since `weekly_points_reset`. */
export async function awardPoints(userId: string, points: number, reason: string): Promise<void> {
  if (!points) return;
  const supabase = createClient();
  const today = todayUtcDateStr();

  const { data: profile, error: fetchErr } = await supabase
    .from("profiles")
    .select("total_points, weekly_points, weekly_points_reset")
    .eq("id", userId)
    .single();

  if (fetchErr || !profile) {
    console.error("awardPoints: profile load failed", fetchErr);
    return;
  }

  const p = profile as PointsFields;
  const total = Number(p.total_points ?? 0);
  const weekly = Number(p.weekly_points ?? 0);
  const lastResetStr = p.weekly_points_reset ?? today;
  const last = new Date(`${lastResetStr}T12:00:00`);
  const tday = new Date(`${today}T12:00:00`);
  const daysSinceReset = Math.floor((tday.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  let nextWeekly = weekly;
  let nextReset = lastResetStr;
  if (daysSinceReset >= 7) {
    nextWeekly = 0;
    nextReset = today;
  }
  nextWeekly += points;

  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      total_points: total + points,
      weekly_points: nextWeekly,
      weekly_points_reset: nextReset,
    })
    .eq("id", userId);

  if (upErr) {
    console.error("awardPoints: profile update failed", upErr);
    return;
  }

  const { error: histErr } = await supabase.from("points_history").insert({
    user_id: userId,
    points,
    reason,
  });
  if (histErr) {
    console.error("awardPoints: history insert failed", histErr);
  }
}

/** Call after streak is updated — awards +50 on days 7, 14, 21, … */
export async function maybeAwardStreakMilestone(userId: string, newStreak: number): Promise<void> {
  if (newStreak <= 0) return;
  if (newStreak % 7 !== 0) return;
  await awardPoints(userId, 50, "7 day streak bonus");
}

export type LeaderboardRow = {
  rank: number;
  user_id: string;
  student_name: string;
  grade: number | null;
  points: number;
  streak: number;
};

export type MyPointsSummary = {
  total_points: number;
  weekly_points: number;
  rank_all: number;
  rank_weekly: number;
  streak: number;
};

export async function fetchLeaderboard(weekly: boolean): Promise<LeaderboardRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("leaderboard_top", { p_weekly: weekly });
  if (error) {
    console.error("fetchLeaderboard", error);
    return [];
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    rank: Number(r.rank),
    user_id: String(r.user_id),
    student_name: String(r.student_name ?? "Student"),
    grade: r.grade != null ? Number(r.grade) : null,
    points: Number(r.points ?? 0),
    streak: Number(r.streak ?? 0),
  }));
}

export async function fetchMyPointsSummary(): Promise<MyPointsSummary | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("my_points_summary");
  if (error) {
    console.error("fetchMyPointsSummary", error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return {
    total_points: Number(r.total_points ?? 0),
    weekly_points: Number(r.weekly_points ?? 0),
    rank_all: Number(r.rank_all ?? 1),
    rank_weekly: Number(r.rank_weekly ?? 1),
    streak: Number(r.streak ?? 0),
  };
}
