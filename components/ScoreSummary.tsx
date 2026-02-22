"use client";

import { Button } from "@/components/ui/button";

type Props = {
  score: number;
  total: number;
  onLogSession: () => void;
  logging: boolean;
};

export function ScoreSummary({ score, total, onLogSession, logging }: Props) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
      <h2 className="text-xl font-bold">Session complete</h2>
      <p className="text-3xl font-bold">
        {score} / {total}
      </p>
      <p className="text-muted-foreground">{pct}% correct</p>
      <Button onClick={onLogSession} disabled={logging} className="w-full">
        {logging ? "Logging…" : "Log Session"}
      </Button>
    </div>
  );
}
