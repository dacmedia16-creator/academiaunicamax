# PWA instalável — Academia RE/MAX

Escopo: só instalável (Add to Home Screen, ícone, tela cheia). Sem service worker, sem offline — como recomendado pelo skill PWA da Lovable.

## Arquivos

### 1. `public/manifest.webmanifest` (novo)

```json
{
  "name": "REMAX Academy — Treinamentos",
  "short_name": "REMAX Academy",
  "description": "Plataforma de treinamentos em vídeo para corretores RE/MAX.",
  "start_url": "/app",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#1e3a8a",
  "lang": "pt-BR",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Nota: `start_url: /app` leva direto à área do aluno logado (rota autenticada redireciona para `/auth` se sem sessão).

### 2. Ícones (`public/icons/`)

Fonte: `src/assets/academia-remax-logo.png.asset.json` (já existente).

- `public/icons/icon-192.png` — 192×192 do logo em fundo branco
- `public/icons/icon-512.png` — 512×512 do logo em fundo branco
- `public/icons/icon-maskable-512.png` — 512×512 com safe area (logo centrado ~80% em fundo branco, para máscara Android)
- `public/apple-touch-icon.png` — 180×180 iOS (fundo branco, cantos serão arredondados pelo iOS)

Processo: baixar o PNG do CDN (URL do `.asset.json`) e gerar as variantes com Python/PIL no sandbox durante o build.

### 3. `src/routes/__root.tsx` (editar `head().links` e `meta`)

Adicionar em `links`:
```tsx
{ rel: "manifest", href: "/manifest.webmanifest" },
{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
```

Adicionar em `meta`:
```tsx
{ name: "theme-color", content: "#1e3a8a" },
{ name: "apple-mobile-web-app-capable", content: "yes" },
{ name: "apple-mobile-web-app-status-bar-style", content: "default" },
{ name: "apple-mobile-web-app-title", content: "REMAX Academy" },
{ name: "mobile-web-app-capable", content: "yes" },
```

## O que fica de fora

- Sem service worker, sem `vite-plugin-pwa`, sem cache offline.
- Sem prompt customizado de instalação (`beforeinstallprompt`) — o navegador mostra o próprio.
- Sem push notifications.
- `viewport` já existe no root (`width=device-width, initial-scale=1`) — ok.

## Aviso ao usuário

Após publicar, a instalação aparece assim:
- **Android/Chrome**: menu > "Instalar app" ou banner automático após alguns segundos.
- **iOS/Safari**: Compartilhar > "Adicionar à Tela de Início".
- Precisa estar servido em HTTPS (a URL `.lovable.app` já é).
- Trocar `start_url`, `id`, `scope` depois exige reinstalar o app em quem já instalou.
