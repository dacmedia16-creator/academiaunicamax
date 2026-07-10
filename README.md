# RE/MAX Academy — Plataforma de treinamentos

Plataforma educacional responsiva com autenticação, cursos em vídeo, progresso
individual, desbloqueio sequencial de aulas e painel administrativo.

## Super administrador

O e-mail **dacmedia16@gmail.com** é promovido automaticamente a administrador
assim que se cadastra e confirma a conta (proteção server-side por trigger).
Basta acessar `/auth` e criar a conta com esse e-mail — o menu **Admin**
aparece automaticamente após o login.

## Criando novos usuários e administradores

Já dentro do painel, em **Admin → Usuários**:

- Botão **Novo usuário** cria contas com e-mail já confirmado (nome, e-mail,
  senha, papel Aluno/Admin).
- Cada linha da tabela permite promover/rebaixar admins ou excluir contas.
- O super administrador é protegido: não pode ser rebaixado nem excluído pela
  interface.

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
