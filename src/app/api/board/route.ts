import { createDemoBoard } from "@/lib/demo-board";
import { getMondayBoard, IntegrationError, mondayConfigured } from "@/lib/monday";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const data = mondayConfigured() ? await getMondayBoard(new URL(request.url).searchParams.get("refresh") === "1") : createDemoBoard();
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof IntegrationError ? error.message : "Unable to load the manufacturing board." }, { status: error instanceof IntegrationError ? error.status : 502, headers: { "Cache-Control": "no-store" } });
  }
}
