// Imported only by server route handlers. Never expose these environment values to client components.
import "server-only";
import type { BoardData } from "./manufacturing";
import { mapMondayItem, readMondayDate, type ColumnMap, type MondayBoardColumn, type MondayItem } from "./monday-mapping";

const API = "https://api.monday.com/v2";
export class IntegrationError extends Error {
  status: number;
  constructor(message: string, status = 502) { super(message); this.status = status; }
}

export function mondayConfigured() {
  return Boolean(process.env.MONDAY_API_TOKEN?.trim() || process.env.MONDAY_BOARD_ID?.trim());
}

function positiveNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function config() {
  const token = process.env.MONDAY_API_TOKEN?.trim();
  const boardId = process.env.MONDAY_BOARD_ID?.trim();
  if (!token || !boardId || !/^\d+$/.test(boardId)) throw new IntegrationError("Set MONDAY_API_TOKEN and a numeric MONDAY_BOARD_ID in .env.local, then restart the app.", 503);
  const columns: ColumnMap = {
    category: process.env.MONDAY_CATEGORY_COLUMN_ID?.trim() || "",
    status: process.env.MONDAY_STATUS_COLUMN_ID?.trim() || "",
    priority: process.env.MONDAY_PRIORITY_COLUMN_ID?.trim() || "",
    drawing: process.env.MONDAY_DRAWING_COLUMN_ID?.trim() || "",
    completed: process.env.MONDAY_COMPLETED_COLUMN_ID?.trim() || "",
    description: process.env.MONDAY_DESCRIPTION_COLUMN_ID?.trim() || undefined,
    quantity: process.env.MONDAY_QUANTITY_COLUMN_ID?.trim() || undefined,
    drawingStatus: process.env.MONDAY_DRAWING_STATUS_COLUMN_ID?.trim() || undefined,
    assignee: process.env.MONDAY_ASSIGNEE_COLUMN_ID?.trim() || undefined,
  };
  if ([columns.category, columns.status, columns.priority, columns.drawing, columns.completed].some((id) => !id)) throw new IntegrationError("Configure the Category, Status, Priority, Files, and Completed Date column IDs. Run npm run monday:inspect to find the IDs.", 503);
  const mappedIds = Object.values(columns).filter(Boolean);
  if (new Set(mappedIds).size !== mappedIds.length) throw new IntegrationError("Each Monday column mapping must point to a different column.", 503);
  return {
    token, boardId, columns,
    version: process.env.MONDAY_API_VERSION || "2026-10",
    retentionHours: positiveNumber(process.env.COMPLETED_RETENTION_HOURS, 48, 1, 720),
    refreshSeconds: positiveNumber(process.env.MONDAY_POLL_SECONDS, 300, 60, 3600),
  };
}

