import Groq from "groq-sdk";

export type ExplainInput = {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  subject: string;
};

export type StudyNotesInput = {
  subject: string;
  grade: number;
  topic: string;
};

function createGroqClient() {
  const apiKey = (process.env.GROQ_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set in environment");
  }
  return new Groq({ apiKey });
}

export async function explainAnswer(input: ExplainInput): Promise<string> {
  const groq = createGroqClient();

  const prompt = `You are a friendly tutor helping a high school student (Ethiopian curriculum, subject: ${input.subject}).

The student got this question wrong. Explain briefly why the correct answer is right in a simple, student-friendly way (5–4 sentences). Do not be condescending.

Question: ${input.question}
What they chose: ${input.selectedAnswer}
Correct answer: ${input.correctAnswer}

Reply with only the explanation, no labels or extra text.`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
  });

  const content = response.choices?.[0]?.message?.content ?? "";
  const text = typeof content === "string" ? content.trim() : "";
  return text || "Sorry, I couldn't generate an explanation right now.";
}

export async function generateStudyNotes(input: StudyNotesInput): Promise<string> {
  const groq = createGroqClient();

  const prompt = `Write concise study notes for Ethiopian Grade ${input.grade} ${input.subject} students on the topic: ${input.topic}.
Cover key concepts, definitions, and examples. Keep it under 500 words. Use simple language.
Format the output in Markdown: use ## for section headings, - for bullet points, **bold** for key terms, and line breaks between paragraphs.`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
  });

  const content = response.choices?.[0]?.message?.content ?? "";
  const text = typeof content === "string" ? content.trim() : "";
  return text || "Sorry, I couldn't generate notes right now.";
}

export async function generateJsonCompletion(prompt: string): Promise<string> {
  const groq = createGroqClient();
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
  });
  const content = response.choices?.[0]?.message?.content ?? "";
  return typeof content === "string" ? content.trim() : "";
}


