## Objetivo
Tornar `dacmedia16@gmail.com` o super administrador da plataforma, com acesso total e capacidade de criar novos usuários diretamente pela interface.

## O que será feito

### 1. Banco de dados (migration)
- Garantir promoção automática do e-mail `dacmedia16@gmail.com` a `admin` sempre que ele se cadastrar/logar, via trigger em `auth.users` (verificando `email_confirmed_at` para evitar escalada de privilégio por e-mails não verificados). Se o usuário já existir, promover imediatamente na própria migration.
- Criar RPC `admin_create_user(email, password, full_name, role)` como `SECURITY DEFINER`, restrita a quem já é admin (`has_role(auth.uid(), 'admin')`), que:
  - cria o usuário via `auth.admin` não é acessível em SQL → usaremos abordagem via server function (ver item 2). A migration cobrirá apenas a promoção automática + RPC auxiliar `admin_set_user_role(user_id, role)` para promover/rebaixar admins existentes.
- Nenhuma alteração de RLS necessária — as políticas atuais já dão acesso total ao admin.

### 2. Server function para criar usuários
- Nova server function `createUserAsAdmin` em `src/lib/admin-users.functions.ts`:
  - protegida por `requireSupabaseAuth` + checagem `has_role(userId,'admin')`;
  - carrega `supabaseAdmin` dentro do handler (`await import(...)`) e chama `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`;
  - opcionalmente insere role `admin` em `user_roles` se solicitado;
  - retorna o novo `user_id` / erro tratado.
- Nova server function `setUserRole` para o admin promover/rebaixar (`admin`/`student`) qualquer usuário via mesma proteção.

### 3. UI do painel admin
- Em `/admin/usuarios`:
  - Botão "Novo usuário" abrindo dialog com campos: nome, e-mail, senha, papel (aluno/admin). Ao confirmar, chama `createUserAsAdmin` e revalida a lista.
  - Em cada linha da tabela, menu de ações: "Tornar admin" / "Remover admin" chamando `setUserRole`. O próprio super admin não pode se rebaixar.
  - Toasts de sucesso/erro, validação simples de senha (mín. 8), loading states.

### 4. Documentação
- Atualizar `README.md`: `dacmedia16@gmail.com` é super admin automático; novos admins podem ser criados pela própria tela `/admin/usuarios`, sem SQL manual.

## Validação
- Typecheck.
- Verificar migration aplicada e trigger promovendo o e-mail alvo.
- Testar no preview: logar como super admin → abrir `/admin/usuarios` → criar novo usuário aluno e novo admin → confirmar que aparecem na lista e conseguem logar.
- Confirmar que um usuário `student` não consegue chamar `createUserAsAdmin` (erro 401/403).

## Nada muda
- Regras de desbloqueio, player, RLS de conteúdo, seeds e demais telas permanecem iguais.
