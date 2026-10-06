// Capas das aulas servidas como assets estáticos do Worker (public/aulas/capas), sem coluna
// nova no banco. Mapeadas pelo id da aula (estável); aula sem capa usa o placeholder.
const COVERS: Record<string, string> = {
  "948a9ba4-58ef-46c4-8c70-61848083c867": "aula-01", // 9 Passos
  "87fd345b-db97-4d14-ab2e-bec9209adc88": "aula-02", // Posicionamento
  "5a1e4794-d66b-4dc1-b583-01e680cd2915": "aula-03", // Marketing pessoal
  "a1d1a5c6-006a-456c-b26f-6045d200845d": "aula-04", // Dossiê do corretor
  "6ee3f93d-4c36-46fd-9ea9-86d9185ec3f3": "aula-05", // Estudo de mercado
  "ab186123-eb8c-440e-a864-cad4968405e9": "aula-06", // Plano de marketing do imóvel
  "e291f0a3-67bf-4e97-90cf-9aadb91b8552": "aula-07", // Fotografia e apresentação profissional
  "fcdb06bb-b59e-469f-9a1f-f782e8a2565c": "aula-08", // Dossiê do imóvel
  "7318f7b5-7198-453c-92d2-07cf33924ffa": "aula-09", // Gestão Exclusiva
  "40006da2-a497-400b-8e91-4b836819874d": "aula-10", // Acompanhamento, feedback e relacionamento
};

// Versão das capas: incremente ao trocar os arquivos para furar cache de navegador/CDN.
// v2 = só o balão RE/MAX (sem quadro branco nem texto).
export const COVERS_VERSION = "2";

/** Caminho relativo da capa (ex.: /aulas/capas/aula-01.webp?v=2) ou null. */
export function lessonCoverUrl(lessonId: string): string | null {
  const f = COVERS[lessonId];
  return f ? `/aulas/capas/${f}.webp?v=${COVERS_VERSION}` : null;
}
