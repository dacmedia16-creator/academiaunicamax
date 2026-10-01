-- Testes da Academia (SOMENTE clone local). Tudo em transação com ROLLBACK.
-- Recebe :admin_uid, :gestor_uid, :corretor_uid, :platform_uid, :inativo_uid (usuários reais do clone, por papel).
\set ON_ERROR_STOP off
BEGIN;
CREATE SCHEMA t_aum; CREATE TABLE t_aum.r (n serial, nome text, ok boolean);
GRANT USAGE ON SCHEMA t_aum TO authenticated, anon;
GRANT ALL ON t_aum.r TO authenticated, anon; GRANT ALL ON SEQUENCE t_aum.r_n_seq TO authenticated, anon;

-- fixtures do catálogo (como postgres: auth.uid() nulo; RLS não se aplica ao dono)
INSERT INTO academia.courses (id, title, is_published) VALUES
  ('11111111-1111-4111-8111-111111111111','Curso publicado',true),
  ('22222222-2222-4222-8222-222222222222','Curso rascunho',false);
INSERT INTO academia.modules (id, course_id, title, sort_order) VALUES
  ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','M1',1);
INSERT INTO academia.lessons (id, module_id, title, vimeo_video_id, sort_order) VALUES
  ('44444444-4444-4444-8444-444444444441','33333333-3333-4333-8333-333333333333','A1','76979871',1),
  ('44444444-4444-4444-8444-444444444442','33333333-3333-4333-8333-333333333333','A2','76979872',2);
-- progresso de "outra agência" (simulada) para testar isolamento
INSERT INTO academia.lesson_progress (organization_id, user_id, lesson_id, percent, completed)
VALUES ('99999999-9999-4999-8999-999999999999', gen_random_uuid(), '44444444-4444-4444-8444-444444444441', 100, true);

