-- Testes da Academia no HOMOLOG do ADM MAX (multiempresa ativa, 2 agências fictícias).
-- Tudo dentro de um único DO: no fim, RAISE EXCEPTION devolve o resultado e DESFAZ tudo (nada fica gravado).
-- Usuários fictícios do homolog (ids fixos). Inativo e ex-corretor são simulados com profiles.ativo=false
-- dentro da própria transação.
CREATE TEMP TABLE t_res (n serial, nome text, ok boolean);
GRANT ALL ON t_res TO authenticated, anon; GRANT ALL ON SEQUENCE t_res_n_seq TO authenticated, anon;

CREATE FUNCTION pg_temp.t_as(_uid text, _role text DEFAULT 'authenticated') RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub',_uid,'role',_role)::text, true);
  PERFORM set_config('request.jwt.claim.sub', coalesce(_uid,''), true);
  PERFORM set_config('role', _role, true);
END $$;
CREATE FUNCTION pg_temp.t_reset() RETURNS void LANGUAGE plpgsql AS $$
BEGIN PERFORM set_config('role', 'none', true);
      PERFORM set_config('request.jwt.claims', '', true); PERFORM set_config('request.jwt.claim.sub', '', true); END $$;
CREATE FUNCTION pg_temp.ok(_nome text, _ok boolean) RETURNS void LANGUAGE sql AS $$
  INSERT INTO t_res(nome, ok) VALUES (_nome, coalesce(_ok, false)) $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated, anon;

DO $t$
DECLARE
  plat   text := '0a321807-c739-4b26-89e7-6e6fdef00297'; -- Denis: super_admin + platform_admins (agência A)
  adm_a  text := '7dd997f7-2021-43ea-af9c-e758b826fcfd'; -- admin, agência A
  ges_a  text := 'cab7391a-463f-4d97-b99b-ced6e4696796'; -- gestor, agência A
  cor_a  text := '5745cbff-22b6-4a28-a515-dd6706504b8b'; -- corretor, agência A
  fin_a  text := 'b5ac36b2-ed7e-4bad-8c7f-4bfbf69ad6ed'; -- financeiro, agência A (vira aluno)
  ex_a   text := 'ebffaded-075c-493f-89e2-1d3d62901dc4'; -- ex-corretor (desligado aqui)
  ina_a  text := 'a742cfda-4731-4fa8-989a-374d2fdf0820'; -- inativo sem histórico
  adm_b  text := 'b3144521-7e3b-4f48-a1e0-29d90fd3f536'; -- admin, agência B
  cor_b  text := '23e65aaf-2614-463e-baec-cf562bb94244'; -- corretor, agência B
  org_a  uuid := '00000000-0000-4000-8000-000000000001';
  org_b  uuid := '2a000000-0000-4000-8000-0000000000b0';
  c_pub  uuid := '11111111-1111-4111-8111-111111111111';
  l1 uuid := '44444444-4444-4444-8444-444444444441';
  l2 uuid := '44444444-4444-4444-8444-444444444442';
  v int; j jsonb; failed boolean;
