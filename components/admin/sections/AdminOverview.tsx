"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { AdminSpinner } from "@/components/admin/AdminSpinner";

function todayLocalDateStr(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type Stats = {
  totalUsers: number;
  totalQuestions: number;
  totalProUsers: number;
  sessionsToday: number;
  totalNotes: number;
  totalWeeklyExams: number;
};

type Props = {
  showToast: (kind: "success" | "error", text: string) => void;
};

export function AdminOverview({ showToast }: Props) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const today = todayLocalDateStr();

      const [
        usersRes,
        proRes,
        qRes,
        sessRes,
        notesRes,
        weeklyRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_pro", true),
        supabase.from("questions").select("*", { count: "exact", head: true }),
        supabase.from("sessions").select("*", { count: "exact", head: true }).eq("session_date", today),
        supabase.from("notes").select("*", { count: "exact", head: true }),
        supabase.from("weekly_exams").select("*", { count: "exact", head: true }),
      ]);

      const err =
        usersRes.error ||
        proRes.error ||
        qRes.error ||
        sessRes.error ||
        notesRes.error ||
        weeklyRes.error;
      if (err) {
        showToast("error", err.message);
        return;
      }

      setStats({
        totalUsers: usersRes.count ?? 0,
        totalProUsers: proRes.count ?? 0,
        totalQuestions: qRes.count ?? 0,
        sessionsToday: sessRes.count ?? 0,
        totalNotes: notesRes.count ?? 0,
        totalWeeklyExams: weeklyRes.count ?? 0,
      });
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Failed to load stats.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !stats) {
    return <AdminSpinner label="Loading overview…" />;
  }

  const cards = [
    { label: "Total users", value: stats?.totalUsers ?? 0 },
    { label: "Total questions", value: stats?.totalQuestions ?? 0 },
    { label: "Total pro users", value: stats?.totalProUsers ?? 0 },
    { label: "Sessions today", value: stats?.sessionsToday ?? 0 },
    { label: "Total notes", value: stats?.totalNotes ?? 0 },
    { label: "Total weekly exams", value: stats?.totalWeeklyExams ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gold">Overview</h2>
          <p className="text-sm text-muted-foreground">Snapshot of your platform.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-border/80 bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-50 dark:border-gold/20"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border/70 bg-card/50 p-5 shadow-sm backdrop-blur-sm dark:border-gold/15 dark:bg-card/70"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-foreground">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
