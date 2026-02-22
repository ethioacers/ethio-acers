import { createClient } from "@/lib/supabase";

function getPreviousDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export type Profile = {
  id: string;
  full_name: string | null;
  school_name?: string | null;
  grade: number | null;
  current_streak: number;
  last_session_date: string | null;
  created_at: string;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: { current_streak?: number; last_session_date?: string }
): Promise<void> {
  const supabase = createClient();
  await supabase.from("profiles").update(updates).eq("id", userId);
}

export async function logSession(
  userId: string,
  subjectId: number,
  score: number,
  total: number
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const profile = await getProfile(userId);
  if (!profile) return;

  const lastDate = profile.last_session_date ?? null;
  const yesterday = getPreviousDay(today);

  let newStreak = 1;
  if (lastDate === yesterday) {
    newStreak = profile.current_streak + 1;
  } else if (lastDate === today) {
    newStreak = profile.current_streak;
  }

  await updateProfile(userId, {
    current_streak: newStreak,
    last_session_date: today,
  });

  const supabase = createClient();
  await supabase.from("sessions").insert({
    user_id: userId,
    subject_id: subjectId,
    score,
    total,
    session_date: today,
  });
}

export async function getSessionDatesForUser(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("sessions")
    .select("session_date")
    .eq("user_id", userId)
    .order("session_date", { ascending: false })
    .limit(28);
  if (!data) return [];
  return [...new Set(data.map((r) => r.session_date))];
}
