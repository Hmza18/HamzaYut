import { NextResponse } from "next/server";
import type { ResolveRequest } from "@/lib/types";
import { resolveVideoQuery } from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: ResolveRequest;

  try {
    body = (await request.json()) as ResolveRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.query?.trim()) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  try {
    const result = await resolveVideoQuery(body.query);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve video.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
