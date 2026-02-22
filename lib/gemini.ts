import { GoogleGenerativeAI } from "@google/generative-ai";

export type ExplainInput = {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  subject: string;
};

/**
 * Calls Gemini to explain why the correct answer is right.
 * Used only server-side (API route); GEMINI_API_KEY must not be exposed to the client.
 */
export async function explainAnswer(input: ExplainInput): Promise<string> {
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use Flash-Lite for better free-tier quota (15 RPM, 1000 RPD); fallback to 2.5 Flash if needed
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const prompt = `You are a friendly tutor helping a high school student (Ethiopian curriculum, subject: ${input.subject}).

The student got this question wrong. Explain briefly why the correct answer is right in a simple, student-friendly way (2–4 sentences). Do not be condescending.

Question: ${input.question}
What they chose: ${input.selectedAnswer}
Correct answer: ${input.correctAnswer}

Reply with only the explanation, no labels or extra text.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  // .text() is a method; it throws if the prompt or candidate was blocked
  const text = response.text().trim();
  return text || "Sorry, I couldn't generate an explanation right now.";
}
