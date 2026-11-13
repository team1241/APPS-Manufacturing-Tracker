import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

const columns = [
  { id: "category", title: "Category", type: "status" },
  { id: "state", title: "Status", type: "status", settings: { labels: [
    { id: 0, label: "Working on it" }, { id: 1, label: "Done" }, { id: 2, label: "Stuck" }, { id: 3, label: "Saw Cut" }, { id: 4, label: "Pending" }, { id: 5, label: "Final Machining" },
  ] } },
  { id: "priority", title: "Priority", type: "status", settings: { labels: [
    { id: 0, label: "Low" }, { id: 1, label: "High" }, { id: 2, label: "Critical" }, { id: 3, label: "Medium", index: 2 }, { id: 5, label: "" },
  ] } },
  { id: "files", title: "Files", type: "file" },
  { id: "completed", title: "Completed Date", type: "date" },
];
const item = { id: "12", name: "Shaft A", column_values: [{ id: "category", text: "MANUAL LATHE" }, { id: "state", text: "Pending" }, { id: "priority", text: "" }] };
const board = { id: "100", name: "Mfg/Mech Tracker", columns, items_page: { cursor: null, items: [item] } };
const testEnv = {
  MONDAY_API_TOKEN: "test-token", MONDAY_BOARD_ID: "100", MONDAY_CATEGORY_COLUMN_ID: "category", MONDAY_STATUS_COLUMN_ID: "state",
  MONDAY_PRIORITY_COLUMN_ID: "priority", MONDAY_DRAWING_COLUMN_ID: "files", MONDAY_COMPLETED_COLUMN_ID: "completed",
  MONDAY_POLL_SECONDS: "300", MONDAY_API_VERSION: "2026-10",
};
const optionalKeys = ["MONDAY_ASSIGNEE_COLUMN_ID", "MONDAY_DESCRIPTION_COLUMN_ID", "MONDAY_QUANTITY_COLUMN_ID", "MONDAY_DRAWING_STATUS_COLUMN_ID", "MONDAY_NOTES_BOARD_ID", "MONDAY_NOTES_DATE_COLUMN_ID"];
const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
let revision = 0;
const monday = () => import(`../src/lib/monday.ts?test=${++revision}`);
const response = (data) => Response.json({ data });

beforeEach(() => {
  for (const key of optionalKeys) delete process.env[key];
  Object.assign(process.env, testEnv);
  globalThis.fetch = async () => { throw new Error("Unexpected request in test"); };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of [...Object.keys(testEnv), ...optionalKeys]) {
    if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key];
  }
});

test("live loading needs five mappings and shares cached read-only queries", async () => {
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    assert.equal(options.headers.Authorization, "test-token");
    assert.equal(options.headers["API-Version"], "2026-10");
    assert.ok(JSON.parse(options.body).query.startsWith("query"));
    return response({ boards: [board] });
  };
  const api = await monday();
  const [first, second] = await Promise.all([api.getMondayBoard(), api.getMondayBoard()]);
  assert.equal(calls, 1);
  assert.equal(first, second);
  assert.equal(first.parts[0].status, "Ready");
  assert.equal(first.parts[0].sourcePriority, "");
  assert.equal(JSON.stringify(first).includes("test-token"), false);
  await api.getMondayBoard(true);
  assert.equal(calls, 1, "manual refresh respects the cooldown");
});

test("pagination includes every active item before calculating totals", async () => {
  globalThis.fetch = async (_url, options) => {
    const { query, variables } = JSON.parse(options.body);
    if (query.includes("next_items_page")) {
      assert.equal(variables.cursor, "next-page");
      return response({ next_items_page: { cursor: null, items: [{ ...item, id: "13" }] } });
    }
    return response({ boards: [{ ...board, items_page: { ...board.items_page, cursor: "next-page" } }] });
  };
  const data = await (await monday()).getMondayBoard();
  assert.deepEqual(data.parts.map((part) => part.id), ["12", "13"]);
});

test("the optional assignee mapping supports People and Text columns but rejects other types", async () => {
  process.env.MONDAY_ASSIGNEE_COLUMN_ID = "assigned";
  for (const type of ["people", "text", "numbers"]) {
    globalThis.fetch = async () => response({ boards: [{ ...board,
      columns: [...columns, { id: "assigned", title: "People", type }],
      items_page: { cursor: null, items: [{ ...item, column_values: [...item.column_values, { id: "assigned", text: "Alex Chen, Sam Patel" }] }] },
    }] });
    const api = await monday();
    if (type === "numbers") await assert.rejects(api.getMondayBoard(), /assignee mapping must reference a people or text column/);
    else assert.equal((await api.getMondayBoard()).parts[0].assignee, "Alex Chen, Sam Patel");
  }
});

