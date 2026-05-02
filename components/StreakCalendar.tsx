"use client";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function getLast7Days(): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().split("T")[0]);
  }
  return out;
}

type Props = {
  sessionDates: string[];
};

export function StreakCalendar({ sessionDates }: Props) {
  const last7 = getLast7Days();
  const set = new Set(sessionDates);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Last 7 days
      </p>
      <div className="flex gap-2">
        {last7.map((dateStr) => {
          const done = set.has(dateStr);
          const dayNum = new Date(dateStr).getDate();
          const dayLabel = DAY_LABELS[new Date(dateStr).getDay()];
          return (
            <div
              key={dateStr}
              className="flex flex-col items-center gap-0.5"
              title={dateStr}
            >
              <span className="text-[10px] text-muted-foreground">
                {dayLabel}
              </span>
              <div
                className={`h-8 w-8 rounded-lg border ${
                  done ? "border-emerald-400/60 bg-emerald-500/80 shadow-sm" : "border-border bg-muted/80"
                }`}
                aria-label={done ? "Done" : "Missed"}
              />
              <span className="text-xs text-muted-foreground">{dayNum}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
