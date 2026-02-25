import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { explainAnswer } from "@/lib/gemini";

const DAILY_AI_LIMIT = 5;

// Use Node.js runtime so process.env (including .env.local) is available
export const runtime = "nodejs";

/** Fallback: read GEMINI_API_KEY from .env.local if Next didn't inject it */
function getGeminiApiKey(): string {
  let key = (process.env.GEMINI_API_KEY ?? "").trim();
  if (key) return key;
  // Find project root (directory that contains package.json)
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "package.json"))) {
      const envPath = join(dir, ".env.local");
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, "utf8");
        for (const line of content.split(/\r?\n/)) {
          const m = line.match(/^\s*GEMINI_API_KEY\s*=\s*(.+)/);
          if (m) {
            key = m[1].trim().replace(/^["']|["']$/g, "");
            if (key) return key;
          }
        }
      }
      break;
    }
    dir = join(dir, "..");
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { question: string; selectedAnswer: string; correctAnswer: string; subject: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { question, selectedAnswer, correctAnswer, subject } = body;
    if (!question || !correctAnswer || !subject) {
      return NextResponse.json(
        { error: "Missing question, correctAnswer, or subject" },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("ai_requests_today, ai_last_reset")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const today = new Date().toISOString().split("T")[0];
    const lastReset = (profile.ai_last_reset as string) ?? null;
    let requestsToday = Number(profile.ai_requests_today ?? 0);

    if (lastReset !== today) {
      const { error: resetErr } = await supabase
        .from("profiles")
        .update({ ai_requests_today: 0, ai_last_reset: today })
        .eq("id", user.id);
      if (resetErr) {
        console.error("AI reset error:", resetErr);
      }
      requestsToday = 0;
    }

    if (requestsToday >= DAILY_AI_LIMIT) {
      return NextResponse.json(
        { error: "Daily limit reached", message: "You've used your 5 free explanations today. Come back tomorrow!" },
        { status: 429 }
      );
    }

    let apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set.");
      return NextResponse.json(
        {
          error: "AI is not configured.",
          message:
            "Set GEMINI_API_KEY in .env.local (same folder as package.json), then restart the dev server.",
        },
        { status: 500 }
      );
    }
    process.env.GEMINI_API_KEY = apiKey;

    let explanation: string;
    try {
      explanation = await explainAnswer({
        question,
        selectedAnswer: selectedAnswer ?? "",
        correctAnswer,
        subject,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isQuotaError =
        message.includes("429") ||
        message.includes("quota") ||
        message.includes("Too Many Requests") ||
        message.includes("rate limit");
      if (isQuotaError) {
        return NextResponse.json(
          {
            error: "AI quota exceeded",
            message:
              "You've hit the free-tier limit for AI. Wait a minute and try again, or check your quota at https://ai.google.dev/gemini-api/docs/rate-limits",
          },
          { status: 503 }
        );
      }
      console.error("Gemini explainAnswer error:", message, err);
      return NextResponse.json(
        {
          error: "Failed to generate explanation",
          message: message || "The AI service is temporarily unavailable. Please try again later.",
        },
        { status: 500 }
      );
    }

    const { error: bumpErr } = await supabase
      .from("profiles")
      .update({ ai_requests_today: requestsToday + 1 })
      .eq("id", user.id);
    if (bumpErr) {
      console.error("AI request counter update error:", bumpErr);
    }

    return NextResponse.json({ explanation });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/ai unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}
