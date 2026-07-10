# RE/MAX Academy — Plataforma de treinamentos

Plataforma educacional responsiva com autenticação, cursos em vídeo, progresso
individual, desbloqueio sequencial de aulas e painel administrativo.

## Como definir o primeiro administrador

Por segurança, um novo usuário nunca pode se auto-promover a administrador.
Para nomear o primeiro admin:

1. Cadastre-se normalmente pela tela `/auth`.
2. Na Lovable Cloud, execute a instrução SQL abaixo (substitua o `user_id`
   correto — você encontra em **Users**):

```sql
insert into public.user_roles (user_id, role)
values ('<UUID_DO_USUARIO>', 'admin')
on conflict do nothing;
```

3. Faça logout/login. O menu **Admin** passará a aparecer.

Novos administradores podem ser gerenciados pelo mesmo comando ou (futuramente)
pela própria interface.

## Estrutura

- **profiles** — nome, e-mail e avatar do usuário.
- **user_roles** — papéis (`admin` | `student`) por usuário.
- **courses / modules / lessons** — conteúdo em três níveis.
- **lesson_progress** — progresso individual (único por usuário/aula).

Funções server-side (`is_lesson_unlocked`, `upsert_lesson_progress`) validam
regras no banco: RLS protege leitura e escrita, e o desbloqueio é decidido no
servidor — mudar dados no navegador não libera nada.
