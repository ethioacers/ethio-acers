import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

export type ExplainInput = {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  subject: string;
};

/** Relaxed safety for educational content to reduce false blocks */
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

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
  // Use Gemini 1.5 Flash on stable v1 API
  const model = genAI.getGenerativeModel(
    { model: "gemini-1.5-flash-latest" },
    { apiVersion: "v1" }
  );

  const prompt = `You are a friendly tutor helping a high school student (Ethiopian curriculum, subject: ${input.subject}).

The student got this question wrong. Explain briefly why the correct answer is right in a simple, student-friendly way (5–4 sentences). Do not be condescending.

Question: ${input.question}
What they chose: ${input.selectedAnswer}
Correct answer: ${input.correctAnswer}

Reply with only the explanation, no labels or extra text.`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    safetySettings: SAFETY_SETTINGS,
  });
  const response = result.response;

  try {
    const text = response.text()?.trim();
    return text || "Sorry, I couldn't generate an explanation right now.";
  } catch {
    // response.text() throws when blocked or empty; check candidates
    const candidates = response.candidates;
    if (candidates?.length) {
      const parts = candidates[0].content?.parts;
      if (parts?.length && "text" in parts[0]) {
        return (parts[0].text as string).trim() || "Sorry, I couldn't generate an explanation right now.";
      }
    }
    const feedback = response.promptFeedback;
    if (feedback?.blockReason) {
      throw new Error(`Response blocked: ${feedback.blockReason}. Try rephrasing the question.`);
    }
    throw new Error("The model returned no text. It may have been blocked by safety filters.");
  }
}

export type StudyNotesInput = {
  subject: string;
  grade: number;
  topic: string;
};

/**
 * Generates study notes for a topic using Gemini.
 * Used only server-side; GEMINI_API_KEY must not be exposed to the client.
 */
export async function generateStudyNotes(input: StudyNotesInput): Promise<string> {
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel(
    { model: "gemini-1.5-flash-latest" },
    { apiVersion: "v1" }
  );

  const prompt = `Write concise study notes for Ethiopian Grade ${input.grade} ${input.subject} students on the topic: ${input.topic}.
Cover key concepts, definitions, and examples. Keep it under 500 words. Use simple language.`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    safetySettings: SAFETY_SETTINGS,
  });
  const response = result.response;

  try {
    const text = response.text()?.trim();
    return text || "Sorry, I couldn't generate notes right now.";
  } catch {
    const candidates = response.candidates;
    if (candidates?.length) {
      const parts = candidates[0].content?.parts;
      if (parts?.length && "text" in parts[0]) {
        return (parts[0].text as string).trim() || "Sorry, I couldn't generate notes right now.";
      }
    }
    throw new Error("The model returned no text. It may have been blocked by safety filters.");
  }
}
