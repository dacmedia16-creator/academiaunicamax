// Miniaturas: com Cloudflare Stream + signed URLs, a miniatura também exige token, então os
// cards usam a capa do curso (cover_url) ou o placeholder em gradiente. Mantido como ponto
// único caso um provedor futuro ofereça miniatura pública.
export function videoThumbnailUrl(_provider: string, _videoId: string): string | null {
  return null;
}

export function videoThumbnailUrlHQ(_provider: string, _videoId: string): string | null {
  return null;
}
