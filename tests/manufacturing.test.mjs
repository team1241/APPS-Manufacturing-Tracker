import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStatus, recentCompletions, robotProgress, searchParts, sortParts } from "../src/lib/manufacturing.ts";
import { mapMondayItem, readMondayDate, safeHttpsUrl } from "../src/lib/monday-mapping.ts";

const now = new Date("2026-11-10T18:00:00Z");
const part = { id: "12", name: "Shaft A", category: "Manual Lathe", status: "Ready", priority: "Normal", description: "Shaft", quantity: 2, drawingStatus: "Released", completedAt: null, drawings: [] };
const columns = { category: "cat", status: "state", priority: "prio", drawing: "file", completed: "done", description: "desc", quantity: "qty", drawingStatus: "drawing-state" };

test("higher priority parts come first without mutating the source array", () => {
  const parts = [{ ...part, priority: "Low" }, { ...part, priority: "High" }, { ...part, priority: "Critical" }, part];
  assert.deepEqual(sortParts(parts).map((p) => p.priority), ["Critical", "High", "Normal", "Low"]);
  assert.equal(parts[0].priority, "Low");
});

test("recent ticker excludes old, future, missing, invalid dates and reopened parts", () => {
  const completed = (id, date) => ({ ...part, id, status: "Completed", completedAt: date });
  const parts = [completed("recent", "2026-11-10T17:00:00Z"), completed("older", "2026-11-09T12:00:00Z"), completed("expired", "2026-11-08T17:59:00Z"), completed("future", "2026-11-11T18:00:00Z"), completed("missing", null), completed("invalid", "no date"), { ...part, completedAt: now.toISOString() }];
  assert.deepEqual(recentCompletions(parts, 48, now.getTime()).map((p) => p.id), ["recent", "older"]);
});

test("robot progress includes completions older than the ticker window", () => {
  const parts = [{ ...part, status: "Completed", completedAt: "2026-01-01T00:00:00Z" }, { ...part, status: "In progress" }, part, { ...part, status: "Blocked" }];
  assert.deepEqual(robotProgress(parts), { total: 4, completed: 1, active: 1, percent: 25 });
  assert.deepEqual(robotProgress([]), { total: 0, completed: 0, active: 0, percent: 0 });
});

test("Monday date values are interpreted as UTC and malformed values are rejected", () => {
  assert.equal(readMondayDate('{"date":"2026-11-10","time":"13:14:15"}'), "2026-11-10T13:14:15.000Z");
  assert.equal(readMondayDate('{"date":"2026-11-10"}'), "2026-11-10T00:00:00.000Z");
  for (const value of [null, "not json", "{}", '{"date":"bad"}', '{"date":"2026-02-30"}', '{"date":"2026-11-10","time":"99:00:00"}']) assert.equal(readMondayDate(value), null);
});

test("Monday items map the existing board's columns, labels, quantities and PDFs", () => {
  const result = mapMondayItem({ id: "12", name: "Shaft A", column_values: [
    { id: "cat", text: "MANUAL LATHE" }, { id: "state", text: "Final Machining" }, { id: "prio", text: "Medium" }, { id: "desc", text: "Shooter spacer" }, { id: "qty", text: "6" }, { id: "drawing-state", text: "Released" },
    { id: "file", text: "", files: [
      { name: "Shaft.pdf", asset: { id: "2", public_url: "https://files.example.com/shaft.pdf?expires=123", file_extension: "pdf" } },
      { name: "photo.png", asset: { id: "3", public_url: "https://files.example.com/photo.png", file_extension: "png" } },
      { name: "unsafe.pdf", asset: { id: "4", public_url: "javascript:alert(1)", file_extension: "pdf" } },
    ] },
  ] }, columns);
  assert.equal(result.category, "Manual Lathe");
  assert.equal(result.status, "In progress");
  assert.equal(result.sourceStatus, "Final Machining");
  assert.equal(result.priority, "Normal");
  assert.equal(result.sourcePriority, "Medium");
  assert.equal(result.description, "Shooter spacer");
  assert.equal(result.quantity, 6);
  assert.equal(result.drawingStatus, "Released");
  assert.equal(result.assignee, "");
  assert.equal(result.drawings.length, 1);
  assert.equal(result.drawings[0].id, "2");
});

test("board workflow labels normalize into the right display lanes", () => {
  for (const label of ["Pending", "Saw Cut", "Ready", ""]) assert.equal(normalizeStatus(label), "Ready");
  for (const label of ["Working on it", "Final Machining"]) assert.equal(normalizeStatus(label), "In progress");
  assert.equal(normalizeStatus("Done"), "Completed");
  assert.equal(normalizeStatus("Stuck"), "Blocked");
});

test("unknown Monday labels remain visible and do not silently become completed", () => {
  const result = mapMondayItem({ id: "99", name: "Unexpected", column_values: [{ id: "cat", text: "Other" }, { id: "state", text: "In review" }] }, columns);
  assert.equal(result.category, "Uncategorized");
  assert.equal(result.status, "Unknown");
  assert.equal(result.sourceStatus, "In review");
});

test("drawing URL validation rejects executable and insecure schemes", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,hello", "http://example.com/part.pdf", "invalid", null]) assert.equal(safeHttpsUrl(url), null);
  assert.equal(safeHttpsUrl("https://example.com/part.pdf"), "https://example.com/part.pdf");
});

test("search matches multiple words across part metadata regardless of case or order", () => {
  const parts = [part, { ...part, id: "13", name: "26-1241-P5219", description: "Shooter outside spacer", category: "3D Printed", sourceStatus: "Final Machining", sourcePriority: "Medium", drawings: [{ id: "drawing", name: "spacer-rev-B.pdf", url: "https://example.com/drawing.pdf" }] }];
  for (const query of ["P5219", " SHooTER   spacer ", "spacer 3d", "machining outside", "rev-b.pdf", "Medium Released"]) assert.deepEqual(searchParts(parts, query).map((value) => value.id), ["13"]);
  assert.equal(searchParts(parts, "   "), parts);
  assert.deepEqual(searchParts(parts, "outside missing"), []);
});

test("search includes completed parts without changing overall progress or source order", () => {
  const parts = [part, { ...part, id: "13", name: "Finished spacer", status: "Completed" }];
  assert.deepEqual(searchParts(parts, "finished").map((value) => value.id), ["13"]);
  assert.deepEqual(robotProgress(parts), { total: 2, completed: 1, active: 0, percent: 50 });
  assert.equal(parts[0], part);
});

test("assignee mapping preserves all People column names and handles empty or unconfigured columns", () => {
  const item = { id: "12", name: "Shaft A", column_values: [{ id: "people", text: " Alex Chen, Sam Patel " }] };
  const assigned = mapMondayItem(item, { ...columns, assignee: "people" });
  assert.equal(assigned.assignee, "Alex Chen, Sam Patel");
  assert.equal(mapMondayItem(item, columns).assignee, "");
  assert.equal(mapMondayItem({ ...item, column_values: [{ id: "people", text: null }] }, { ...columns, assignee: "people" }).assignee, "");
  assert.deepEqual(searchParts([assigned], "sam shaft").map((value) => value.id), ["12"]);
  assert.deepEqual(searchParts([assigned], "PATEL"), [assigned]);
});
