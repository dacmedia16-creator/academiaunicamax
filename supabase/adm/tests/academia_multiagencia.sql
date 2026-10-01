-- Isolamento entre agências com o ADM multiempresa simulado (public.organization_members criada
-- dentro da transação e desfeita no ROLLBACK). SOMENTE clone local.
-- Recebe :a_admin, :a_corr (agência A) e :b_admin, :b_corr (agência B).
\set ON_ERROR_STOP off
BEGIN;
CREATE SCHEMA t_aum; CREATE TABLE t_aum.r (n serial, nome text, ok boolean);
GRANT USAGE ON SCHEMA t_aum TO authenticated; GRANT ALL ON t_aum.r TO authenticated; GRANT ALL ON SEQUENCE t_aum.r_n_seq TO authenticated;
SELECT set_config('t.bc', :'b_corr', false);
CREATE TABLE public.organization_members (organization_id uuid, user_id uuid, ativo boolean DEFAULT true);
INSERT INTO public.organization_members VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', :'a_admin', true), ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', :'a_corr', true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', :'b_admin', true), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', :'b_corr', true);
INSERT INTO academia.courses (id, title, is_published) VALUES ('11111111-1111-4111-8111-111111111111','Global',true);
INSERT INTO academia.modules (id, course_id, title) VALUES ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','M');
INSERT INTO academia.lessons (id, module_id, title, vimeo_video_id) VALUES ('44444444-4444-4444-8444-444444444441','33333333-3333-4333-8333-333333333333','A1','1');

CREATE FUNCTION pg_temp.as_user(_uid text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN PERFORM set_config('request.jwt.claims', json_build_object('sub',_uid,'role','authenticated')::text, true); END $$;

SELECT pg_temp.as_user(:'a_corr'); SET LOCAL ROLE authenticated;
SELECT academia.save_progress('44444444-4444-4444-8444-444444444441', 100, 60);
INSERT INTO t_aum.r(nome,ok) SELECT 'A corretor: org = A', academia.current_org() = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
RESET ROLE;
SELECT pg_temp.as_user(:'b_corr'); SET LOCAL ROLE authenticated;
SELECT academia.save_progress('44444444-4444-4444-8444-444444444441', 40, 20);
INSERT INTO t_aum.r(nome,ok) SELECT 'B corretor: vê o mesmo catálogo global', (SELECT count(*) FROM academia.lessons) = 1;
INSERT INTO t_aum.r(nome,ok) SELECT 'B corretor: vê só o próprio progresso', (SELECT count(*) FROM academia.lesson_progress) = 1;
RESET ROLE;
SELECT pg_temp.as_user(:'a_admin'); SET LOCAL ROLE authenticated;
INSERT INTO t_aum.r(nome,ok) SELECT 'A admin: vê só progresso da A', (SELECT count(*) FROM academia.lesson_progress WHERE organization_id <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') = 0 AND (SELECT count(*) FROM academia.lesson_progress) = 1;
INSERT INTO t_aum.r(nome,ok) SELECT 'A admin: matrículas só da A', (SELECT count(*) FROM academia.enrollments) = 1;
INSERT INTO t_aum.r(nome,ok) SELECT 'A admin: lista pessoas só da A', NOT EXISTS (SELECT 1 FROM academia.list_org_people() p WHERE p.user_id IN (:'b_admin'::uuid, :'b_corr'::uuid));
DO $$ BEGIN
  BEGIN INSERT INTO academia.enrollments(user_id, course_id) VALUES (current_setting('t.bc')::uuid, '11111111-1111-4111-8111-111111111111');
        INSERT INTO t_aum.r(nome,ok) VALUES ('A admin: não matricula corretor da B', false);
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_aum.r(nome,ok) VALUES ('A admin: não matricula corretor da B', true); END;
END $$;
RESET ROLE;
SELECT pg_temp.as_user(:'b_admin'); SET LOCAL ROLE authenticated;
INSERT INTO t_aum.r(nome,ok) SELECT 'B admin: vê só progresso da B', (SELECT count(*) FROM academia.lesson_progress) = 1
  AND (SELECT bool_and(organization_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') FROM academia.lesson_progress);
RESET ROLE;
-- desligar o vínculo: ex-membro perde acesso
UPDATE public.organization_members SET ativo = false WHERE user_id = :'b_corr';
SELECT pg_temp.as_user(:'b_corr'); SET LOCAL ROLE authenticated;
INSERT INTO t_aum.r(nome,ok) SELECT 'B corretor desligado: sem catálogo (mantém leitura do próprio histórico)', (SELECT count(*) FROM academia.lessons) = 0 AND (SELECT count(*) FROM academia.lesson_progress) = 1;
RESET ROLE;
SELECT CASE WHEN ok THEN 'PASS ' ELSE 'FAIL ' END || nome FROM t_aum.r ORDER BY n;
SELECT 'RESULTADO ' || count(*) FILTER (WHERE ok) || '/' || count(*) FROM t_aum.r;
ROLLBACK;
