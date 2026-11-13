import { normalizePriority, normalizeStatus, type Category, type Drawing, type Part } from "./manufacturing";

export type MondayColumn = {
  id: string; text: string | null; value?: string | null;
  files?: { name?: string; asset_id?: string; asset?: { id: string; public_url?: string | null; file_extension?: string | null } }[];
};
export type MondayItem = { id: string; name: string; column_values: MondayColumn[] };
export type ColumnMap = { category: string; status: string; priority: string; drawing: string; completed: string; description?: string; quantity?: string; drawingStatus?: string; assignee?: string };
export type MondayBoardColumn = {
  id: string; title: string; type: string;
  settings?: { labels?: { id: number; label: string; is_deactivated?: boolean }[] };
};

export function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : null; } catch { return null; }
}

export function readMondayDate(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "null");
    if (!parsed || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) return null;
    const date = `${parsed.date}T${parsed.time || "00:00:00"}Z`;
    const result = new Date(date);
    return Number.isFinite(result.getTime()) && result.toISOString().slice(0, 10) === parsed.date ? result.toISOString() : null;
  } catch { return null; }
}

export function mapMondayItem(item: MondayItem, columns: ColumnMap): Part {
  const column = (id: string | undefined) => item.column_values.find((value) => value.id === id);
  const text = (id: string | undefined) => column(id)?.text?.trim() || "";
  const categories: Record<string, Category> = {
    "manual lathe": "Manual Lathe", "manual lathe parts": "Manual Lathe",
    lathe: "Manual Lathe",
    "manual mill": "Manual Mill", "manual mill parts": "Manual Mill",
    "cnc mill": "CNC Mill", "cnc mill parts": "CNC Mill",
    "cnc router": "CNC Router", "cnc router parts": "CNC Router",
    "3d printed": "3D Printed", "3d printed parts": "3D Printed", "3dp": "3D Printed",
    "3d printer": "3D Printed",
  };
  const quantityText = text(columns.quantity);
  const quantity = quantityText ? Number(quantityText) : NaN;
  const drawings: Drawing[] = [];
  for (const file of column(columns.drawing)?.files ?? []) {
    const asset = file.asset;
    const url = safeHttpsUrl(asset?.public_url);
    if (url && (asset?.file_extension?.replace(/^\./, "").toLowerCase() === "pdf" || file.name?.toLowerCase().endsWith(".pdf"))) {
      drawings.push({ id: asset?.id ?? file.asset_id ?? file.name ?? "drawing", name: file.name || "Part drawing.pdf", url });
    }
  }
  return {
    id: item.id, name: item.name,
    category: categories[text(columns.category).toLowerCase()] || "Uncategorized",
    status: normalizeStatus(text(columns.status)),
    sourceStatus: text(columns.status),
    priority: normalizePriority(text(columns.priority)), sourcePriority: text(columns.priority),
    description: text(columns.description), quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : null,
    drawingStatus: text(columns.drawingStatus), assignee: text(columns.assignee), completedAt: readMondayDate(column(columns.completed)?.value), drawings,
  };
}
