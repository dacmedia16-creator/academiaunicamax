# Plataforma de Treinamentos RE/MAX

Área de membros com cursos em vídeo, progresso individual, desbloqueio sequencial e painel administrativo. Backend em Lovable Cloud (Supabase gerenciado).

## Identidade visual
- Paleta: azul RE/MAX (#003DA5), vermelho (#DC1C2E), branco, cinzas claros para fundos.
- Tipografia moderna sans-serif (Manrope + Inter), cartões arredondados, sombras suaves.
- Tokens semânticos em `src/styles.css` (oklch). Componentes shadcn com variantes `primary` (azul) e `destructive`/`accent` (vermelho).
- Slot reservado no header para logo oficial (placeholder textual "RE/MAX Academy").

## Rotas (TanStack Start)
Públicas:
- `/` — landing simples com CTA para login
- `/auth` — login + cadastro (tabs)
- `/auth/forgot` — recuperação de senha
- `/auth/reset-password` — definir nova senha
- `/403`, `/*` (not found)

Autenticadas (`_authenticated/`):
- `/app` — home do aluno (boas-vindas, cursos, continuar estudando)
- `/app/cursos` — catálogo
- `/app/cursos/$courseId` — detalhes com módulos/aulas e estados
- `/app/aulas/$lessonId` — player + progresso
- `/app/perfil` — perfil

Admin (`_authenticated/_admin/`, gated por role):
- `/admin` — dashboard (contagens)
- `/admin/cursos`, `/admin/cursos/$id` (CRUD + módulos + aulas + reordenar)
- `/admin/usuarios` — lista + progresso por usuário

## Backend (Lovable Cloud)

### Tabelas
- `profiles` (id=auth.users.id, full_name, email, avatar_url, created_at)
- `user_roles` (user_id, role enum app_role: 'admin'|'student') — separada, com `has_role()` SECURITY DEFINER
- `courses` (id, title, description, cover_url, is_published, sort_order, created_at)
- `modules` (id, course_id, title, description, sort_order)
- `lessons` (id, module_id, title, description, video_provider enum: 'youtube'|'vimeo'|'url', video_ref text, duration_seconds, sort_order, is_published)
- `lesson_progress` (id, user_id, lesson_id UNIQUE(user_id,lesson_id), percent numeric, position_seconds int, completed bool, completed_at, last_watched_at)

### Funções server-side
- `has_role(uid, role)` SECURITY DEFINER
- `is_lesson_unlocked(uid, lesson_id)` SECURITY DEFINER: retorna true se é a primeira aula publicada do curso (ordem módulo→aula) OU se a aula publicada imediatamente anterior está concluída para o usuário
- `trigger` em `auth.users` → cria `profiles` + role default `student`
- `upsert_lesson_progress` RPC: valida `is_lesson_unlocked` no servidor antes de gravar; marca `completed=true` quando percent≥90

### RLS
- `profiles`: SELECT/UPDATE próprio; admin lê todos
- `user_roles`: SELECT próprio; admin gerencia; nenhum INSERT/UPDATE por cliente sobre a própria role
- `courses/modules/lessons`: SELECT publicados para authenticated; admin ALL
- `lesson_progress`: SELECT/INSERT/UPDATE apenas `auth.uid()=user_id`; admin SELECT tudo
- GRANTs explícitos para `authenticated` e `service_role`

## Regra de desbloqueio
Validada em `is_lesson_unlocked` (SQL) e reforçada no loader da página de aula: se bloqueada, redireciona para a próxima aula disponível com toast explicativo. Cliente nunca decide sozinho.

## Player
- YouTube: IFrame API (`onStateChange`, `getCurrentTime`, `getDuration`) — polling a cada 5s
- Vimeo: Player SDK (`timeupdate`)
- `url` genérica: `<video>` HTML5 nativo com `timeupdate`
- Throttle: grava progresso no máx. 1x a cada 10s + no pause/unmount
- Ao atingir 90%: marca conclusão (idempotente via unique constraint), toast "Aula concluída", botão "Próxima aula"
- Se provedor não expõe progresso confiável: botão "Marcar como concluída" (RPC valida desbloqueio)
- Sanitização: apenas `video_ref` é usado para montar URL do iframe conforme provider enum — nunca HTML bruto

## Dados demo
Migration seed com 6 cursos (Introdução ao mercado, Atendimento, Captação, Negociação, Ética, Marketing), cada um com 2–3 módulos e 3–4 aulas usando vídeos públicos de exemplo. Nenhum usuário criado no código.

## Primeiro admin
Documentado no README: após o cadastro, promover manualmente via SQL no Cloud:
```sql
INSERT INTO user_roles(user_id, role) VALUES ('<uid>', 'admin')
ON CONFLICT DO NOTHING;
```

## UX
Loading skeletons, toasts (sonner), estados vazios, 403/404, feedback ao salvar progresso, navegação por teclado, textos pt-BR.

## Validação
Após implementar: security scan + roteiro de testes manuais (cadastro, bloqueio, retomada, 90%, acesso direto bloqueado, isolamento de progresso, painel admin, RLS).

## Entrega em fases (nesta ordem, mesma sessão)
1. Ativar Lovable Cloud
2. Migration: enums, tabelas, GRANTs, RLS, funções, trigger, seed
3. Design system (styles.css) + layout base + rotas de auth
4. Rotas autenticadas do aluno + player + progresso
5. Painel admin
6. Sitemap/robots, meta tags, security scan, correções
