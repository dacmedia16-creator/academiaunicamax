// Assinatura LOCAL de tokens do Cloudflare Stream (RS256), conforme a doc oficial
// "Securing your Stream" → "Generate signed tokens with Cloudflare Workers".
// Roda só no servidor (Worker). A chave privada vem do secret STREAM_SIGNING_KEY_JWK
// (JWK em base64, como devolvido por POST /stream/keys) e nunca vai para o front.

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function objToB64url(o: unknown): string {
  return b64url(new TextEncoder().encode(JSON.stringify(o)));
}

export type SignInput = {
  videoUid: string;
  keyId: string;
  /** JWK privado em base64 (formato devolvido pela API de chaves do Stream). */
  jwkBase64: string;
  /** validade em segundos (padrão 2 h, o suficiente para assistir a aula). */
  ttlSeconds?: number;
  nowSeconds?: number;
};

export async function signStreamToken(input: SignInput): Promise<{ token: string; exp: number }> {
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const exp = now + (input.ttlSeconds ?? 7200);
  const header = { alg: "RS256", kid: input.keyId };
  // Sem "downloadable": downloads continuam negados. nbf com 60 s de tolerância de relógio.
  const payload = { sub: input.videoUid, kid: input.keyId, exp, nbf: now - 60 };
  const unsigned = `${objToB64url(header)}.${objToB64url(payload)}`;
  const jwk = JSON.parse(atob(input.jwkBase64));
  const key = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, new TextEncoder().encode(unsigned));
  return { token: `${unsigned}.${b64url(sig)}`, exp };
}

/** URL do iframe com o token no lugar do UID (vídeo com requireSignedURLs=true). */
export function streamIframeUrl(customerCode: string, token: string): string {
  if (!/^[a-z0-9]{6,64}$/i.test(customerCode)) throw new Error("STREAM_CUSTOMER_CODE inválido");
  return `https://customer-${customerCode}.cloudflarestream.com/${token}/iframe`;
}
