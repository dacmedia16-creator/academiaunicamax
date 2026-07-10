## Objetivo
Adicionar o papel **Gestor (`manager`)** com poderes restritos:
- Criar e excluir alunos, e ver progresso de todos os alunos.
- Criar cursos novos (e virar gestor deles automaticamente).
- Editar/publicar/excluir **apenas** os cursos que o Admin (ou ele próprio, ao criar) tiver atribuído a ele — inclui gerenciar módulos e aulas dentro desses cursos.
- Nunca gerenciar admins ou outros gestores.

## 1. Banco de dados (migration)

**Enum + tabela de atribuição**
- Adicionar `'manager'` ao enum `public.app_role`.
- Nova tabela `public.course_managers(course_id, user_id, assigned_by, created_at)` — PK composta, FKs para `courses` e `auth.users`. GRANTs para `authenticated`/`service_role`, RLS habilitado.
- Políticas de `course_managers`:
  - Admin: acesso total.
  - Manager: `SELECT` das próprias linhas (para saber o que gerencia).
  - Ninguém mais.

**Função auxiliar `is_course_manager(_user, _course)`** — `SECURITY DEFINER`, `SET search_path=public`, para uso em políticas sem recursão.

**Ajustes de RLS nas tabelas existentes** (aditivos — políticas atuais de admin e aluno permanecem):
- `courses`: manager pode `SELECT` (mesmo se não publicado) e `UPDATE`/`DELETE` quando `is_course_manager(auth.uid(), id)`. `INSERT` permitido para manager; após inserir, um trigger `AFTER INSERT` grava linha em `course_managers` com `user_id = auth.uid()` quando o autor for manager (admin cria sem virar gestor).
- `modules` e `lessons`: manager pode `SELECT`/`INSERT`/`UPDATE`/`DELETE` quando `is_course_manager(auth.uid(), <course_id derivado>)`.
- `profiles`, `user_roles`, `lesson_progress`: manager pode `SELECT` (para tela de usuários e progresso). Manager **não** pode inserir/alterar `user_roles`.

**Regras nas RPCs de admin de usuário** (server-side, ver §2): manager pode criar/excluir apenas alunos.

## 2. Server functions (`src/lib/admin-users.functions.ts`)

Substituir a checagem `has_role(admin)` por um helper `assertAdminOrManager(context)`:
- `createUserAsAdmin`: admin pode criar aluno ou admin; manager só pode criar `role: 'student'` (rejeita admin/manager). Continua usando `supabaseAdmin.auth.admin.createUser` com `email_confirm: true`.
- `deleteUserAsAdmin`: admin pode excluir qualquer não-super-admin; manager só pode excluir usuários cujo único papel seja `student` (checa via `user_roles`). Bloqueia super admin e o próprio usuário.
- `setUserRole`: continua **admin-only** (manager nunca promove/rebaixa).

Nova server function `assignCourseManager({ course_id, user_id, enabled })` — **admin-only**, faz upsert/delete em `course_managers`.

## 3. UI

**Hook (`src/hooks/use-auth.tsx`)**
- Adicionar `useIsManager()` e `useIsStaff()` (admin OU manager). `AppRole` passa a incluir `'manager'`.

**Layout admin (`src/routes/_authenticated/admin/route.tsx`)**
- Liberar acesso quando `isAdmin || isManager`. Header mostra "Painel do Gestor" quando manager.
- Ocultar link "Usuários" para manager? — **manter visível** (ele precisa criar alunos), mas a tela adapta as ações.

**`/admin` (dashboard)**
- Manager vê apenas estatísticas dos cursos que gerencia (filtro por `course_managers`).

**`/admin/cursos`**
- Manager vê só cursos onde é gestor. Botão "Novo curso" continua disponível (ao criar, trigger o registra como gestor).
- Botão "Editar" e switch de publicar disponíveis nos cursos dele; excluir também (RLS garante).

**`/admin/cursos/$courseId`**
- Sem mudança visual; RLS já bloqueia se o manager tentar acessar um curso não atribuído. Adicionar guarda: se `fetchCourse` retornar `null`, redirecionar com toast.
- Nova aba/seção **"Gestores"** visível **apenas para admin**: lista usuários com papel `manager`, permite marcar/desmarcar quem gerencia este curso (chama `assignCourseManager`).

**`/admin/usuarios`**
- Manager vê a lista, mas os botões "Promover a admin" / "Remover admin" ficam ocultos.
- Botão "Excluir" só aparece para alunos quando o usuário atual é manager. Diálogo "Novo usuário" mostra somente o papel `student` quando manager.
- Nova aba/tela **"Gestores"** apenas para admin (opcional; a atribuição já é feita na página do curso) — deixamos apenas um badge extra na lista para identificar gestores.

**`site-header.tsx`**
- Link "Admin" aparece quando `isAdmin || isManager`; rótulo "Painel".

## 4. Documentação
- `README.md`: descrever o papel Gestor, como o Admin atribui cursos e as limitações (não gerencia admins/gestores, não vê cursos de fora do seu escopo).

## 5. Validação
- Typecheck.
- Preview manual:
  1. Como super admin, criar um usuário admin — depois promovê-lo a `manager` (via novo botão na tela de usuários, admin-only).
  2. Atribuir 1 curso a esse manager em `/admin/cursos/$id` → aba Gestores.
  3. Logar como manager: deve ver só o curso atribuído + poder criar novo curso (vira gestor dele), editar módulos/aulas, publicar. Não deve ver outros cursos, nem conseguir editar via URL direta (RLS 0 rows).
  4. Manager cria aluno → sucesso. Tenta criar admin → erro. Tenta excluir admin → erro.
  5. Aluno comum ainda não acessa `/admin`.

## Nada muda
- Fluxo de aluno, player, regras de desbloqueio, seeds, super admin `dacmedia16@gmail.com`.

## Detalhes técnicos
- Enum: `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';` (rodar em migration própria, antes de usar em políticas — o Postgres exige commit).
- Trigger de auto-atribuição em `courses`: `AFTER INSERT ... WHEN (NOT has_role(auth.uid(),'admin')) EXECUTE FUNCTION register_course_manager();` (usa `auth.uid()` capturado no momento da inserção).
- Todas as novas funções: `SECURITY DEFINER`, `SET search_path = public`, `REVOKE EXECUTE ... FROM public, anon`.
