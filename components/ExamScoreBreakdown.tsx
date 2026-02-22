"use client";

import type { Question } from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function getOptionText(question: Question, key: "A" | "B" | "C" | "D"): string {
  const map = { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d };
  return map[key] ?? "";
}

type WrongEntry = {
  index: number;
  question: Question;
  selectedAnswer: "A" | "B" | "C" | "D" | null;
};

type Props = {
  score: number;
  total: number;
  wrongEntries: WrongEntry[];
  onBack: () => void;
};

export function ExamScoreBreakdown({ score, total, wrongEntries, onBack }: Props) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-2">
        <h2 className="text-xl font-bold">Exam complete</h2>
        <p className="text-3xl font-bold">
          {score} / {total}
        </p>
        <p className="text-muted-foreground">{pct}% correct</p>
        <p className="text-sm text-muted-foreground">
          Correct: {score} — Wrong: {total - score}
        </p>
      </div>

      {wrongEntries.length > 0 && (
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-semibold">Questions you got wrong</h3>
          <div className="space-y-6">
            {wrongEntries.map(({ index, question, selectedAnswer }) => (
              <div key={question.id} className="rounded-md border p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Question {index + 1}
                </p>
                <p className="font-medium">{question.question_text}</p>
                <p className="text-sm text-red-600">
                  Your answer: {selectedAnswer ? getOptionText(question, selectedAnswer) : "—"}
                </p>
                <p className="text-sm text-green-600">
                  Correct answer: {getOptionText(question, question.correct_answer)}
                </p>
                {question.explanation && (
                  <p className="text-sm text-muted-foreground">{question.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={onBack} variant="outline">
          Start another session
        </Button>
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
