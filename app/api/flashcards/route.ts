import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateJsonCompletion } from "@/lib/ai";

export const runtime = "nodejs";

type FlashcardPair = { front: string; back: string };

function buildFlashcardPrompt(subject: string, grade: number, topic: string): string {
  return `Generate 10 flashcards for Ethiopian Grade ${grade} ${subject} students on the topic: ${topic}.

Rules for generating flashcards for Ethio Acers:
Generate 10 flashcards per request. Mix these question types — don't just use 'What is':

Definition: 'What is photosynthesis?'
How: 'How does the sodium-potassium pump work?'
Why: 'Why do enzymes denature at high temperatures?'
Compare: 'What is the difference between mitosis and meiosis?'
Process: 'What are the steps of glycolysis?'
Application: 'How would you calculate the pH of a 0.1M HCl solution?'
True/False reasoning: 'Is glucose a polymer? Explain why.'
Fill in: 'The powerhouse of the cell is ___'
Formula: 'What is the formula for calculating acceleration?'
Example: 'Give an example of a density-dependent limiting factor.'

Rules:

Mix at least 5 different question types per set
Keep fronts concise — one clear question
Keep backs detailed but under 3 sentences
Use LaTeX for equations: $\\\\frac{x+1}{2}$
Ethiopian high school curriculum Grade 9–12

Respond ONLY with a JSON array:
[{"front": "question here", "back": "answer here"}]
No markdown, no extra text, just the JSON array.`;
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

    let body: { subject: string; grade: number; topic: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { subject, grade, topic } = body;
    const topicTrimmed = typeof topic === "string" ? topic.trim() : "";
    if (!subject || !grade || !topicTrimmed) {
      return NextResponse.json(
        { error: "Missing subject, grade, or topic" },
        { status: 400 }
      );
    }

    if (![9, 10, 11, 12].includes(Number(grade))) {
      return NextResponse.json(
        { error: "Grade must be 9, 10, 11, or 12" },
        { status: 400 }
      );
    }

    // Resolve subject_id
    const { data: subjectRow, error: subjErr } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", subject)
      .eq("grade", grade)
      .single();

    if (subjErr || !subjectRow) {
      return NextResponse.json(
        { error: "Subject not found for this grade" },
        { status: 404 }
      );
    }

    const subjectId = subjectRow.id as number;

    // Check existing AI flashcards for this subject/grade/topic
    const { data: existing, error: existingErr } = await supabase
      .from("flashcards")
      .select("*")
      .eq("subject_id", subjectId)
      .eq("grade", grade)
      .eq("chapter", topicTrimmed)
      .eq("is_ai_generated", true)
      .order("created_at", { ascending: false });

    if (existingErr) {
      console.error("flashcards existing check error:", existingErr);
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ flashcards: existing });
    }

    // Generate via Groq using a strict JSON-only prompt
    const prompt = buildFlashcardPrompt(subject, Number(grade), topicTrimmed);

    let jsonText: string;
    try {
      jsonText = await generateJsonCompletion(prompt);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("flashcards Groq generate error:", message, err);
      return NextResponse.json(
        {
          error: "Failed to generate flashcards",
          message: message || "The AI service is temporarily unavailable.",
        },
        { status: 500 }
      );
    }

    function extractJsonArray(text: string): string {
      const start = text.indexOf("[");
      const end = text.lastIndexOf("]");
      if (start === -1 || end === -1 || end <= start) return text;
      return text.slice(start, end + 1);
    }

    let parsed: FlashcardPair[];
    try {
      const cleaned = extractJsonArray(jsonText);
      parsed = JSON.parse(cleaned) as FlashcardPair[];
      if (!Array.isArray(parsed)) {
        throw new Error("Response is not an array");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("flashcards JSON parse error:", message, jsonText);
      return NextResponse.json(
        {
          error: "Invalid AI response format",
          message: "AI did not respond with a valid JSON array of flashcards.",
        },
        { status: 500 }
      );
    }

    const rows = parsed
      .filter((p) => p.front && p.back)
      .slice(0, 10)
      .map((p) => ({
        subject_id: subjectId,
        grade: Number(grade),
        chapter: topicTrimmed,
        front: p.front,
        back: p.back,
        is_ai_generated: true,
      }));

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid flashcards generated" },
        { status: 500 }
      );
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("flashcards")
      .insert(rows)
      .select("*");

    if (insertErr) {
      console.error("flashcards insert error:", insertErr);
      return NextResponse.json(
        { error: "Failed to save flashcards" },
        { status: 500 }
      );
    }

    return NextResponse.json({ flashcards: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/flashcards unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}

