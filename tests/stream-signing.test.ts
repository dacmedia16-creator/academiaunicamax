// Teste local (sem Cloudflare, R$ 0): gera um par RSA igual ao do Stream, assina o token
// e confere assinatura + claims. Rodar: bun test src/lib/video/stream-signing.test.ts
import { expect, test } from "bun:test";
import { signStreamToken, streamIframeUrl } from "../src/lib/video/stream-signing.server";

function b64urlDecode(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

test("token RS256 válido, com kid/sub/exp e sem download", async () => {
  const kp = (await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["sign", "verify"],
  )) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const jwkBase64 = btoa(JSON.stringify(jwk));
  const uid = "0123456789abcdef0123456789abcdef";
  const now = 1_800_000_000;
  const { token, exp } = await signStreamToken({ videoUid: uid, keyId: "kid-teste", jwkBase64, nowSeconds: now, ttlSeconds: 3600 });

  const [h, p, s] = token.split(".");
  const header = JSON.parse(new TextDecoder().decode(b64urlDecode(h)));
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p)));
  expect(header).toEqual({ alg: "RS256", kid: "kid-teste" });
  expect(payload.sub).toBe(uid);
  expect(payload.kid).toBe("kid-teste");
  expect(payload.exp).toBe(now + 3600);
  expect(exp).toBe(now + 3600);
  expect(payload.downloadable).toBeUndefined();

  const valid = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" }, kp.publicKey, b64urlDecode(s), new TextEncoder().encode(`${h}.${p}`),
  );
  expect(valid).toBe(true);

  // token adulterado não valida
  const forged = btoa(JSON.stringify({ ...payload, sub: "outro" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const bad = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" }, kp.publicKey, b64urlDecode(s), new TextEncoder().encode(`${h}.${forged}`),
  );
  expect(bad).toBe(false);

  expect(streamIframeUrl("abc123xyz", token)).toBe(`https://customer-abc123xyz.cloudflarestream.com/${token}/iframe`);
  expect(() => streamIframeUrl("x/../evil", token)).toThrow();
});
