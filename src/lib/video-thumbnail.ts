export type VideoProvider = "youtube" | "vimeo" | "url";

/** Extract a YouTube video id from common URL shapes or a bare id. */
export function extractYouTubeId(ref: string): string | null {
  if (!ref) return null;
  const trimmed = ref.trim();
  // Bare id (11 chars, alphanumeric + - _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.slice(1) || null;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "v");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch {
    // fall through
  }
  return null;
}

/** Best-effort static thumbnail URL. Returns null when unavailable (e.g. Vimeo). */
export function videoThumbnailUrl(provider: VideoProvider, ref: string): string | null {
  if (provider === "youtube") {
    const id = extractYouTubeId(ref);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  }
  return null;
}

export function videoThumbnailUrlHQ(provider: VideoProvider, ref: string): string | null {
  if (provider === "youtube") {
    const id = extractYouTubeId(ref);
    return id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : null;
  }
  return null;
}
