import { NextResponse } from "next/server";
import { executeCommand, RequestError } from "@/lib/server-state";
import { getTrustedOrigins } from "@/lib/trusted-origins";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const trustedOrigins = new Set(getTrustedOrigins());
    if ((origin && !trustedOrigins.has(origin)) || request.headers.get("sec-fetch-site") === "cross-site") throw new RequestError("Origen de solicitud no permitido.", 403);
    if (!request.headers.get("content-type")?.includes("application/json")) throw new RequestError("Envía los datos como JSON.", 415);
    if (Number(request.headers.get("content-length")) > 3_000_000) throw new RequestError("La solicitud es demasiado grande.", 413);
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 3_000_000) throw new RequestError("La solicitud es demasiado grande.", 413);
    let input: unknown;
    try { input = JSON.parse(body); } catch { throw new RequestError("El JSON de la solicitud no es válido."); }
    await executeCommand(request.headers, input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("No se pudo completar la acción de PataMatch", error);
    return NextResponse.json({ error: "No fue posible guardar el cambio. Intenta de nuevo." }, { status: 500 });
  }
}
