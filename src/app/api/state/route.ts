import { NextResponse } from "next/server";
import { getServerState, RequestError } from "@/lib/server-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return NextResponse.json(await getServerState(request.headers), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("No se pudo cargar el estado de PataMatch", error);
    return NextResponse.json({ error: "No fue posible cargar los datos. Comprueba que la base de datos esté encendida." }, { status: 500 });
  }
}