test("invalid mapped types and duplicate mappings produce actionable errors", async () => {
  process.env.MONDAY_PRIORITY_COLUMN_ID = "state";
  await assert.rejects((await monday()).getMondayBoard(), /different column/);
  process.env.MONDAY_PRIORITY_COLUMN_ID = "priority";
  globalThis.fetch = async () => response({ boards: [{ ...board, columns: columns.map((column) => column.id === "completed" ? { ...column, type: "text" } : column) }] });
  await assert.rejects((await monday()).getMondayBoard(), /completed mapping must reference a date/);
});

test("rate-limit responses surface as retryable errors", async () => {
  globalThis.fetch = async () => new Response(null, { status: 429 });
  await assert.rejects((await monday()).getMondayBoard(), { status: 429 });
  globalThis.fetch = async () => Response.json({ errors: [{ message: "Quota exceeded", extensions: { code: "DAILY_LIMIT_EXCEEDED" } }] });
  await assert.rejects((await monday()).getMondayBoard(), { status: 429 });
});

test("Monday adapter exposes no write operation or edit credentials", async () => {
  const api = await monday();
  assert.equal("updateMondayPart" in api, false);
  assert.equal("validShopKey" in api, false);
  globalThis.fetch = async (_url, options) => {
    assert.ok(JSON.parse(options.body).query.startsWith("query"));
    return response({ boards: [board] });
  };
  const data = await api.getMondayBoard();
  assert.equal("writable" in data, false);
});

test("drawing route streams board PDFs inline, supports ranges, and rejects arbitrary assets", async () => {
  const { GET } = await import("../src/app/api/drawings/[assetId]/route.ts");
  const fileUrl = "https://files.example.com/shaft.pdf?signed=test";
  const pdf = "%PDF-1.7\nDrawing bytes";
  let downloads = 0;
  let failDownload = false;
  globalThis.fetch = async (url, options) => {
    if (url === "https://api.monday.com/v2") return response({ boards: [{ ...board, items_page: { cursor: null, items: [{ ...item, column_values: [...item.column_values, { id: "files", text: "Shaft.pdf", files: [{ name: "Shaft.pdf", asset: { id: "700", public_url: fileUrl, file_extension: "pdf" } }] }] }] } }] });
    assert.equal(url, fileUrl);
    assert.equal(options.headers.Authorization, undefined);
    downloads++;
    if (failDownload) throw new Error("Upstream failed with a signed URL that must not leak");
    if (options.headers.Range === "bytes=999-") return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${pdf.length}` } });
    const partial = Boolean(options.headers.Range);
    return new Response(partial ? pdf.slice(0, 4) : pdf, { status: partial ? 206 : 200, headers: { "Content-Type": "application/octet-stream", "Content-Disposition": "attachment", "Accept-Ranges": "bytes", ...(partial ? { "Content-Range": `bytes 0-3/${pdf.length}` } : {}) } });
  };
  const context = (assetId) => ({ params: Promise.resolve({ assetId }) });
  const request = (range) => new Request("http://localhost/api/drawings/700?url=https://untrusted.example", { headers: range ? { Range: range } : {} });
  const full = await GET(request(), context("700"));
  assert.equal(full.status, 200);
  assert.equal(full.headers.get("Content-Type"), "application/pdf");
  assert.match(full.headers.get("Content-Disposition"), /^inline;/);
  assert.equal(await full.text(), pdf);
  const partial = await GET(request("bytes=0-3"), context("700"));
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get("Content-Range"), `bytes 0-3/${pdf.length}`);
  assert.equal(await partial.text(), "%PDF");
  assert.equal((await GET(request(), context("999"))).status, 404);
  assert.equal((await GET(request(), context("https://untrusted.example"))).status, 404);
  for (const range of ["bytes=-", "bytes=0-1,4-5", "invalid"]) assert.equal((await GET(request(range), context("700"))).status, 416);
  assert.equal(downloads, 2);
  const unsatisfied = await GET(request("bytes=999-"), context("700"));
  assert.equal(unsatisfied.status, 416);
  assert.equal(unsatisfied.headers.get("Content-Range"), `bytes */${pdf.length}`);
  failDownload = true;
  const failed = await GET(request(), context("700"));
  assert.equal(failed.status, 502);
  assert.equal((await failed.text()).includes("signed URL"), false);
});
