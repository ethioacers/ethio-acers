export type RoadmapStatus = "fully_understand" | "medium" | "needs_attention";

export function getTodayRoadmapDay(maxDay: number): number {
  if (maxDay <= 0) return 1;
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayOfYear = Math.floor((current.getTime() - start.getTime()) / 86400000) + 1;
  return ((dayOfYear - 1) % maxDay) + 1;
}

export function getRoadmapStatusLabel(status: RoadmapStatus): string {
  if (status === "fully_understand") return "Fully understand";
  if (status === "medium") return "Medium";
  return "Needs attention";
}