CREATE FUNCTION pg_temp.as_user(_uid text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub',_uid,'role','authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', _uid, true);
END $$;

-- ---------- papéis derivados ----------
SELECT pg_temp.as_user(:'platform_uid'); SET LOCAL ROLE authenticated;
INSERT INTO t_aum.r(nome,ok) SELECT 'platform: papel=platform', academia.current_role() = 'platform';
INSERT INTO t_aum.r(nome,ok) SELECT 'platform: vê rascunho', (SELECT count(*) FROM academia.courses) = 2;
RESET ROLE;

SELECT pg_temp.as_user(:'admin_uid'); SET LOCAL ROLE authenticated;
INSERT INTO t_aum.r(nome,ok) SELECT 'admin: papel=admin', academia.current_role() = 'admin';
INSERT INTO t_aum.r(nome,ok) SELECT 'admin: agência legada', academia.current_org() = academia.legacy_org_id();
INSERT INTO t_aum.r(nome,ok) SELECT 'admin: só curso publicado', (SELECT count(*) FROM academia.courses) = 1;
INSERT INTO t_aum.r(nome,ok) SELECT 'admin: não vê progresso de outra agência', (SELECT count(*) FROM academia.lesson_progress) = 0;
INSERT INTO t_aum.r(nome,ok) SELECT 'admin: lista pessoas da agência', (SELECT count(*) FROM academia.list_org_people()) > 0;
RESET ROLE;

SELECT pg_temp.as_user(:'gestor_uid'); SET LOCAL ROLE authenticated;
INSERT INTO t_aum.r(nome,ok) SELECT 'gestor: papel=manager', academia.current_role() = 'manager';
RESET ROLE;

-- ---------- corretor: aluno ----------
SELECT pg_temp.as_user(:'corretor_uid'); SET LOCAL ROLE authenticated;
INSERT INTO t_aum.r(nome,ok) SELECT 'corretor: papel=student', academia.current_role() = 'student';
INSERT INTO t_aum.r(nome,ok) SELECT 'corretor: vê 2 aulas publicadas', (SELECT count(*) FROM academia.lessons) = 2;
INSERT INTO t_aum.r(nome,ok) SELECT 'corretor: A1 liberada', academia.is_lesson_unlocked('44444444-4444-4444-8444-444444444441');
INSERT INTO t_aum.r(nome,ok) SELECT 'corretor: A2 travada', NOT academia.is_lesson_unlocked('44444444-4444-4444-8444-444444444442');
DO $$ BEGIN
  BEGIN PERFORM academia.save_progress('44444444-4444-4444-8444-444444444442', 50, 10);
        INSERT INTO t_aum.r(nome,ok) VALUES ('corretor: gravar A2 travada é negado', false);
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_aum.r(nome,ok) VALUES ('corretor: gravar A2 travada é negado', true); END;
  BEGIN INSERT INTO academia.courses(title) VALUES ('x');
        INSERT INTO t_aum.r(nome,ok) VALUES ('corretor: não cria curso', false);
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_aum.r(nome,ok) VALUES ('corretor: não cria curso', true); END;
  BEGIN INSERT INTO academia.lesson_progress(organization_id,user_id,lesson_id,percent,completed)
        VALUES (academia.legacy_org_id(), auth.uid(), '44444444-4444-4444-8444-444444444442', 100, true);
        INSERT INTO t_aum.r(nome,ok) VALUES ('corretor: não escreve progresso direto', false);
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_aum.r(nome,ok) VALUES ('corretor: não escreve progresso direto', true); END;
  BEGIN PERFORM academia.list_org_people();
        INSERT INTO t_aum.r(nome,ok) VALUES ('corretor: não lista pessoas', false);
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_aum.r(nome,ok) VALUES ('corretor: não lista pessoas', true); END;
END $$;
SELECT academia.save_progress('44444444-4444-4444-8444-444444444441', 95, 170);
INSERT INTO t_aum.r(nome,ok) SELECT 'corretor: concluiu A1', (SELECT completed FROM academia.lesson_progress WHERE lesson_id='44444444-4444-4444-8444-444444444441' AND user_id=auth.uid());
INSERT INTO t_aum.r(nome,ok) SELECT 'corretor: matrícula automática', (SELECT count(*) FROM academia.enrollments WHERE user_id=auth.uid()) = 1;
INSERT INTO t_aum.r(nome,ok) SELECT 'corretor: A2 liberada após A1', academia.is_lesson_unlocked('44444444-4444-4444-8444-444444444442');
INSERT INTO t_aum.r(nome,ok) SELECT 'corretor: vê só o próprio progresso', (SELECT count(*) FROM academia.lesson_progress) = 1;
RESET ROLE;

-- admin da mesma agência vê o progresso do corretor; gestor também
SELECT pg_temp.as_user(:'admin_uid'); SET LOCAL ROLE authenticated;
INSERT INTO t_aum.r(nome,ok) SELECT 'admin: vê progresso do corretor da agência', (SELECT count(*) FROM academia.lesson_progress) = 1;
DO $$ BEGIN
  BEGIN INSERT INTO academia.courses(title) VALUES ('x');
        INSERT INTO t_aum.r(nome,ok) VALUES ('admin da agência: não edita catálogo global', false);
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_aum.r(nome,ok) VALUES ('admin da agência: não edita catálogo global', true); END;
END $$;
RESET ROLE;
SELECT pg_temp.as_user(:'gestor_uid'); SET LOCAL ROLE authenticated;
INSERT INTO t_aum.r(nome,ok) SELECT 'gestor: vê progresso da agência', (SELECT count(*) FROM academia.lesson_progress) = 1;
RESET ROLE;

-- usuário inativo no ADM: sem acesso
SELECT pg_temp.as_user(:'inativo_uid'); SET LOCAL ROLE authenticated;
INSERT INTO t_aum.r(nome,ok) SELECT 'inativo: sem agência/papel', academia.current_org() IS NULL AND academia.current_role() IS NULL;
INSERT INTO t_aum.r(nome,ok) SELECT 'inativo: não vê catálogo', (SELECT count(*) FROM academia.courses) = 0;
RESET ROLE;

-- anon: sem acesso ao schema
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM 1 FROM academia.courses; INSERT INTO t_aum.r(nome,ok) VALUES ('anon: sem acesso', false);
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_aum.r(nome,ok) VALUES ('anon: sem acesso', true); END;
END $$;
RESET ROLE;

-- curso exclusivo reservado (travado)
DO $$ BEGIN
  BEGIN UPDATE academia.courses SET exclusive_organization_id = gen_random_uuid();
        INSERT INTO t_aum.r(nome,ok) VALUES ('exclusive_organization_id travado em NULL', false);
  EXCEPTION WHEN check_violation THEN INSERT INTO t_aum.r(nome,ok) VALUES ('exclusive_organization_id travado em NULL', true); END;
END $$;

SELECT CASE WHEN ok THEN 'PASS ' ELSE 'FAIL ' END || nome FROM t_aum.r ORDER BY n;
SELECT 'RESULTADO ' || count(*) FILTER (WHERE ok) || '/' || count(*) FROM t_aum.r;
ROLLBACK;