BEGIN
  -- ---------- fixtures (postgres) ----------
  INSERT INTO academia.courses (id, title, is_published) VALUES
    (c_pub,'Curso publicado',true), ('22222222-2222-4222-8222-222222222222','Curso rascunho',false);
  INSERT INTO academia.modules (id, course_id, title, sort_order) VALUES
    ('33333333-3333-4333-8333-333333333333', c_pub, 'M1', 1);
  INSERT INTO academia.lessons (id, module_id, title, video_provider, video_id, sort_order) VALUES
    (l1,'33333333-3333-4333-8333-333333333333','A1','cloudflare_stream','0123456789abcdef0123456789abcdef',1),
    (l2,'33333333-3333-4333-8333-333333333333','A2','cloudflare_stream','fedcba9876543210fedcba9876543210',2);
  -- ex-corretor: tinha histórico na agência A e foi desligado
  INSERT INTO academia.lesson_progress (organization_id, user_id, lesson_id, percent, completed, completed_at)
  VALUES (org_a, ex_a::uuid, l1, 100, true, now()), (org_a, ex_a::uuid, l2, 40, false, null);
  -- Desligamento feito "pelo admin" (a trava enforce_profiles_ativo_lock do ADM exige ator admin).
  PERFORM set_config('request.jwt.claims', json_build_object('sub',plat,'role','authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', plat, true);
  UPDATE public.profiles SET ativo = false WHERE id IN (ex_a::uuid, ina_a::uuid);
  PERFORM pg_temp.t_reset();

  -- ---------- plataforma (Denis) ----------
  PERFORM pg_temp.t_as(plat);
  PERFORM pg_temp.ok('plat: papel=platform', academia.current_role() = 'platform');
  PERFORM pg_temp.ok('plat: vê rascunho (2 cursos)', (SELECT count(*) FROM academia.courses) = 2);
  INSERT INTO academia.courses(title) VALUES ('Curso da plataforma');
  PERFORM pg_temp.ok('plat: cria curso', true);
  INSERT INTO academia.lesson_masters(lesson_id, master_ref) VALUES (l1, 'drive://academia/masters/a1.mp4');
  PERFORM pg_temp.ok('plat: registra master', (SELECT count(*) FROM academia.lesson_masters) = 1);
  PERFORM pg_temp.t_reset();

  -- ---------- admin A ----------
  PERFORM pg_temp.t_as(adm_a);
  PERFORM pg_temp.ok('adminA: papel=admin', academia.current_role() = 'admin');
  PERFORM pg_temp.ok('adminA: agência A', academia.current_org() = org_a);
  PERFORM pg_temp.ok('adminA: só publicados (1)', (SELECT count(*) FROM academia.courses) = 1);
  PERFORM pg_temp.ok('adminA: não vê masters', (SELECT count(*) FROM academia.lesson_masters) = 0);
  BEGIN INSERT INTO academia.courses(title) VALUES ('x'); PERFORM pg_temp.ok('adminA: não cria curso global', false);
  EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.ok('adminA: não cria curso global', true); END;
  PERFORM pg_temp.ok('adminA: list_org_people só da A',
    (SELECT count(*) FROM academia.list_org_people()) > 0
    AND NOT EXISTS (SELECT 1 FROM academia.list_org_people() p WHERE p.user_id IN (adm_b::uuid, cor_b::uuid)));
  PERFORM pg_temp.ok('adminA: list_org_people sem inativos',
    NOT EXISTS (SELECT 1 FROM academia.list_org_people() p WHERE p.user_id IN (ex_a::uuid, ina_a::uuid)));
  PERFORM pg_temp.t_reset();

  PERFORM pg_temp.t_as(ges_a);
  PERFORM pg_temp.ok('gestorA: papel=manager', academia.current_role() = 'manager');
  PERFORM pg_temp.t_reset();
  PERFORM pg_temp.t_as(fin_a);
  PERFORM pg_temp.ok('financeiroA: papel=student', academia.current_role() = 'student');
  PERFORM pg_temp.t_reset();

  -- ---------- corretor A (aluno) ----------
  PERFORM pg_temp.t_as(cor_a);
  PERFORM pg_temp.ok('corA: papel=student', academia.current_role() = 'student');
  PERFORM pg_temp.ok('corA: my_context org A', (academia.my_context()->>'organization_id')::uuid = org_a);
  PERFORM pg_temp.ok('corA: vê 2 aulas', (SELECT count(*) FROM academia.lessons) = 2);
  PERFORM pg_temp.ok('corA: A1 liberada', academia.is_lesson_unlocked(l1));
  PERFORM pg_temp.ok('corA: A2 travada', NOT academia.is_lesson_unlocked(l2));
  BEGIN PERFORM academia.save_progress(l2, 50, 10); PERFORM pg_temp.ok('corA: gravar A2 travada negado', false);
  EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.ok('corA: gravar A2 travada negado', true); END;
  BEGIN INSERT INTO academia.lesson_progress(organization_id,user_id,lesson_id,percent,completed)
        VALUES (org_a, cor_a::uuid, l2, 100, true);
        PERFORM pg_temp.ok('corA: escrita direta no progresso negada', false);
  EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.ok('corA: escrita direta no progresso negada', true); END;
  PERFORM pg_temp.ok('corA: save A1 95% conclui', (academia.save_progress(l1, 95, 300)).completed);
  PERFORM pg_temp.ok('corA: A2 liberada após concluir A1', academia.is_lesson_unlocked(l2));
  PERFORM pg_temp.ok('corA: matrícula automática na A',
    (SELECT organization_id FROM academia.enrollments WHERE user_id = cor_a::uuid AND course_id = c_pub) = org_a);
  PERFORM pg_temp.ok('corA: vê só o próprio progresso', (SELECT count(*) FROM academia.lesson_progress) = 1);
  PERFORM pg_temp.ok('corA: my_history = 1', (SELECT count(*) FROM academia.my_history()) = 1);
  BEGIN PERFORM academia.list_org_people(); PERFORM pg_temp.ok('corA: list_org_people negado', false);
  EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.ok('corA: list_org_people negado', true); END;
  PERFORM pg_temp.t_reset();

  -- ---------- corretor B ----------
  PERFORM pg_temp.t_as(cor_b);
  PERFORM pg_temp.ok('corB: org B', academia.current_org() = org_b);
  PERFORM pg_temp.ok('corB: mesmo catálogo global (1 curso)', (SELECT count(*) FROM academia.courses) = 1);
  PERFORM pg_temp.ok('corB: progresso gravado com org B', (academia.save_progress(l1, 50, 120)).organization_id = org_b);
  PERFORM pg_temp.ok('corB: não vê progresso da A', (SELECT count(*) FROM academia.lesson_progress WHERE organization_id = org_a) = 0);
  PERFORM pg_temp.t_reset();

  -- ---------- isolamento de relatórios ----------
  PERFORM pg_temp.t_as(adm_a);
  PERFORM pg_temp.ok('adminA: vê progresso da A (corA + ex)', (SELECT count(*) FROM academia.lesson_progress) = 3);
  PERFORM pg_temp.ok('adminA: zero progresso da B', (SELECT count(*) FROM academia.lesson_progress WHERE organization_id = org_b) = 0);
  BEGIN INSERT INTO academia.enrollments(organization_id, user_id, course_id) VALUES (org_a, cor_b::uuid, c_pub);
        PERFORM pg_temp.ok('adminA: não matricula corretor da B', false);
  EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.ok('adminA: não matricula corretor da B', true); END;
  INSERT INTO academia.enrollments(organization_id, user_id, course_id) VALUES (org_b, fin_a::uuid, c_pub);
  PERFORM pg_temp.ok('adminA: matricula pessoa da A (org forçada = A)',
    (SELECT organization_id FROM academia.enrollments WHERE user_id = fin_a::uuid) = org_a);
  PERFORM pg_temp.t_reset();

  PERFORM pg_temp.t_as(adm_b);
  PERFORM pg_temp.ok('adminB: vê só progresso da B (1)',
    (SELECT count(*) FROM academia.lesson_progress) = 1
    AND (SELECT count(*) FROM academia.lesson_progress WHERE organization_id = org_a) = 0);
  PERFORM pg_temp.ok('adminB: list_org_people só da B',
    NOT EXISTS (SELECT 1 FROM academia.list_org_people() p WHERE p.user_id IN (adm_a::uuid, cor_a::uuid)));
  PERFORM pg_temp.t_reset();

  PERFORM pg_temp.t_as(ges_a);
  PERFORM pg_temp.ok('gestorA: vê A, não B',
    (SELECT count(*) FROM academia.lesson_progress) = 3
    AND (SELECT count(*) FROM academia.lesson_progress WHERE organization_id = org_b) = 0);
  PERFORM pg_temp.t_reset();

  -- ---------- inativo ----------
  PERFORM pg_temp.t_as(ina_a);
  PERFORM pg_temp.ok('inativo: sem papel/agência', academia.current_role() IS NULL AND academia.current_org() IS NULL);
  PERFORM pg_temp.ok('inativo: sem catálogo', (SELECT count(*) FROM academia.courses) = 0 AND (SELECT count(*) FROM academia.lessons) = 0);
  BEGIN PERFORM academia.save_progress(l1, 10, 5); PERFORM pg_temp.ok('inativo: não grava', false);
  EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.ok('inativo: não grava', true); END;
  PERFORM pg_temp.t_reset();

  -- ---------- ex-corretor (decisão 4) ----------
  PERFORM pg_temp.t_as(ex_a);
  PERFORM pg_temp.ok('ex: perde catálogo', (SELECT count(*) FROM academia.courses) = 0 AND (SELECT count(*) FROM academia.lessons) = 0);
  PERFORM pg_temp.ok('ex: aula bloqueada', NOT academia.is_lesson_unlocked(l1));
  PERFORM pg_temp.ok('ex: lê o próprio histórico (2)', (SELECT count(*) FROM academia.my_history()) = 2);
  PERFORM pg_temp.ok('ex: histórico com título', (SELECT bool_and(course_title = 'Curso publicado') FROM academia.my_history()));
  PERFORM pg_temp.ok('ex: progresso próprio legível (2)', (SELECT count(*) FROM academia.lesson_progress) = 2);
  PERFORM pg_temp.t_reset();

  -- ---------- anon ----------
  PERFORM pg_temp.t_as(NULL, 'anon');
  BEGIN PERFORM count(*) FROM academia.courses; PERFORM pg_temp.ok('anon: sem acesso ao schema', false);
  EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.ok('anon: sem acesso ao schema', true); END;
  BEGIN PERFORM academia.my_context(); PERFORM pg_temp.ok('anon: sem RPC', false);
  EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.ok('anon: sem RPC', true); END;
  PERFORM pg_temp.t_reset();

  SELECT jsonb_build_object('total', count(*), 'pass', count(*) FILTER (WHERE ok),
           'falhas', coalesce(jsonb_agg(nome) FILTER (WHERE NOT ok), '[]'::jsonb)) INTO j FROM t_res;
  RAISE EXCEPTION 'RESULTADO %', j;   -- desfaz TUDO (fixtures, progresso, ativo=false)
END $t$;
