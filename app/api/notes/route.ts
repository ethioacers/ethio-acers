import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateStudyNotes } from "@/lib/gemini";

export const runtime = "nodejs";

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

    // Resolve subject_id from subjects table
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

    let content: string;
    try {
      content = await generateStudyNotes({
        subject,
        grade: Number(grade),
        topic: topicTrimmed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("generateStudyNotes error:", message, err);
      return NextResponse.json(
        {
          error: "Failed to generate notes",
          message: message || "The AI service is temporarily unavailable.",
        },
        { status: 500 }
      );
    }

    const { data: note, error: insertErr } = await supabase
      .from("notes")
      .insert({
        subject_id: subjectId,
        grade: Number(grade),
        topic: topicTrimmed,
        content,
        is_ai_generated: true,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("notes insert error:", insertErr);
      return NextResponse.json(
        { error: "Failed to save notes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: note.id,
      content,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/notes unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}
