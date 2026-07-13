
# Redesign da Landing (fanpage) — Visual futurista, mais imagem que texto

Escopo: apenas a página pública `/` (`src/routes/index.tsx`). Área logada e header não mudam.

## Direção visual

- Paleta "RE/MAX Futurista": fundo `#0b0f1a`, superfícies `#111a2e`, azul `#1e40af`, vermelho `#ef2b2d`. Aplicada como tokens em `src/styles.css` (novos `--color-brand-*` só usados nesta página).
- Tipografia: Sora (display) + Manrope (body), carregadas via `<link>` no `__root.tsx` e mapeadas em `@theme` (`--font-display`, `--font-sans`).
- Estética: dark, glow sutil, grades neon, cantos com halo radial, glassmorphism leve (blur + borda 1px translúcida), gradiente azul→vermelho como acento.

## Estrutura (hero-grid, imagem-first)

Menos texto, mais peso visual. Cada bloco é majoritariamente imagem.

```text
┌───────────────────────────── HERO (full-bleed) ─────────────────────────────┐
│  grid 12 col · esquerda 5 col: chip + H1 curto (2 linhas) + 2 CTAs          │
│  direita 7 col: imagem do banner com moldura glow + reflexos + grid neon    │
│  fundo: radial glow azul topo-esq, vermelho baixo-dir, grid SVG sutil       │
└─────────────────────────────────────────────────────────────────────────────┘
┌────────── STAT STRIP (glass) ──────────┐
│ 6 cursos · Vídeo aulas · Progresso     │  (ícones + números, sem parágrafo)
└────────────────────────────────────────┘
┌──── BENTO DE MÓDULOS (imagens > texto) ────────────────────────────────────┐
│ [img grande]  [img]  [img]                                                 │
│ [img]         [img grande + label curta]                                   │
│  6 tiles usando o logo/banner + gradientes; título 1-3 palavras cada       │
└────────────────────────────────────────────────────────────────────────────┘
┌────────── CTA FINAL full-bleed ──────────┐
│ imagem + gradiente + 1 headline + botão  │
└──────────────────────────────────────────┘
FOOTER (mantém o atual)
```

## Mudanças por arquivo

1. `src/styles.css`
   - Adicionar tokens: `--color-brand` (#1e40af), `--color-brand-red` (#ef2b2d), `--color-bg-deep` (#0b0f1a), `--color-surface` (#111a2e), `--font-display: "Sora"`, `--font-sans: "Manrope"`.
   - Utilities novas: `@utility grid-neon` (background com linhas via `linear-gradient`), `@utility glow-ring` (box-shadow duplo azul+vermelho), `@utility glass-panel` (bg translúcido + backdrop-blur + borda).
   - Gradiente `--gradient-brand: linear-gradient(135deg, #1e40af, #ef2b2d)`.

2. `src/routes/__root.tsx`
   - Adicionar `<link>` preconnect + Google Fonts para Sora (600/800) e Manrope (400/600). Só isso; sem tocar em metadata/manifest.

3. `src/routes/index.tsx` (reescrita da landing, mesma rota/head/SEO)
   - Novo Hero com grid 12 col, imagem do banner à direita em moldura com `glow-ring` + `grid-neon` no fundo.
   - Headline curta: "Vender imóveis é ciência." (H1, Sora 800). Subtítulo em 1 linha.
   - CTAs: "Entrar" (primário vermelho) + "Criar conta" (outline azul).
   - Stat strip em `glass-panel`.
   - Bento (6 tiles) reaproveitando `academia-remax-banner` e `academia-remax-logo` (mesmos assets já no projeto) com overlays de gradiente e labels de 1-3 palavras (Atendimento, Captação, Negociação, Marketing, Gestão, Mindset).
   - Faixa CTA final com imagem full-bleed e headline curta.
   - Footer permanece.

## Fora do escopo

- Sem novas imagens geradas (usa banner/logo já hospedados). Se depois quiser tiles únicos, geramos com `imagegen`.
- Sem mudanças em rotas autenticadas, header, PWA icons/manifest ou backend.
- Sem alterações no `SiteHeader` (marca continua como está).

## Verificação

- Ver a preview em desktop e mobile (viewport atual 1231px); conferir contraste dos CTAs sobre o gradiente e legibilidade da H1.
