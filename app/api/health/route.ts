import { NextResponse } from "next/server";
import type { HealthResponse } from "@/lib/types";

export const runtime = "nodejs";

export function GET() {
  const body: HealthResponse = {
    status: "ok",
    mode: "vercel-stream",
    streaming: true,
  };

  return NextResponse.json(body);
}
