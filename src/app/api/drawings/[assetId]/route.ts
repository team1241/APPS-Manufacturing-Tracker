import { getMondayBoard, IntegrationError } from "@/lib/monday";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  if (!/^\d+$/.test(assetId)) return Response.json({ error: "Drawing not found." }, { status: 404 });
  const range = request.headers.get("range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return Response.json({ error: "Unsupported byte range." }, { status: 416 });
  try {
    // Resolve only assets on the configured board. Never accept an upstream URL
    // from the client or send the Monday API token to the file storage service.
    const board = await getMondayBoard();
    const drawing = board.parts.flatMap((part) => part.drawings).find((file) => file.id === assetId);
    if (!drawing) return Response.json({ error: "Drawing not found on this board." }, { status: 404 });
    const upstream = await fetch(drawing.url, {
      headers: range ? { Range: range } : {}, cache: "no-store", signal: AbortSignal.timeout(30_000),
    });
    if (upstream.status === 416) {
      const headers = new Headers();
      if (upstream.headers.has("content-range")) headers.set("Content-Range", upstream.headers.get("content-range")!);
      return new Response(null, { status: 416, headers });
    }
    if (!upstream.ok || !upstream.body) throw new IntegrationError("The drawing could not be loaded. Refresh the board and try again.");
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(drawing.name)}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return Response.json({ error: error instanceof IntegrationError ? error.message : "The drawing could not be loaded. Refresh the board and try again." }, { status: error instanceof IntegrationError ? error.status : 502 });
  }
}
