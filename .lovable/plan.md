## Objetivo
Transformar a lista de aulas do curso (`/app/cursos/$courseId`) em **cards visuais mais ricos**, no lugar das linhas horizontais atuais que parecem apenas "itens de lista".

## O que muda visualmente

Hoje cada aula é uma `Card` baixinha, em coluna vertical, com ícone + título + meta em uma linha só. Fica funcional mas visualmente monótono, principalmente no mobile.

Proposta: **grid de cards com presença**, agrupados por módulo.

### Card de aula (novo)
```
┌────────────────────────────────┐
│  [thumb gradiente + ícone play]│  ← faixa superior colorida (h-24)
│  [badge status canto sup dir]  │     (Concluída / Disponível / Bloqueada)
├────────────────────────────────┤
│  Aula 03                       │  ← número da aula (muted, pequeno)
│  Introdução aos 9 passos       │  ← título bold
│                                │
│  ⏱ 12 min   ▓▓▓░░ 60%          │  ← duração + mini progresso (se iniciada)
│                                │
│  [ Assistir → ]                │  ← CTA (ou "Revisar" / "Bloqueada")
└────────────────────────────────┘
```

Estados visuais distintos:
- **Concluída** → faixa verde suave, badge verde com check, CTA "Revisar" outline
- **Disponível** → faixa com brand-gradient, badge branco, CTA "Assistir" cheio (brand)
- **Bloqueada** → faixa cinza dessaturada, badge com cadeado, card com `opacity-60` e cursor `not-allowed`, sem link
- **Em andamento** (iniciada mas não concluída) → mesma faixa de disponível + barrinha de progresso visível + CTA "Continuar"

Micro-interações:
- `hover:-translate-y-0.5 hover:shadow-lg transition` (só em não-bloqueados)
- Ícone play com leve `scale` no hover da faixa

### Layout
- Grid responsivo: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- Módulos continuam como seções com `<h2>` + descrição
- No mobile (390px) → 1 coluna, cards ganham respiro

### Consistência
- Mesmos tokens já usados no home: `bg-brand-gradient`, `--color-brand-red`, `--color-success`
- `rounded-2xl`, sombras suaves, tipografia igual ao `CourseCard` do home → o curso vira uma extensão natural da home

## Arquivos afetados
- `src/routes/_authenticated/app/cursos/$courseId.tsx` — substituir o bloco `{m.lessons.filter(...).map(...)}` por um novo componente `LessonCard` (definido no mesmo arquivo, seguindo o padrão do `CourseCard` no `app/index.tsx`)

Nenhuma mudança em dados, rotas ou lógica de desbloqueio — só apresentação.

## Fora de escopo
- Thumbnails reais de vídeo (usaremos gradiente + ícone; adicionar poster do YouTube pode ser passo seguinte)
- Animações com framer-motion
- Reordenar/colapsar módulos

Quer que eu siga com essa proposta ou prefere ver 2-3 direções visuais lado a lado antes (com previews renderizados)?