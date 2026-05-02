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
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/90 p-8 shadow-lg">
      <h2 className="text-2xl font-bold tracking-tight">Session complete</h2>
      <p className="text-4xl font-extrabold tracking-tight text-gold">
        {score} / {total}
      </p>
      <p className="text-muted-foreground">{pct}% correct</p>
      <Button onClick={onLogSession} disabled={logging} className="w-full">
        {logging ? "Logging…" : "Log Session"}
      </Button>
    </div>
  );
}
