import type { PlayerProps, VideoProviderAdapter, VideoProviderId } from "./types";
import { cloudflareStream } from "./cloudflare-stream";
import { MockPlayer } from "./mock-player";

export type { PlaybackSource, VideoProviderId, VideoProviderAdapter } from "./types";

/** Provedores com adaptador implementado. Bunny/Panda/Vimeo entram aqui quando forem escolhidos. */
const ADAPTERS: Partial<Record<VideoProviderId, VideoProviderAdapter>> = {
  cloudflare_stream: cloudflareStream,
};

export const DEFAULT_PROVIDER: VideoProviderId = "cloudflare_stream";

export function getAdapter(id: string): VideoProviderAdapter | null {
  return ADAPTERS[id as VideoProviderId] ?? null;
}

export function availableProviders(): VideoProviderAdapter[] {
  return Object.values(ADAPTERS).filter(Boolean) as VideoProviderAdapter[];
}

/** Componente único usado pela tela de aula: escolhe o player pelo provedor da aula. */
export function LessonPlayer(props: PlayerProps) {
  if (props.source.mode === "mock") return <MockPlayer {...props} />;
  const adapter = getAdapter(props.source.provider);
  if (!adapter) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black p-6 text-center text-sm text-white/80">
        Provedor de vídeo não suportado.
      </div>
    );
  }
  const P = adapter.Player;
  return <P {...props} />;
}
