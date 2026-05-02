"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LatexRenderer } from "@/components/LatexRenderer";

export type Question = {
  id: number;
  subject_id: number;
  grade: number;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string | null;
  year: number | null;
  chapter?: string | null;
};

type Props = {
  question: Question;
  questionNumber: number;
  total: number;
  onSelect: (answer: "A" | "B" | "C" | "D") => void;
  selectedAnswer: "A" | "B" | "C" | "D" | null;
  showResult: boolean;
  isCorrect: boolean | null;
  subject?: string;
  /** When true, no instant feedback or AI explain — used in Full Exam Mode */
  examMode?: boolean;
};

function getOptionText(question: Question, key: "A" | "B" | "C" | "D"): string {
  const map = { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d };
  return map[key] ?? "";
}

export function QuestionCard({
  question,
  questionNumber,
  total,
  onSelect,
  selectedAnswer,
  showResult,
  isCorrect,
  subject = "General",
  examMode = false,
}: Props) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const options = [
    { key: "A" as const, text: question.option_a },
    { key: "B" as const, text: question.option_b },
    { key: "C" as const, text: question.option_c },
    { key: "D" as const, text: question.option_d },
  ].filter((o) => o.text);

  const showFeedback = showResult && !examMode;

  return (
    <div className="space-y-6 rounded-2xl border border-border/70 bg-card/90 p-6 shadow-lg">
      <p className="text-sm text-muted-foreground">
        Question {questionNumber} of {total}
      </p>
      <p className="text-base font-medium sm:text-lg">
        <LatexRenderer text={question.question_text} />
      </p>
      <div className="space-y-2">
        {options.map(({ key, text }) => {
          const chosen = selectedAnswer === key;
          const correct = question.correct_answer === key;
          let style = "border border-input bg-background/90 text-foreground hover:border-primary/60";
          if (showFeedback) {
            if (correct) style = "border-green-500 bg-green-500/10 text-foreground";
            else if (chosen && !correct) style = "border-red-500 bg-red-500/10 text-foreground";
          } else if (examMode && chosen) {
            style = "border-primary bg-primary/10 text-foreground shadow-sm";
          } else if (!examMode && chosen) {
            style = "border-primary bg-accent/70 text-foreground";
          }
          return (
            <button
              key={key}
              type="button"
              disabled={showFeedback}
              onClick={() => onSelect(key)}
              className={`min-h-[44px] w-full rounded-xl px-4 py-3 text-left text-sm transition-colors sm:text-base ${style}`}
            >
              <span className="font-medium">{key}.</span> <LatexRenderer text={text ?? ""} />
            </button>
          );
        })}
      </div>
      {showFeedback && (
        <div className="space-y-2 rounded-xl border border-border/70 bg-background/30 p-4">
          <p className="text-sm font-medium">
            {isCorrect ? (
              <span className="text-green-600">✅ Correct</span>
            ) : (
              <span className="text-red-600">❌ Incorrect</span>
            )}
          </p>
          {question.explanation && (
            <p className="text-sm text-muted-foreground">
              <LatexRenderer text={question.explanation} />
            </p>
          )}
          {!isCorrect && subject && (
            <div className="mt-3 space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={aiLoading}
                onClick={async () => {
                  setAiError(null);
                  setAiExplanation(null);
                  setAiLoading(true);
                  try {
                    const res = await fetch("/api/ai", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        question: question.question_text,
                        selectedAnswer: selectedAnswer ? getOptionText(question, selectedAnswer) : "",
                        correctAnswer: getOptionText(question, question.correct_answer),
                        subject,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      if (res.status === 429) {
                        setAiError(data.message ?? "You've used your 5 free explanations today. Come back tomorrow!");
                      } else {
                        const msg = data.message || data.error || "Something went wrong.";
                        setAiError(msg);
                      }
                      return;
                    }
                    setAiExplanation(data.explanation ?? "");
                  } catch {
                    setAiError("Could not load explanation.");
                  } finally {
                    setAiLoading(false);
                  }
                }}
              >
                {aiLoading ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" aria-hidden />
                    Loading…
                  </>
                ) : (
                  "Explain this ✨"
                )}
              </Button>
              {aiExplanation && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">AI tutor</p>
                  <p className="text-sm">
                    <LatexRenderer text={aiExplanation} />
                  </p>
                </div>
              )}
              {aiError && (
                <p className="text-sm text-amber-600">{aiError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
