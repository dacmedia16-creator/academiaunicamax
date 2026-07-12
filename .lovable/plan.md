## Objetivo
Fazer a imagem do logo Academia RE/MAX aparecer como preview ao compartilhar o link (WhatsApp, redes sociais) e como favicon.

## Contexto
O print mostra que hoje o preview do link `academiaunicamax.lovable.app/app` usa uma imagem antiga ("RENDA MAIS, VIDA MELHOR"). O `og:image` precisa ser uma URL **absoluta** e ficar apenas em rotas leaf (não no `__root.tsx`).

## Mudanças

1. **Upload do logo como asset CDN** (mesmo arquivo do header):
   - Já existe `src/assets/academia-remax-logo.png.asset.json` — reaproveitar a URL dele para og:image e favicon.

2. **Favicon** (`src/routes/__root.tsx`):
   - Copiar o logo para `public/favicon.png` (via `code--copy` a partir de `/mnt/user-uploads/...`).
   - Substituir o link `{ rel: "icon", href: "/favicon.ico" }` por `{ rel: "icon", type: "image/png", href: "/favicon.png" }`.
   - Remover `public/favicon.ico`.

3. **og:image na landing (`src/routes/index.tsx`)**:
   - No `head()` da rota `/`, adicionar em `meta`:
     - `{ property: "og:image", content: "https://academiaunicamax.lovable.app/__l5e/assets-v1/1dc23e01-e660-455d-9cdb-b52a7484c596/academia-remax-logo.png" }`
     - `{ property: "og:image:alt", content: "Academia RE/MAX — Plataforma de treinamentos" }`
     - `{ name: "twitter:card", content: "summary_large_image" }`
     - `{ name: "twitter:image", content: <mesma URL absoluta> }`
   - Se `/` ainda não tiver `head()`, criar um com title/description atuais + as tags acima. Não mexer no `__root.tsx` para og:image (regra: só em leaf).

## Nota ao usuário
WhatsApp/Facebook cacheiam previews. Após publicar, pode levar tempo para atualizar; forçar via [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) reindexando a URL.

## Fora do escopo
- Não alterar layout, componentes visuais ou textos da página.
- Não gerar imagem nova; usar o logo já enviado.
