
# Melhorias de UX/UI da Área do Aluno

Foco: transformar `/app` (home logada) e a jornada Curso → Aula em algo mais motivador, claro e "premium", mantendo a identidade REMAX (azul + vermelho, tipografia Manrope/Inter já configurada).

## Diagnóstico atual

A tela `/app` hoje entrega:
- Saudação genérica + 3 stat cards pequenos
- Grid de cursos igual ao catálogo (redundante com `/app/cursos`)
- "Continuar estudando" é só um botão pequeno, sem contexto da aula
- Sem senso de progressão global, sem próxima aula sugerida, sem indicação do que fazer agora
- Cards de curso todos iguais (mesmo gradiente), sem hierarquia entre "em andamento", "não iniciado" e "concluído"

Resultado: o aluno entra e não sabe onde clicar primeiro.

## Direção do redesign

Princípio: **"o que eu faço agora?" precisa ser respondido em 1 segundo.**

### 1. Hero "Continue de onde parou" (peça principal)
Substitui o card pequeno atual por um bloco largo no topo, abaixo da saudação:
- Thumbnail/gradient do curso + nome do curso + nome da próxima aula
- Barra de progresso do curso + "faltam X aulas"
- Botão primário grande "Retomar aula" (vermelho REMAX)
- Se o usuário nunca assistiu nada → variante "Comece por aqui" apontando para a 1ª aula do 1º curso publicado

### 2. Stat strip enxuta
Redesenhar os 3 stat cards como uma faixa horizontal compacta:
- Aulas concluídas / total
- Cursos em andamento
- Tempo total assistido (soma de `percent × duration`)
Com micro-ícones e números grandes, sem "cards" pesados.

### 3. Trilha "Meus cursos" com estados
Grid de cursos, mas cada card ganha estado visual distinto:
- **Em andamento**: barra de progresso destacada + "Continuar" + nome da próxima aula em pequeno
- **Não iniciado**: badge "Novo" + "Começar"
- **Concluído**: check verde + "Revisar" + selo discreto
Ordenação: em andamento primeiro, depois não iniciados, depois concluídos.

### 4. Melhorias na página do curso (`/app/cursos/$courseId`)
- Hero mantém gradiente, mas adiciona: total de aulas, duração total, % concluído em números grandes
- Botão CTA "Continuar de onde parou" no hero (pula direto para a próxima aula disponível)
- Lista de aulas: estados atuais (done/available/locked) ganham micro-interações (hover eleva, done com check animado)
- Módulos colapsáveis quando o curso tem 3+ módulos

### 5. Melhorias na página da aula (`/app/aulas/$lessonId`)
- Após concluir: card de "Próxima aula" com auto-sugestão + botão "Ir para próxima"
- Sidebar/lista compacta das aulas do módulo atual (contexto), sem precisar voltar
- Breadcrumb: Curso › Módulo › Aula

### 6. Polimento visual transversal
- Cards com `rounded-2xl`, sombra suave em hover, transição consistente
- Skeleton loaders no lugar dos "Carregando…" atuais
- Empty states ilustrados (sem cursos / sem progresso) em vez de texto seco
- Micro-animações com framer-motion nos cards de curso e no hero de "continuar"

## Escopo técnico (resumo)

Arquivos afetados:
- `src/routes/_authenticated/app/index.tsx` — reestrutura completa (hero + strip + grid com estados)
- `src/routes/_authenticated/app/cursos/$courseId.tsx` — CTA "continuar" + stats no hero + colapso de módulos
- `src/routes/_authenticated/app/aulas/$lessonId.tsx` — próxima aula + lista lateral do módulo
- `src/lib/courses.ts` — helper `getNextLesson(userId, courseId?)` para calcular próxima aula disponível
- Novos componentes: `ContinueHero`, `StatStrip`, `CourseCardWithState`, `NextLessonCard`, `LessonSkeleton`
- `framer-motion` (verificar se já está instalado; adicionar se não)

Sem mudanças de schema, sem mudanças em auth, sem mudanças no admin.

## Fora de escopo (posso incluir depois se você quiser)

- Gamificação (badges, streak, ranking)
- Notificações / lembretes por e-mail
- Certificado de conclusão
- Comentários/dúvidas por aula
- Busca no catálogo

---

Quer que eu vá com esse plano completo, ou prefere que eu foque só na **etapa 1–3 (home `/app`)** primeiro para você validar o direcionamento visual antes de mexer no restante?
