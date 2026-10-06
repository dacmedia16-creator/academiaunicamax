import { useEffect, useRef } from "react";
import type { PlayerProps, VideoProviderAdapter } from "./types";

// Player API oficial do Cloudflare Stream (docs: viewing-videos/using-the-stream-player/using-the-player-api).
const SDK_URL = "https://embed.cloudflarestream.com/embed/sdk.latest.js";

type StreamPlayer = {
  addEventListener: (ev: string, cb: () => void) => void;
  removeEventListener: (ev: string, cb: () => void) => void;
  currentTime: number;
  duration: number;
};
declare global {
  interface Window {
    Stream?: (el: HTMLIFrameElement) => StreamPlayer;
  }
}

let sdkPromise: Promise<void> | null = null;
function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.Stream) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SDK_URL;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { sdkPromise = null; reject(new Error("Falha ao carregar o player")); };
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
}

function StreamPlayerView({ source, title, startAt, posterUrl, onTimeUpdate, onPause, onEnded }: PlayerProps) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const handlers = useRef({ onTimeUpdate, onPause, onEnded });
  handlers.current = { onTimeUpdate, onPause, onEnded };

  useEffect(() => {
    if (source.mode !== "stream" || !ref.current) return;
    let player: StreamPlayer | null = null;
    let cancelled = false;
    const tu = () => player && handlers.current.onTimeUpdate(player.currentTime, player.duration);
    const pa = () => player && handlers.current.onPause(player.currentTime, player.duration);
    const en = () => player && handlers.current.onEnded(player.duration);
    loadSdk().then(() => {
      if (cancelled || !ref.current || !window.Stream) return;
      player = window.Stream(ref.current);
      player.addEventListener("timeupdate", tu);
      player.addEventListener("pause", pa);
      player.addEventListener("ended", en);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (player) {
        player.removeEventListener("timeupdate", tu);
        player.removeEventListener("pause", pa);
        player.removeEventListener("ended", en);
      }
    };
  }, [source]);

  if (source.mode !== "stream") return <></>;
  // startTime retoma de onde parou; sem parâmetro de download (downloads ficam desativados no Stream).
  // poster: parâmetro oficial do player do Stream (URL absoluta da capa, codificada).
  const params = new URLSearchParams();
  if (startAt > 5) params.set("startTime", String(Math.floor(startAt)));
  if (posterUrl && typeof window !== "undefined") {
    params.set("poster", new URL(posterUrl, window.location.origin).toString());
  }
  const qs = params.toString();
  const src = qs ? `${source.iframeSrc}${source.iframeSrc.includes("?") ? "&" : "?"}${qs}` : source.iframeSrc;
  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      className="h-full w-full"
      style={{ border: "none" }}
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
      allowFullScreen
    />
  );
}

export const cloudflareStream: VideoProviderAdapter = {
  id: "cloudflare_stream",
  label: "Cloudflare Stream",
  idHint: "UID do vídeo no Stream (32 caracteres)",
  // UID do Stream: 32 caracteres hexadecimais.
  validateVideoId: (raw) => {
    const v = raw.trim().toLowerCase();
    return /^[0-9a-f]{32}$/.test(v) ? v : null;
  },
  Player: StreamPlayerView,
};
