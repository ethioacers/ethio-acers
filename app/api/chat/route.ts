import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const DAILY_AI_LIMIT = 5;
const SYSTEM_PROMPT = `You are AcerBot, a friendly AI tutor for Ethiopian high school students (Grade 9-12).
You help students with:
1. Subject questions: Mathematics, Physics, Chemistry, Biology, English, Economics, Geography, History
2. App navigation: explaining how to use EthioAcers features like Practice, Flashcards, Weekly Exams, Notes
You follow the Ethiopian high school curriculum.
Keep responses concise and student-friendly.
Use simple language and show step-by-step working for math/science problems.
If asked about something unrelated to studying or the app, politely redirect to academics.`;

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

function todayStr(): string {
  return new Date().toISOString().split("T")[0]!;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { message?: string; history?: IncomingMessage[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const message = String(body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const history = Array.isArray(body.history)
      ? body.history
          .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-10)
      : [];

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("ai_requests_today, ai_last_reset, is_pro")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const isPro = Boolean(profile.is_pro);
    let requestsToday = Number(profile.ai_requests_today ?? 0);
    const today = todayStr();
    const lastReset = profile.ai_last_reset as string | null;

    if (lastReset !== today) {
      const { error: resetErr } = await supabase
        .from("profiles")
        .update({ ai_requests_today: 0, ai_last_reset: today })
        .eq("id", user.id);
      if (resetErr) {
        console.error("chat reset error:", resetErr);
      }
      requestsToday = 0;
    }

    if (!isPro && requestsToday >= DAILY_AI_LIMIT) {
      return NextResponse.json(
        {
          limitReached: true,
          message:
            "You have used your 5 free AI interactions today. Upgrade to Pro for unlimited access! 🚀",
        },
        { status: 429 }
      );
    }

    const apiKey = (process.env.GROQ_API_KEY ?? "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI is not configured. Set GROQ_API_KEY in environment." },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: message },
      ],
      max_tokens: 700,
      temperature: 0.5,
    });

    const content = completion.choices?.[0]?.message?.content;
    const reply = typeof content === "string" ? content.trim() : "";
    const finalMessage = reply || "I couldn't generate a response right now. Please try again.";

    if (!isPro) {
      const { error: bumpErr } = await supabase
        .from("profiles")
        .update({ ai_requests_today: requestsToday + 1 })
        .eq("id", user.id);
      if (bumpErr) {
        console.error("chat counter update error:", bumpErr);
      }
    }

    return NextResponse.json({ message: finalMessage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
