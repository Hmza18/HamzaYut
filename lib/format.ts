export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function formatDuration(seconds: number | undefined): string | null {
  if (!seconds || seconds <= 0) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function mimeToContainer(mimeType: string | undefined): string {
  if (!mimeType) return "unknown";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("opus")) return "opus";
  return mimeType.split("/")[1]?.split(";")[0] ?? "unknown";
}

export function extensionForContainer(container: string): string {
  switch (container) {
    case "webm":
      return "webm";
    case "mp3":
      return "mp3";
    case "opus":
      return "opus";
    default:
      return "mp4";
  }
}
