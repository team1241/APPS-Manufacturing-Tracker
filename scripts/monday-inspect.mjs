import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

const token = process.env.MONDAY_API_TOKEN?.trim();
const ids = [process.env.MONDAY_BOARD_ID, process.env.MONDAY_NOTES_BOARD_ID].filter(Boolean);
if (!token || !ids.length || ids.some((id) => !/^\d+$/.test(id))) {
  console.error("Set MONDAY_API_TOKEN and a numeric MONDAY_BOARD_ID in .env.local first.");
  process.exit(1);
}

try {
  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json", "API-Version": process.env.MONDAY_API_VERSION || "2026-10" },
    body: JSON.stringify({ query: "query ($ids: [ID!]!) { boards(ids: $ids) { id name columns { id title type settings } } }", variables: { ids } }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Monday returned HTTP ${response.status}. Check token permissions and API limits.`);
  const payload = await response.json();
  if (payload.errors?.length || !payload.data?.boards?.length) throw new Error("Monday could not read the board. Check board IDs, API version, and token access.");
  for (const board of payload.data.boards) {
    console.log(`\n${board.name} (board ID: ${board.id})`);
    console.table(board.columns.map(({ title, id, type }) => ({ title, id, type })));
    for (const column of board.columns) {
      if (column.type === "status") console.log(`${column.title} labels: ${JSON.stringify((column.settings?.labels || []).filter((label) => !label.is_deactivated).map((label) => ({ id: label.id, label: label.label })))}`);
    }
  }
  console.log("\nCopy the column IDs into .env.local. Column titles and column IDs are different. Restart the app after saving.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Monday connection failed.");
  process.exitCode = 1;
}
