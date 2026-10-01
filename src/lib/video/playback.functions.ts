import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlaybackSource, VideoProviderId } from "./types";

/**
 * Entrega a fonte de reprodução de UMA aula para o usuário logado.
 * - Autorização no banco, com o JWT do próprio usuário (RLS + is_lesson_unlocked): inativo,
 *   ex-corretor e aula travada não recebem token.
 * - Cloudflare Stream: token RS256 de curta duração assinado aqui (secret do Worker).
 * - Sem chave configurada e ACADEMIA_VIDEO_MOCK=true: devolve modo simulado (homologação, R$ 0).
 */
export const getLessonPlayback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lessonId: string }) => {
    const id = String(input?.lessonId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Aula inválida");
    return { lessonId: id };
  })
  .handler(async ({ data, context }): Promise<PlaybackSource> => {
    const sb = context.supabase;
    const { data: unlocked, error: e1 } = await sb.rpc("is_lesson_unlocked", { _lesson: data.lessonId });
    if (e1 || unlocked !== true) throw new Error("Aula bloqueada");
    const { data: lesson, error: e2 } = await sb
      .from("lessons").select("video_provider, video_id, duration_seconds").eq("id", data.lessonId).maybeSingle();
    if (e2 || !lesson) throw new Error("Aula não encontrada");
    const provider = lesson.video_provider as VideoProviderId;

    const env = process.env;
    if (provider === "cloudflare_stream") {
      const keyId = env.STREAM_SIGNING_KEY_ID;
      const jwk = env.STREAM_SIGNING_KEY_JWK;
      const customer = env.STREAM_CUSTOMER_CODE;
      if (keyId && jwk && customer && lesson.video_id) {
        const { signStreamToken, streamIframeUrl } = await import("./stream-signing.server");
        const { token, exp } = await signStreamToken({ videoUid: lesson.video_id, keyId, jwkBase64: jwk });
        return { mode: "stream", provider, iframeSrc: streamIframeUrl(customer, token), expiresAt: exp };
      }
    }
    if (env.ACADEMIA_VIDEO_MOCK === "true") {
      return {
        mode: "mock", provider, durationSeconds: lesson.duration_seconds ?? 0,
        reason: "Cloudflare Stream ainda não ativado: reprodução simulada para teste.",
      };
    }
    throw new Error("Vídeo indisponível no momento");
  });
