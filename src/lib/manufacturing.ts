export const CATEGORIES = [
  "Manual Lathe", "Manual Mill", "CNC Mill", "CNC Router", "3D Printed",
] as const;
export type Category = (typeof CATEGORIES)[number] | "Uncategorized";
export const STATUSES = ["Ready", "In progress", "Blocked", "Completed"] as const;
export type PartStatus = (typeof STATUSES)[number] | "Unknown";
export const PRIORITIES = ["Critical", "High", "Normal", "Low"] as const;
export type Priority = (typeof PRIORITIES)[number];
export type Drawing = { id: string; name: string; url: string };
export type Part = {
  id: string;
  name: string;
  category: Category;
  status: PartStatus;
  sourceStatus?: string;
  priority: Priority;
  sourcePriority?: string;
  description: string;
  quantity: number | null;
  drawingStatus: string;
  assignee: string;
  completedAt: string | null;
  drawings: Drawing[];
};
export type ShopNote = { id: string; text: string; date: string | null };
export type BoardData = {
  source: "demo" | "monday";
  name: string;
  parts: Part[];
  notes: ShopNote[];
  fetchedAt: string;
  retentionHours: number;
  refreshSeconds: number;
  warnings: string[];
};

export function normalizeStatus(value: string): PartStatus {
  const statuses: Record<string, PartStatus> = {
    "": "Ready", ready: "Ready", pending: "Ready", "not started": "Ready", "saw cut": "Ready",
    "in progress": "In progress", "working on it": "In progress", "final machining": "In progress",
    blocked: "Blocked", stuck: "Blocked", completed: "Completed", done: "Completed",
  };
  return statuses[value.trim().toLowerCase()] ?? "Unknown";
}

export function normalizePriority(value: string): Priority {
  const priorities: Record<string, Priority> = { critical: "Critical", high: "High", normal: "Normal", medium: "Normal", low: "Low" };
  return priorities[value.trim().toLowerCase()] ?? "Normal";
}

const priorityRank: Record<Priority, number> = { Critical: 0, High: 1, Normal: 2, Low: 3 };
export function sortParts(parts: Part[]) {
  return [...parts].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.name.localeCompare(b.name));
}

export function recentCompletions(parts: Part[], hours: number, now = Date.now()) {
  return parts.filter((part) => {
    if (part.status !== "Completed" || !part.completedAt) return false;
    const age = now - Date.parse(part.completedAt);
    return Number.isFinite(age) && age >= 0 && age <= hours * 3_600_000;
  }).sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));
}

export function robotProgress(parts: Part[]) {
  const completed = parts.filter((part) => part.status === "Completed").length;
  const active = parts.filter((part) => part.status === "In progress").length;
  return { total: parts.length, completed, active, percent: parts.length ? Math.round(completed / parts.length * 100) : 0 };
}

export function searchParts(parts: Part[], query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return parts;
  return parts.filter((part) => {
    const text = [part.name, part.description, part.category, part.status, part.sourceStatus,
      part.priority, part.sourcePriority, part.drawingStatus, part.quantity, part.assignee,
      ...part.drawings.map((drawing) => drawing.name)].join(" ").toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
