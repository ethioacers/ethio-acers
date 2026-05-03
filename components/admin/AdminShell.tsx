"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarRange,
  LayoutDashboard,
  StickyNote,
  Users,
} from "lucide-react";
import { AdminOverview } from "@/components/admin/sections/AdminOverview";
import { AdminQuestions } from "@/components/admin/sections/AdminQuestions";
import { AdminUsers } from "@/components/admin/sections/AdminUsers";
import { AdminWeeklyExams } from "@/components/admin/sections/AdminWeeklyExams";
import { AdminNotes } from "@/components/admin/sections/AdminNotes";

export type AdminSection = "overview" | "questions" | "users" | "weekly" | "notes";

const SECTIONS: { id: AdminSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "questions", label: "Questions" },
  { id: "users", label: "Users" },
  { id: "weekly", label: "Weekly Exams" },
  { id: "notes", label: "Notes" },
];

type Props = {
  currentUserId: string;
  showToast: (kind: "success" | "error", text: string) => void;
};

function NavIcon({ section }: { section: AdminSection }) {
  const common = { size: 22, strokeWidth: 1.8 } as const;
  switch (section) {
    case "overview":
      return <LayoutDashboard {...common} aria-hidden />;
    case "questions":
      return <BookOpen {...common} aria-hidden />;
    case "users":
      return <Users {...common} aria-hidden />;
    case "weekly":
      return <CalendarRange {...common} aria-hidden />;
    case "notes":
      return <StickyNote {...common} aria-hidden />;
    default:
      return null;
  }
}

export function AdminShell({ currentUserId, showToast }: Props) {
  const [section, setSection] = useState<AdminSection>("overview");

  return (
    <div className="min-h-screen bg-background pb-24 pt-4 md:pb-10 md:pl-[17rem] md:pt-8">
      <aside className="fixed left-0 top-[3.25rem] z-[80] hidden h-[calc(100vh-3.25rem)] w-[17rem] flex-col border-r border-border/70 bg-background/95 py-6 backdrop-blur-md dark:border-gold/15 md:flex">
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
          <h1 className="mt-1 text-lg font-bold text-gold">Control panel</h1>
          <Link
            href="/dashboard"
            className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            ← Back to app
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={[
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-gold ring-1 ring-gold/25 dark:bg-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                ].join(" ")}
              >
                <NavIcon section={s.id} />
                {s.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <nav
        aria-label="Admin sections"
        className="sticky top-12 z-[78] -mx-4 mb-4 flex gap-2 overflow-x-auto border-b border-border/70 bg-background/95 px-4 py-2.5 backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
      >
        {SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={[
                "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                active
                  ? "bg-primary/15 text-gold ring-1 ring-gold/25"
                  : "bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground",
              ].join(" ")}
            >
              <NavIcon section={s.id} />
              {s.label}
            </button>
          );
        })}
      </nav>

      <div className="mx-auto max-w-6xl px-4">
        {section === "overview" && <AdminOverview showToast={showToast} />}
        {section === "questions" && <AdminQuestions showToast={showToast} />}
        {section === "users" && (
          <AdminUsers currentUserId={currentUserId} showToast={showToast} />
        )}
        {section === "weekly" && <AdminWeeklyExams showToast={showToast} />}
        {section === "notes" && <AdminNotes showToast={showToast} />}
      </div>
    </div>
  );
}
