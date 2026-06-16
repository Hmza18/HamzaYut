import { NextResponse } from "next/server";
import { downloadFormatStream, getFormatForDownload } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const videoId = url.searchParams.get("videoId");
  const itagValue = url.searchParams.get("itag");

  if (!videoId || !itagValue) {
    return NextResponse.json({ error: "videoId and itag are required." }, { status: 400 });
  }

  const itag = Number(itagValue);
  if (!Number.isFinite(itag)) {
    return NextResponse.json({ error: "itag must be a number." }, { status: 400 });
  }

  try {
    const { fileName, mimeType } = await getFormatForDownload(videoId, itag);
    const webStream = await downloadFormatStream(videoId, itag);

    return new NextResponse(webStream as ReadableStream, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