async function request<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const { token, version } = config();
  let response: Response;
  try {
    response = await fetch(API, {
      method: "POST", headers: { Authorization: token, "Content-Type": "application/json", "API-Version": version },
      body: JSON.stringify({ query, variables }), cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
  } catch { throw new IntegrationError("Monday could not be reached. Check the connection and try again."); }
  if (response.status === 429) throw new IntegrationError("Monday’s API limit was reached. Wait before refreshing or increase MONDAY_POLL_SECONDS.", 429);
  if (!response.ok) throw new IntegrationError(`Monday returned HTTP ${response.status}. Check the API token and board permissions.`);
  const payload = await response.json() as { data?: T; errors?: { message: string; extensions?: { code?: string } }[] };
  if (payload.errors?.length || !payload.data) {
    const rateLimited = payload.errors?.some((error) => /limit|complexity/i.test(error.extensions?.code || error.message));
    throw new IntegrationError(rateLimited ? "Monday’s API limit was reached. Wait before trying again." : "Monday rejected the request. Check board access, column IDs, column types, status labels, and API version.", rateLimited ? 429 : 502);
  }
  return payload.data;
}

const ITEM_FIELDS = `id name column_values { id text value ... on FileValue { files { ... on FileAssetValue { name asset_id asset { id public_url file_extension } } } } }`;
type RawBoard = { id: string; name: string; columns: MondayBoardColumn[]; items_page: { cursor: string | null; items: MondayItem[] } };

function validateColumns(boardColumns: MondayBoardColumn[], columns: ColumnMap) {
  const types: Record<keyof ColumnMap, string[]> = { category: ["status"], status: ["status"], priority: ["status"], drawing: ["file"], completed: ["date"], description: ["long_text"], quantity: ["numbers"], drawingStatus: ["status"], assignee: ["people", "text"] };
  for (const key of Object.keys(types) as (keyof ColumnMap)[]) {
    if (!columns[key]) continue;
    const column = boardColumns.find((value) => value.id === columns[key]);
    if (!column || !types[key].includes(column.type)) throw new IntegrationError(`The ${key} mapping must reference a ${types[key].join(" or ")} column. Run npm run monday:inspect and update .env.local.`, 503);
  }
}

async function readBoard(boardId: string) {
  const first = await request<{ boards: RawBoard[] }>(`query ($ids: [ID!]!) { boards(ids: $ids) { id name columns { id title type } items_page(limit: 500) { cursor items { ${ITEM_FIELDS} } } } }`, { ids: [boardId] });
  const board = first.boards[0];
  if (!board) throw new IntegrationError("The Monday board is missing or the token’s user cannot access it.", 503);
  const items = [...board.items_page.items];
  let cursor = board.items_page.cursor;
  let pages = 1;
  while (cursor) {
    if (++pages > 50) throw new IntegrationError("Board exceeds 25,000 items. Use a dedicated manufacturing board rather than showing partial totals.");
    const next = await request<{ next_items_page: { cursor: string | null; items: MondayItem[] } }>(`query ($cursor: String!) { next_items_page(limit: 500, cursor: $cursor) { cursor items { ${ITEM_FIELDS} } } }`, { cursor });
    items.push(...next.next_items_page.items);
    cursor = next.next_items_page.cursor;
  }
  return { ...board, items };
}

let cached: { data: BoardData; expires: number } | null = null;
let pending: Promise<BoardData> | null = null;

async function loadBoard(): Promise<BoardData> {
  const cfg = config();
  const board = await readBoard(cfg.boardId);
  validateColumns(board.columns, cfg.columns);
  const parts = board.items.map((item) => mapMondayItem(item, cfg.columns));
  const warnings: string[] = [];
  if (parts.some((part) => part.category === "Uncategorized")) warnings.push("Some parts have no recognized category. They are listed under Uncategorized.");
  if (parts.some((part) => part.status === "Unknown")) warnings.push("Some status labels have no queue mapping. These parts remain visible in their category with their original status.");
  const notes: BoardData["notes"] = [];
  if (process.env.MONDAY_NOTES_BOARD_ID) {
    try {
      const noteBoard = await readBoard(process.env.MONDAY_NOTES_BOARD_ID);
      for (const item of noteBoard.items) notes.push({ id: item.id, text: item.name, date: readMondayDate(item.column_values.find((column) => column.id === process.env.MONDAY_NOTES_DATE_COLUMN_ID)?.value) });
      notes.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
    } catch { warnings.push("The notes board could not be loaded. Check its ID, token access, and API quota."); }
  }
  return {
    name: board.name, source: "monday", parts, notes, fetchedAt: new Date().toISOString(),
    retentionHours: cfg.retentionHours, refreshSeconds: cfg.refreshSeconds, warnings,
  };
}

export async function getMondayBoard(force = false) {
  // Manual refresh bypasses the polling cache, with a shared 10-second cooldown.
  if (cached && cached.expires > Date.now() && (!force || Date.now() - Date.parse(cached.data.fetchedAt) < 10_000)) return cached.data;
  if (!pending) {
    const task = loadBoard().then((data) => {
      cached = { data, expires: Date.now() + data.refreshSeconds * 1000 };
      return data;
    }).finally(() => { if (pending === task) pending = null; });
    pending = task;
  }
  return pending;
}
