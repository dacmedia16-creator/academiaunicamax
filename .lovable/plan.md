# Cards com thumbnail de vídeo

Padronizar as listagens de **cursos** e **aulas** com um card visual estilo galeria: thumbnail 16:9 grande, badge de duração no canto inferior direito, título abaixo e linha de metadados (duração + status).

## Como o thumbnail é obtido

Helper puro em `src/lib/video-thumbnail.ts`, sem chamadas de rede:

- **YouTube** (`video_provider: "youtube"`): `https://i.ytimg.com/vi/{id}/hqdefault.jpg` (usa `maxresdefault` como fonte primária com fallback `onError` para `hqdefault`).
- **Vimeo** (`video_provider: "vimeo"`): sem CDN pública sem chamar API; usa fallback (gradient da marca com título) — evita adicionar server function agora.
- **URL genérica**: fallback gradient.
- Extração de ID: regex para `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`, e ID puro.

**Para cursos:** thumbnail = `cover_url` do curso se existir; senão, thumbnail da **primeira aula publicada** do curso.

## Componentes novos

`src/components/media-card.tsx` — card reutilizável:

```
┌─────────────────────────┐
│                         │  ← 16:9 thumbnail (aspect-video)
│      [thumbnail]        │     rounded-xl overflow-hidden
│                    ⏱5m39s│    badge duração bottom-right
└─────────────────────────┘
Título da aula/curso        ← font-semibold, 1 linha, truncate
5m 39s · Em andamento       ← text-xs text-muted-foreground
```

Props: `thumbnailUrl`, `fallbackTitle`, `durationSeconds`, `title`, `status` (`"done" | "in-progress" | "not-started" | "locked" | "new"`), `href`, `disabled`.

Status vira chip colorido inline:
- `done` → check verde + "Concluída/Concluído"
- `in-progress` → dot azul + "Em andamento" (+ `pct%` quando aula)
- `not-started` / `new` → dot cinza + "Nova"
- `locked` → cadeado + "Bloqueada" (opacity-60, sem link)

## Aplicação

**1. Home `/app` (`src/routes/_authenticated/app/index.tsx`)**
Substitui `CourseCard` atual pelo `MediaCard`. Mantém `ContinueHero` e `StatStrip` como estão. Ordem in-progress → not-started → completed preservada. Barra de progresso do curso permanece abaixo do card (fina, 2px).

**2. Catálogo `/app/cursos` (`src/routes/_authenticated/app/cursos/index.tsx`)**
Grid `md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` de `MediaCard`.

**3. Detalhe do curso `/app/cursos/$courseId.tsx`**
Mantém hero atual. Substitui a lista vertical de aulas por **grid de MediaCards** agrupado por módulo (título do módulo como section header). Aulas bloqueadas aparecem no grid mas com `disabled`.

## Detalhes técnicos

- Novo arquivo: `src/lib/video-thumbnail.ts` (função pura, sem I/O).
- Novo componente: `src/components/media-card.tsx`.
- Editados: `app/index.tsx`, `app/cursos/index.tsx`, `app/cursos/$courseId.tsx`.
- Nada muda no schema, RLS, ou server functions.
- Sem novas dependências.
- `aspect-video` + `object-cover` + `loading="lazy"` nas imagens.

## Fora do escopo

- Vimeo com thumbnail real (precisa oEmbed via server fn — pode virar próxima iteração).
- Upload manual de capa por aula.
- Animações framer-motion (mantém as transições Tailwind).

Aprovado?
