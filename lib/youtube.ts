import { Innertube } from "youtubei.js";
import {
  extensionForContainer,
  formatDuration,
  mimeToContainer,
  sanitizeFileName,
} from "@/lib/format";
import type { DownloadOption, QueryResponse, VideoSummary } from "@/lib/types";

type StreamFormat = {
  itag?: number;
  has_video: boolean;
  has_audio: boolean;
  bitrate?: number;
  quality_label?: string;
  quality?: string;
  mime_type?: string;
};

let clientPromise: ReturnType<typeof Innertube.create> | null = null;

async function getClient() {
  if (!clientPromise) {
    clientPromise = Innertube.create();
  }

  return clientPromise;
}

export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);

    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1).split("/")[0] || null;
    }

    const fromQuery = url.searchParams.get("v");
    if (fromQuery) return fromQuery;

    const shorts = url.pathname.match(/\/shorts\/([\w-]{11})/);
    if (shorts) return shorts[1];

    const embed = url.pathname.match(/\/embed\/([\w-]{11})/);
    if (embed) return embed[1];
  } catch {
    return null;
  }

  return null;
}

function toVideoSummary(
  id: string,
  title: string,
  author: string,
  durationSeconds: number | undefined,
  thumbnailUrl: string | null
): VideoSummary {
  return {
    id,
    title,
    author,
    duration: formatDuration(durationSeconds),
    thumbnailUrl,
  };
}

function getThumbnail(info: { basic_info: { thumbnail?: Array<{ url: string }> } }): string | null {
  const thumbnails = info.basic_info.thumbnail;
  if (!thumbnails?.length) return null;
  return thumbnails[thumbnails.length - 1]?.url ?? null;
}

function getStreamableFormats(formats: StreamFormat[]): StreamFormat[] {
  const progressive = formats.filter((format) => format.has_video && format.has_audio);
  const audioOnly = formats.filter((format) => !format.has_video && format.has_audio);

  const byItag = new Map<number, StreamFormat>();
  for (const format of [...progressive, ...audioOnly]) {
    if (format.itag) {
      byItag.set(format.itag, format);
    }
  }

  return [...byItag.values()].sort((left, right) => {
    const leftScore = (left.has_video ? 1000 : 0) + (left.bitrate ?? 0);
    const rightScore = (right.has_video ? 1000 : 0) + (right.bitrate ?? 0);
    return rightScore - leftScore;
  });
}

function toDownloadOptions(formats: StreamFormat[]): DownloadOption[] {
  return formats.map((format, index) => ({
    index,
    itag: format.itag ?? index,
    label: format.quality_label ?? format.quality ?? "Unknown",
    container: mimeToContainer(format.mime_type),
    isAudioOnly: !format.has_video,
    isVideoUpscaled: false,
  }));
}

export async function resolveVideoQuery(query: string): Promise<QueryResponse> {
  const videoId = extractVideoId(query);
  if (!videoId) {
    throw new Error("Paste a valid YouTube video URL. Playlists and search are not supported on Vercel.");
  }

  const client = await getClient();
  const info = await client.getInfo(videoId);

  const title = info.basic_info.title ?? "Untitled video";
  const author = info.basic_info.author ?? "Unknown";
  const duration = info.basic_info.duration;
  const thumbnailUrl = getThumbnail(info);

  const allFormats = [
    ...((info.streaming_data?.formats ?? []) as StreamFormat[]),
    ...((info.streaming_data?.adaptive_formats ?? []) as StreamFormat[]),
  ];

  const streamable = getStreamableFormats(allFormats);
  if (streamable.length === 0) {
    throw new Error("No pre-muxed formats available for this video. Try another video or quality.");
  }

  return {
    kind: "single",
    title,
    video: toVideoSummary(videoId, title, author, duration, thumbnailUrl),
    options: toDownloadOptions(streamable),
    videos: null,
  };
}

export async function getFormatForDownload(videoId: string, itag: number) {
  const client = await getClient();
  const info = await client.getInfo(videoId);

  const allFormats = [
    ...((info.streaming_data?.formats ?? []) as StreamFormat[]),
    ...((info.streaming_data?.adaptive_formats ?? []) as StreamFormat[]),
  ];

  const streamable = getStreamableFormats(allFormats);
  const format = streamable.find((item) => item.itag === itag);
  if (!format) {
    throw new Error("Selected format is not available.");
  }

  const title = sanitizeFileName(info.basic_info.title ?? "video");
  const container = mimeToContainer(format.mime_type);
  const fileName = `${title}.${extensionForContainer(container)}`;

  return {
    info,
    format,
    fileName,
    mimeType: format.mime_type ?? "application/octet-stream",
  };
}

export async function downloadFormatStream(videoId: string, itag: number) {
  const { info, format } = await getFormatForDownload(videoId, itag);
  return info.download({ format: format as never });
}
