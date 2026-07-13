# Otimização mobile — área do aluno

Foco: header/nav, home, catálogo, detalhe do curso e player. Escopo apenas de UI/apresentação. Sem mudanças de dados, rotas ou lógica.

## 1. Header + navegação mobile (`src/components/site-header.tsx`)

Problema hoje: em telas <768px o menu (`Início / Cursos / Perfil / Painel`) some completamente e o e-mail some, restando só o logo grande e o botão "Sair". O usuário não tem como navegar sem voltar pela URL.

Mudanças:
- Trocar o `BrandMark` mobile: manter apenas o logo redondo + wordmark curto em uma linha (`REMAX Academy`). O bloco atual com `<br />` gera 3 linhas e empurra tudo.
- Adicionar botão hambúrguer visível apenas em `md:hidden` que abre um `Sheet` (shadcn) lateral com:
  - Links grandes: Início, Cursos, Perfil, Painel (se staff), Sair
  - E-mail do usuário no topo
  - Área de toque mínima 44px (`h-11`)
- Reduzir altura do header no mobile de `h-16` para `h-14` para ganhar viewport útil.
- Manter nav horizontal `md:flex` inalterada no desktop.

Dependência: `Sheet` já existe em `src/components/ui/sheet.tsx` (padrão shadcn); confirmar antes de importar.

## 2. Container principal (`src/routes/_authenticated/route.tsx`)

- `main` atual: `px-4 py-6 md:py-10`. Mudar para `px-3 py-4 sm:px-4 sm:py-6 md:py-10` — 4px extras de largura útil no mobile e menos padding vertical no topo/rodapé.

## 3. Home (`src/routes/_authenticated/app/index.tsx`)

- `h1` "Olá!": reduzir para `text-2xl sm:text-3xl md:text-4xl` (evita quebra ruim em telas estreitas com nome longo).
- `ContinueHero`:
  - Padding: `p-5 sm:p-6 md:p-8` (era `p-6 md:p-8`).
  - Título do curso: `text-xl sm:text-2xl md:text-3xl` + `truncate` já existente; adicionar `line-clamp-2` no mobile porque `truncate` corta títulos importantes.
  - Botão "Retomar aula": `w-full sm:w-auto` para virar botão largo e tocável no mobile.
  - Link "Ver módulos do curso": aumentar área de toque com `py-2 -my-2`.
- `StatStrip`: hoje é `sm:grid-cols-3` → cards ficam empilhados no mobile ocupando muito espaço vertical. Mudar para `grid-cols-3 gap-2` no mobile com layout compacto (ícone menor, valor em cima, label abaixo em `text-[10px]`), voltando ao formato atual em `sm:`.
- Grid de cursos: adicionar `grid-cols-1` explícito (Tailwind já assume, mas manter para claridade). Gap `gap-4` OK.

## 4. Catálogo (`src/routes/_authenticated/app/cursos/index.tsx`)

- Grid: manter `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Já responsivo.
- H1: reduzir para `text-xl sm:text-2xl md:text-3xl`.

## 5. Detalhe do curso (`src/routes/_authenticated/app/cursos/$courseId.tsx`)

- Hero:
  - Padding: `p-5 sm:p-6 md:p-10`.
  - `h1`: `text-xl sm:text-2xl md:text-4xl` (evita título estourar em nomes longos).
  - Botão "Começar / Continuar": `w-full md:w-auto`.
  - Metadados (`ordered.length aulas / minutos / concluídas`): reduzir `text-xs` para ficarem em uma linha com `gap-x-4` no mobile.
- Título de módulo `h2`: `text-base sm:text-lg` no mobile.
- Grid de aulas: hoje é `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Já bom.

## 6. Media card (`src/components/media-card.tsx`)

- Título: `min-h-[2.5rem]` cria vão vazio em cards curtos no mobile; mudar para `min-h-[2.25rem] sm:min-h-[2.5rem]`.
- Meta line (duração · status · hint): já em `flex-wrap`. Adicionar `leading-tight` para reduzir altura no mobile.

## 7. Player de aula (`src/routes/_authenticated/app/aulas/$lessonId.tsx`)

- Header interno "Voltar ao curso / Aula X de N":
  - Botão "Voltar" com `h-10 px-3` (área de toque maior).
  - "Aula X de N" com `text-[11px] sm:text-xs whitespace-nowrap`.
- Título `h1` da aula: `text-xl sm:text-2xl md:text-3xl` + `line-clamp-2`.
- Descrição: adicionar `line-clamp-3` + botão "ler mais" só se necessário (v1: só `line-clamp-3`, sem toggle — evita scroll longo antes do vídeo).
- Card "Próxima aula": botão `w-full sm:w-auto` para virar tocável. Título da próxima aula com `line-clamp-2`.
- Card "marcar como concluída" (provedor sem progresso): botão `w-full sm:w-auto`.
- Vídeo mantém `aspect-video` — já ideal para mobile.

## Fora de escopo

- Área admin (usuário confirmou apenas área do aluno)
- Mudanças de dados, RLS, server functions
- Bottom nav / PWA / instalação — pode ser fase 2
- Toggle "ler mais" na descrição da aula

## Detalhes técnicos

- Todo o trabalho é frontend em Tailwind + shadcn.
- `Sheet` importado de `@/components/ui/sheet` para menu mobile.
- Sem novas dependências.
- Sem tokens de cor novos — reusar `--color-brand`, `--color-brand-red`, `accent`, `muted-foreground`.
- Padrão responsivo: grid `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` + `shrink-0` + `truncate/line-clamp` em toda linha que mistura texto e widget fixo (aplicado especialmente no header do player e no hero).
- Áreas de toque primárias com `min-h-11` (44px).
