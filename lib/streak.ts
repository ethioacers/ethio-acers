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
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    return data as Profile;
  } catch (err) {
    console.error("getProfile error:", err);
    return null;
  }
}

export async function updateProfile(
  userId: string,
  updates: { current_streak?: number; last_session_date?: string }
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
    if (error) {
      console.error("updateProfile error:", error);
    }
  } catch (err) {
    console.error("updateProfile error:", err);
  }
}

export async function logSession(
  userId: string,
  subjectId: number,
  score: number,
  total: number
): Promise<void> {
  try {
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
    const { error } = await supabase.from("sessions").insert({
      user_id: userId,
      subject_id: subjectId,
      score,
      total,
      session_date: today,
    });
    if (error) {
      console.error("logSession insert error:", error);
    }
  } catch (err) {
    console.error("logSession error:", err);
  }
}

export async function getSessionDatesForUser(userId: string): Promise<string[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("session_date")
      .eq("user_id", userId)
      .order("session_date", { ascending: false })
      .limit(28);
    if (error || !data) return [];
    return [...new Set(data.map((r) => r.session_date))];
  } catch (err) {
    console.error("getSessionDatesForUser error:", err);
    return [];
  }
}
