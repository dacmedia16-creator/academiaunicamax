# Academia Única MAX — saída do Lovable, Cloudflare, login único e multiempresa

Data: 01/10/2026. Status: etapas locais e testes no clone concluídos. Nada foi publicado e nada
foi alterado em produção, DNS ou Supabase.

## 1. Decisão (Opção A, aprovada por Denis)

A Academia passa a usar o Supabase do ADM MAX (xvvymgurpchhlmbpjbgc), no schema próprio `academia`.

- Login único: usa o mesmo auth.users do ADM. Quem tem conta no ADM entra na Academia com o
  mesmo e-mail e senha. A Academia não tem cadastro próprio.
- Papéis: não há tabela de papéis própria; eles são derivados do ADM por função.
  - platform_admins → plataforma (mantém o catálogo global)
  - admin/super_admin → admin da agência
  - gestor/coordenador/team_leader → gestor
  - demais papéis ativos → aluno
  - inativo no ADM → sem acesso
- Catálogo global (cursos, módulos e aulas) sem organization_id, mantido só pela plataforma.
  Matrículas e progresso ficam por agência (organization_id) e por usuário, com RLS.
- Campo reservado `courses.exclusive_organization_id` para cursos exclusivos, travado em NULL por
  CHECK até haver regra aprovada.
- Opção B (banco separado + ponte Conta MAX) foi descartada: tem mais peças, mais custo e
  sincronização de usuários.

Evidência de que não há dados a migrar: a chave pública do projeto Lovable (zdmsopxlzzuxdtbscjga)
retornou 0 linhas em courses, modules, lessons, profiles, user_roles e lesson_progress. Observação:
a RLS pode ocultar linhas do anon; a confirmação definitiva exige acesso ao painel, mas Denis já
informou que não há cadastros. O projeto Lovable não aparece em nenhuma conta Supabase do Denis
(403). Ele pertence ao Lovable Cloud e será abandonado, sem migração.

## 2. O que foi feito (local, branch `chore/desvincular-lovable`)

1. Lovable removido do código:
   - `@lovable.dev/vite-tanstack-config` substituído por um vite.config próprio
     (TanStack Start + Nitro cloudflare-module);
   - `lovable-error-reporting` removido;
   - URLs `*.lovable.app` trocadas por VITE_SITE_URL;
   - `.lovable` e as mensagens “Lovable Cloud” removidos.
2. `wrangler.toml` criado (Worker `academia-unica-max`, padrão ADM). O build e o tsc passam, e o
   artefato não contém a palavra “lovable”.
3. Migration `supabase/adm/20261001120000_academia_schema.sql` e rollback `.down.sql`.
4. Testes em `supabase/adm/tests/`.

Regras da migration, todas verificadas no clone:
- É só aditiva. Não faz ALTER em tabelas do ADM.
- Não cria trigger em auth.users: o único trigger existente é o `on_auth_user_created`, que já era
  do ADM. O `grant_super_admin_role` não foi portado.
- Não tem FK saindo do schema academia (0).
- Faz leitura do ADM somente por funções SECURITY DEFINER do próprio schema.
- Funciona com o ADM atual (agência histórica `00000000-0000-4000-8000-000000000001`) e também
  com o multiempresa: se `public.organization_members` existir, a função passa a usá-la sem
  nenhuma mudança na Academia. Não depende de RPC não publicada.
- Usa lock_timeout de 5s e statement_timeout de 60s.
- O rollback é o `.down.sql`: remove as policies do bucket, o bucket vazio e o schema academia.
- Gravação de progresso só pela RPC `save_progress`, que valida o desbloqueio sequencial.
  Escrita direta é negada.
- Bucket próprio `academia-materiais` (privado, 50 MB) somente para materiais (PDF). Vídeos ficam
  no Vimeo.

## 3. Evidências do clone

O clone `academia-clone` foi feito com docker `--network none`, a partir do dump de produção de
29/09: 135 usuários, última migration 20260929100000.

| Teste | Resultado |
|---|---|
| Papéis admin/gestor/corretor/plataforma/inativo/anon | 27/27 PASS |
| Isolamento entre 2 agências simuladas (organization_members criada e desfeita na transação) | 9/9 PASS |
| up 195 ms → down 157 ms → fingerprint do ADM (funções, policies, triggers, colunas, grants, buckets) | idêntico ao de antes |
| re-up após down | OK |
| Volume 600 agências: 540 mil progressos, 108 mil matrículas, 171 MB | seed em 12 s |
| Aluno lê o próprio progresso / catálogo | 0,2 ms / 4 ms |
| Admin lê relatório da agência | 0,2 ms |
| Leitura sem filtro (pior caso, só RLS) | 60–75 ms |
| Tela Vendas sem carga da Academia (162 execuções) | mediana 0,85 s, p95 1,07 s |
| Tela Vendas com 8 clientes gravando progresso sem pausa (≈800 tps, 135 mil transações, 0 falhas) | mediana 1,09 s, p95 1,40 s, máx 3,8 s, 0 erros — critério GO |

Achado corrigido: a primeira versão das policies chamava as funções de papel uma vez por linha.
No pior caso, o relatório levava 75 s. Com o padrão `(SELECT função())`, que a função avalia uma
vez por consulta, caiu para 60 ms. Ficou como regra para qualquer policy nova.

