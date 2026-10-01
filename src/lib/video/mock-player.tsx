import { useEffect, useRef, useState } from "react";
import type { PlayerProps } from "./types";

/**
 * Player SIMULADO (homologação, sem Stream ativo e sem custo). Emite os mesmos eventos
 * normalizados do adaptador real (timeupdate/pause/ended), em velocidade 10x, para testar
 * o desbloqueio sequencial e a gravação de progresso. Só aparece quando o servidor
 * responde mode="mock" (ACADEMIA_VIDEO_MOCK=true e chave de assinatura ausente).
 */
export function MockPlayer({ source, startAt, onTimeUpdate, onPause, onEnded }: PlayerProps) {
  const duration = source.mode === "mock" ? Math.max(30, source.durationSeconds || 120) : 0;
  const [t, setT] = useState(Math.min(startAt, duration));
  const [playing, setPlaying] = useState(false);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!playing) return;
    const iv = window.setInterval(() => {
      const next = Math.min(duration, tRef.current + 2.5); // 250 ms reais = 2,5 s de vídeo
      setT(next);
      onTimeUpdate(next, duration);
      if (next >= duration) { setPlaying(false); onEnded(duration); }
    }, 250);
    return () => window.clearInterval(iv);
  }, [playing, duration]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-neutral-900 p-6 text-center text-white">
      <div className="text-xs uppercase tracking-widest text-white/60">Player simulado (homologação)</div>
      <div className="text-sm text-white/80">{source.mode === "mock" ? source.reason : ""}</div>
      <div className="font-mono text-2xl">{Math.floor(t)}s / {duration}s</div>
      <div className="flex gap-2">
        <button type="button" className="rounded bg-white/15 px-4 py-2 text-sm hover:bg-white/25"
          onClick={() => {
            if (playing) { setPlaying(false); onPause(tRef.current, duration); } else setPlaying(true);
          }}>
          {playing ? "Pausar" : "Reproduzir"}
        </button>
      </div>
    </div>
  );
}
