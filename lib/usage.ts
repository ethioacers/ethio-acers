import { createClient } from "@/lib/supabase";

export type SessionType = "practice" | "flashcards" | "exam";

export type UsageResult = {
  isPro: boolean;
  practiceUsed: number;
  flashcardsUsed: number;
  examUsed: number;
  usageLastReset: string | null;
};

const LIMITS: Record<SessionType, number> = {
  practice: 2,
  flashcards: 1,
  exam: 1,
};

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export async function getUsageForUser(userId: string): Promise<UsageResult> {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) {
    return {
      isPro: false,
      practiceUsed: 0,
      flashcardsUsed: 0,
      examUsed: 0,
      usageLastReset: null,
    };
  }

  const isPro = Boolean((profile as any).is_pro);

  const usageLastReset = (profile as any).usage_last_reset ?? null;
  const needsReset = usageLastReset !== todayStr();

  if (needsReset) {
    const { error } = await supabase
      .from("profiles")
      .update({
        practice_sessions_today: 0,
        flashcard_sessions_today: 0,
        exam_sessions_today: 0,
        usage_last_reset: todayStr(),
      })
      .eq("id", userId);

    if (error) {
      // Non-fatal: if reset update fails, we still return current counters
      console.error("getUsageForUser reset error:", error);
    }
  }

  return {
    isPro,
    practiceUsed: Number(
      needsReset ? 0 : (profile as any).practice_sessions_today ?? 0
    ),
    flashcardsUsed: Number(
      needsReset ? 0 : (profile as any).flashcard_sessions_today ?? 0
    ),
    examUsed: Number(needsReset ? 0 : (profile as any).exam_sessions_today ?? 0),
    usageLastReset: needsReset ? todayStr() : usageLastReset,
  };
}

export async function incrementUsage(userId: string, sessionType: SessionType): Promise<UsageResult> {
  const usage = await getUsageForUser(userId);
  if (usage.isPro) return usage;

  const map: Record<SessionType, string> = {
    practice: "practice_sessions_today",
    flashcards: "flashcard_sessions_today",
    exam: "exam_sessions_today",
  };

  const field = map[sessionType];
  const currentValue =
    sessionType === "practice"
      ? usage.practiceUsed
      : sessionType === "flashcards"
        ? usage.flashcardsUsed
        : usage.examUsed;

  const { error } = await createClient()
    .from("profiles")
    .update({ [field]: currentValue + 1 })
    .eq("id", userId);

  if (error) {
    console.error("incrementUsage error:", error);
  }

  return await getUsageForUser(userId);
}

export async function incrementPracticeSession(userId: string): Promise<UsageResult> {
  return incrementUsage(userId, "practice");
}

export async function incrementFlashcardSession(userId: string): Promise<UsageResult> {
  return incrementUsage(userId, "flashcards");
}

export async function incrementExamSession(userId: string): Promise<UsageResult> {
  return incrementUsage(userId, "exam");
}

export async function startUsageSession(
  userId: string,
  sessionType: SessionType
): Promise<
  | { allowed: true; usage: UsageResult }
  | { allowed: false; usage: UsageResult; limit: number; used: number }
> {
  const usage = await getUsageForUser(userId);
  if (usage.isPro) {
    return { allowed: true, usage };
  }

  const limit = LIMITS[sessionType];
  const used =
    sessionType === "practice"
      ? usage.practiceUsed
      : sessionType === "flashcards"
        ? usage.flashcardsUsed
        : usage.examUsed;

  if (used >= limit) {
    return { allowed: false, usage, limit, used };
  }

  const updated = await incrementUsage(userId, sessionType);
  return { allowed: true, usage: updated };
}