Leitura do impacto em Vendas: a carga de teste é cerca de 30 vezes maior que o pico previsto
(seção 5), e mesmo assim o p95 de Vendas subiu só 0,3 s, abaixo dos limites (p95 < 2 s,
máx < 4 s). Na carga real, o impacto esperado é desprezível. Mesmo assim, recomenda-se medir de
novo no homolog antes da produção.

## 4. Vimeo (decisão de Denis: conta única da MAX)

- No banco ficam só `vimeo_video_id` (numérico) e `vimeo_hash` (vídeo não listado) por aula.
- Embed `player.vimeo.com/video/{id}?h={hash}&dnt=1`. Na conta Vimeo, configurar:
  - privacidade “Hide from Vimeo”;
  - embed restrito a domínios: só o domínio da Academia e o localhost de homologação;
  - download desativado.
- Progresso pelo Vimeo Player SDK (@vimeo/player): ouvir `timeupdate`, `pause` e `ended`. Gravar
  a cada 60 s de reprodução, ao pausar, ao concluir (≥ 90% ou ended) e ao sair da página; nunca a
  cada segundo. Para retomar, usar `setCurrentTime(position_seconds)`.
- Plano: privacidade por domínio e “ocultar do Vimeo” existem só em planos pagos; o gratuito não
  serve. O plano mínimo e o limite de banda/visualizações do volume previsto precisam ser
  confirmados por Denis na página oficial de preços (vimeo.com/upgrade). Nesta execução não
  consegui extrair a página oficial, então não informo preço nem limite sem fonte. Nada foi
  contratado.

## 5. Escala (meta de 600 agências)

Premissas, a validar: 20 usuários por agência; 10% assistem por dia, 20 min cada; gravação a
cada 60 s.

| Agências | Usuários | Gravações/dia | Pico estimado | Linhas de progresso (90 aulas) | Banco |
|---|---|---|---|---|---|
| 50 | 1.000 | ~2.000 | < 1 tps | até 90 mil | ~30 MB |
| 200 | 4.000 | ~8.000 | ~1–2 tps | até 360 mil | ~115 MB |
| 600 | 12.000 | ~24.000 | ~5 tps | até 1,08 milhão | ~350 MB |

- O egress de vídeo no Supabase é zero, porque os vídeos ficam no Vimeo. O egress da Academia no
  Supabase é só JSON (KB por tela).
- O catálogo é pequeno e global. Cache no React Query (staleTime de 5 min) e, se preciso, cache
  no Worker/CDN para leituras do catálogo.
- Gatilhos para levar o schema academia a um projeto próprio:
  - CPU do banco acima de 70% por 15 min em horário comercial, com a Academia aparecendo no top 5
    de pg_stat_statements;
  - conexões da Academia acima de 20% do pool;
  - p95 de Vendas acima de 2 s atribuível à Academia;
  - tabela de progresso acima de 5 GB.
- Roteiro de separação: como não há FK nem join com o ADM, o caminho é:
  1. pg_dump do schema academia;
  2. novo projeto;
  3. trocar as funções `user_org`/`user_role` por leitura via JWT claims ou ponte;
  4. apontar o Worker.
- Monitoramento:
  - pg_stat_statements filtrado por `academia.`;
  - alertas do Supabase de CPU e conexões;
  - log de queries lentas acima de 500 ms;
  - p95 de Vendas no mesmo painel.

## 6. Pendente (próxima etapa, local)

- Adaptar o front ao schema academia. Usar `db.schema='academia'` ou `.schema('academia')`.
- Trocar useRoles/user_roles por `rpc('my_context')`.
- Remover o “Criar conta” e a tela de usuários/papéis, porque a gestão é feita no ADM.
- Trocar `course_managers` pelo papel de plataforma, `upsert_lesson_progress` por `save_progress`
  e `is_lesson_unlocked(_user_id, _lesson_id)` por `is_lesson_unlocked(_lesson)`.
- Trocar o player por @vimeo/player e o formulário de aula por ID/hash do Vimeo.
- Regenerar types.ts. Esses arquivos ainda usam o modelo antigo: a branch compila, mas o front não
  funciona contra o schema novo até essa adaptação.
- Testar no homolog do ADM (projeto separado, já existe credencial) com usuários de teste
  admin/gestor/corretor.

## 7. Decisões e aprovações de Denis

1. Aplicar a migration no homolog do ADM (ambiente de teste, sem produção).
2. Plano Vimeo a contratar, depois de conferir preço e limites na página oficial.
3. Domínio da Academia, por exemplo academia.<domínio ADM>, e DNS na Cloudflare.
4. Quem tem papel de plataforma: hoje é o conteúdo de `public.platform_admins`.
5. Ex-corretor desligado mantém a leitura do próprio histórico, mas perde o catálogo. Confirmar.
6. Na produção: migration em janela de baixo uso, deploy do Worker e DNS. Cada um com aprovação.

## 8. Rollback

- Banco: rodar o `20261001120000_academia_schema.down.sql`, com o bucket esvaziado antes pela API
  de Storage. Testado no clone: o fingerprint do ADM volta idêntico.
- App: o site Lovable continua no ar até o DNS novo ser aprovado. Para voltar, basta não apontar
  o DNS ou removê-lo.
