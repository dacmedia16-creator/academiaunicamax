/**
 * Adaptador de vídeo da Academia. As telas só conhecem esta interface; trocar de provedor
 * (Cloudflare Stream → Bunny/Panda/Vimeo) = novo adaptador registrado em ./index.tsx +
 * UPDATE de lessons.video_provider/video_id. Nada nas telas muda.
 */
export type VideoProviderId = "cloudflare_stream" | "vimeo" | "bunny" | "panda";

/** Resposta do servidor para tocar uma aula (token assinado gerado só no Worker). */
export type PlaybackSource =
  | { mode: "stream"; provider: VideoProviderId; iframeSrc: string; expiresAt: number }
  | { mode: "mock"; provider: VideoProviderId; reason: string; durationSeconds: number };

/** Eventos normalizados que todo adaptador precisa emitir. */
export type PlayerEvents = {
  onTimeUpdate: (seconds: number, duration: number) => void;
  onPause: (seconds: number, duration: number) => void;
  onEnded: (duration: number) => void;
};

export type PlayerProps = PlayerEvents & {
  source: PlaybackSource;
  title: string;
  /** posição salva para retomar (segundos) */
  startAt: number;
};

export type VideoProviderAdapter = {
  id: VideoProviderId;
  label: string;
  /** Validação do identificador cadastrado pelo admin da plataforma. */
  validateVideoId: (raw: string) => string | null;
  /** Placeholder do campo no formulário de aula. */
  idHint: string;
  Player: (props: PlayerProps) => React.ReactElement;
};
