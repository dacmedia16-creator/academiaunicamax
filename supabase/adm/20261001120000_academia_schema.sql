-- Academia Única MAX dentro do Supabase do ADM MAX (Opção A, aprovada por Denis em 01/10/2026).
--
-- Modelo (decisão de Denis, 01/10):
--   * Catálogo GLOBAL (cursos, módulos, aulas) sem organization_id, mantido só pelo super admin da
--     plataforma (public.platform_admins). Vídeos numa única conta Vimeo da MAX (só ID/hash no banco).
--   * Matrículas e progresso POR AGÊNCIA (organization_id) e por usuário, com RLS.
--   * Campo reservado courses.exclusive_organization_id para cursos exclusivos no futuro (travado em NULL).
--
-- Regras para não afetar o ADM MAX:
--   * Aditiva: cria o schema `academia`, seus objetos e o bucket `academia-materiais`. Nenhum ALTER no ADM.
--   * Sem trigger em auth.users e sem FK para auth.users/tabelas do ADM (FK geraria trigger interno e lock).
--   * Papel e agência lidos do ADM só por funções SECURITY DEFINER deste schema (somente leitura).
--   * Compatível com o ADM atual (sem multiempresa) e com o multiempresa: se public.organization_members
--     existir, ela é usada; senão, a agência é a histórica 00000000-0000-4000-8000-000000000001.
--   * Rollback: 20261001120000_academia_schema.down.sql.
SET lock_timeout = '5s';
SET statement_timeout = '60s';

CREATE SCHEMA academia;
REVOKE ALL ON SCHEMA academia FROM PUBLIC;
GRANT USAGE ON SCHEMA academia TO authenticated, service_role;

-- ============================================================================================
-- Leitura do ADM (somente leitura). Nada além destas funções toca tabelas do ADM.
-- ============================================================================================
CREATE FUNCTION academia.legacy_org_id() RETURNS uuid
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT '00000000-0000-4000-8000-000000000001'::uuid
$$;

-- Agência do usuário. Usuário inativo no ADM (profiles.ativo <> true) não tem agência => sem acesso.
CREATE FUNCTION academia.user_org(_user uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE _org uuid; _ativo boolean;
BEGIN
  IF _user IS NULL THEN RETURN NULL; END IF;
  SELECT p.ativo INTO _ativo FROM public.profiles p WHERE p.id = _user;
  IF _ativo IS NOT TRUE THEN RETURN NULL; END IF;
  IF to_regclass('public.organization_members') IS NOT NULL THEN
    EXECUTE 'SELECT organization_id FROM public.organization_members WHERE user_id = $1 AND ativo LIMIT 1'
      INTO _org USING _user;
    RETURN _org;
  END IF;
  RETURN academia.legacy_org_id();
END;
$$;

CREATE FUNCTION academia.is_platform_admin(_user uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE _r boolean := false;
BEGIN
  IF _user IS NULL OR to_regclass('public.platform_admins') IS NULL THEN RETURN false; END IF;
  EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = $1)' INTO _r USING _user;
  RETURN coalesce(_r, false);
END;
$$;

-- Papel na Academia, derivado dos papéis do ADM (sem tabela de papéis própria):
--   public.platform_admins                 -> 'platform' (mantém o catálogo global)
--   admin / super_admin                    -> 'admin'    (relatórios e matrículas da própria agência)
--   gestor / coordenador / team_leader     -> 'manager'  (relatórios e matrículas da própria agência)
--   demais papéis, usuário ativo           -> 'student'
CREATE FUNCTION academia.user_role(_user uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN academia.is_platform_admin(_user) THEN 'platform'
    WHEN academia.user_org(_user) IS NULL THEN NULL
    WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user
                 AND r.role::text IN ('admin','super_admin')) THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user
                 AND r.role::text IN ('gestor','coordenador','team_leader')) THEN 'manager'
    ELSE 'student'
  END
$$;

CREATE FUNCTION academia.current_org() RETURNS uuid
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT academia.user_org(auth.uid()) $$;

CREATE FUNCTION academia.current_role() RETURNS text
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT academia.user_role(auth.uid()) $$;

CREATE FUNCTION academia.is_platform() RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT academia.is_platform_admin(auth.uid()) $$;

-- Pode ver relatório / matricular pessoas da agência informada?
CREATE FUNCTION academia.can_manage_org(_org uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT _org IS NOT NULL AND (
    academia.is_platform()
    OR (_org = academia.current_org() AND academia.current_role() IN ('admin','manager')))
$$;

-- Agência que o usuário atual pode gerenciar (admin/gestor), ou NULL. Usada nas policies dentro de
-- (SELECT ...) para ser avaliada UMA vez por consulta, não por linha (medido no clone: 75 s -> ms).
CREATE FUNCTION academia.managed_org() RETURNS uuid
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT CASE WHEN academia.current_role() IN ('admin','manager') THEN academia.current_org() END
$$;

CREATE FUNCTION academia.my_context() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('user_id', auth.uid(), 'organization_id', academia.user_org(auth.uid()),
                            'role', academia.user_role(auth.uid()),
                            'nome', (SELECT p.nome FROM public.profiles p WHERE p.id = auth.uid()))
$$;

-- Pessoas da própria agência (nome/e-mail) para relatórios e matrícula. Só admin/gestor/plataforma.
CREATE FUNCTION academia.list_org_people() RETURNS TABLE (user_id uuid, nome text, email text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE _org uuid := academia.user_org(auth.uid());
BEGIN
  IF NOT academia.can_manage_org(_org) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.nome, p.email, academia.user_role(p.id)
    FROM public.profiles p
    WHERE p.ativo IS TRUE AND academia.user_org(p.id) = _org
    ORDER BY p.nome;
END;
$$;

-- ============================================================================================
-- Catálogo global
-- ============================================================================================
CREATE TABLE academia.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_url text,
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  -- Reservado: curso exclusivo de uma agência (futuro). Travado em NULL até a regra ser aprovada.
  exclusive_organization_id uuid,
  CONSTRAINT courses_exclusive_reserved CHECK (exclusive_organization_id IS NULL),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE academia.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academia.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academia_modules_course_idx ON academia.modules (course_id, sort_order);

-- Vídeo: somente Vimeo (conta única da MAX). ID numérico e, para vídeo "não listado", o hash h=.
CREATE TABLE academia.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES academia.modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  vimeo_video_id text NOT NULL DEFAULT '' CHECK (vimeo_video_id ~ '^[0-9]*$'),
  vimeo_hash text CHECK (vimeo_hash IS NULL OR vimeo_hash ~ '^[0-9a-f]{6,20}$'),
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academia_lessons_module_idx ON academia.lessons (module_id, sort_order);

-- ============================================================================================
-- Por agência e por usuário
-- ============================================================================================
CREATE TABLE academia.enrollments (
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES academia.courses(id) ON DELETE CASCADE,
  enrolled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
CREATE INDEX academia_enroll_org_user_idx ON academia.enrollments (organization_id, user_id);
CREATE INDEX academia_enroll_org_course_idx ON academia.enrollments (organization_id, course_id);

CREATE TABLE academia.lesson_progress (
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES academia.lessons(id) ON DELETE CASCADE,
  percent numeric(5,2) NOT NULL DEFAULT 0,
  position_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX academia_progress_org_user_idx ON academia.lesson_progress (organization_id, user_id);
CREATE INDEX academia_progress_lesson_idx ON academia.lesson_progress (lesson_id);

-- Matrícula: organization_id sempre derivado do usuário matriculado, no servidor.
CREATE FUNCTION academia.tg_enrollment_org() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.organization_id := academia.user_org(NEW.user_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'usuário sem agência ativa' USING ERRCODE = '42501';
  END IF;
  NEW.enrolled_by := coalesce(auth.uid(), NEW.enrolled_by);
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_org BEFORE INSERT OR UPDATE ON academia.enrollments
  FOR EACH ROW EXECUTE FUNCTION academia.tg_enrollment_org();

-- ============================================================================================
-- RLS
-- ============================================================================================
ALTER TABLE academia.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE academia.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE academia.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE academia.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academia.lesson_progress ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON academia.courses, academia.modules, academia.lessons TO authenticated;
GRANT SELECT, INSERT, DELETE ON academia.enrollments TO authenticated;
GRANT SELECT ON academia.lesson_progress TO authenticated;   -- escrita só pela RPC save_progress
GRANT ALL ON ALL TABLES IN SCHEMA academia TO service_role;

-- Catálogo: qualquer usuário ativo (com agência) vê o publicado; a plataforma vê e edita tudo.
-- Padrão de desempenho: toda função de contexto vai dentro de (SELECT ...) -> vira InitPlan,
-- avaliada uma vez por consulta (recomendação oficial Supabase para RLS).
CREATE POLICY courses_select ON academia.courses FOR SELECT TO authenticated USING (
  (SELECT academia.is_platform()) OR (is_published AND (SELECT academia.current_org()) IS NOT NULL));
CREATE POLICY courses_write ON academia.courses FOR ALL TO authenticated
  USING ((SELECT academia.is_platform())) WITH CHECK ((SELECT academia.is_platform()));

CREATE POLICY modules_select ON academia.modules FOR SELECT TO authenticated USING (
  (SELECT academia.is_platform()) OR ((SELECT academia.current_org()) IS NOT NULL
    AND EXISTS (SELECT 1 FROM academia.courses c WHERE c.id = course_id AND c.is_published)));
CREATE POLICY modules_write ON academia.modules FOR ALL TO authenticated
  USING ((SELECT academia.is_platform())) WITH CHECK ((SELECT academia.is_platform()));

CREATE POLICY lessons_select ON academia.lessons FOR SELECT TO authenticated USING (
  (SELECT academia.is_platform()) OR (is_published AND (SELECT academia.current_org()) IS NOT NULL
    AND EXISTS (SELECT 1 FROM academia.modules m JOIN academia.courses c ON c.id = m.course_id
                WHERE m.id = module_id AND c.is_published)));
CREATE POLICY lessons_write ON academia.lessons FOR ALL TO authenticated
  USING ((SELECT academia.is_platform())) WITH CHECK ((SELECT academia.is_platform()));

-- Matrículas: o próprio aluno; admin/gestor da mesma agência; a plataforma.
CREATE POLICY enroll_select ON academia.enrollments FOR SELECT TO authenticated USING (
  user_id = (SELECT auth.uid()) OR (SELECT academia.is_platform())
  OR organization_id = (SELECT academia.managed_org()));
CREATE POLICY enroll_insert ON academia.enrollments FOR INSERT TO authenticated WITH CHECK (
  (user_id = (SELECT auth.uid()) AND (SELECT academia.current_org()) IS NOT NULL)
  OR academia.can_manage_org(academia.user_org(user_id)));
CREATE POLICY enroll_delete ON academia.enrollments FOR DELETE TO authenticated USING (
  (SELECT academia.is_platform()) OR organization_id = (SELECT academia.managed_org()));

-- Progresso: o próprio; admin/gestor da mesma agência; a plataforma (relatório geral).
CREATE POLICY progress_select ON academia.lesson_progress FOR SELECT TO authenticated USING (
  user_id = (SELECT auth.uid()) OR (SELECT academia.is_platform())
  OR organization_id = (SELECT academia.managed_org()));

-- ============================================================================================
-- Regras de negócio no servidor
-- ============================================================================================
CREATE FUNCTION academia.is_lesson_unlocked(_lesson uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE _course uuid; _ids uuid[]; _idx int; _prev boolean;
BEGIN
  IF academia.current_org() IS NULL THEN RETURN false; END IF;
  SELECT m.course_id INTO _course FROM academia.lessons l JOIN academia.modules m ON m.id = l.module_id
   JOIN academia.courses c ON c.id = m.course_id
   WHERE l.id = _lesson AND l.is_published AND c.is_published;
  IF _course IS NULL THEN RETURN false; END IF;
  SELECT array_agg(l.id ORDER BY m.sort_order, l.sort_order, l.created_at) INTO _ids
    FROM academia.lessons l JOIN academia.modules m ON m.id = l.module_id
   WHERE m.course_id = _course AND l.is_published;
  _idx := array_position(_ids, _lesson);
  IF _idx IS NULL THEN RETURN false; END IF;
  IF _idx = 1 THEN RETURN true; END IF;
  SELECT lp.completed INTO _prev FROM academia.lesson_progress lp
   WHERE lp.user_id = auth.uid() AND lp.lesson_id = _ids[_idx - 1];
  RETURN coalesce(_prev, false);
END;
$$;

-- Gravação moderada: o frontend chama ao pausar, ao concluir (evento "ended" ou >= 90%) e no máximo
-- a cada 60 s. O servidor ignora regravação < 30 s da anterior que não muda a conclusão.
-- A matrícula é criada automaticamente na primeira gravação.
CREATE FUNCTION academia.save_progress(_lesson uuid, _percent numeric, _position integer)
RETURNS academia.lesson_progress
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE _uid uuid := auth.uid(); _org uuid := academia.current_org(); _pct numeric; _done boolean;
        _course uuid; _row academia.lesson_progress;
BEGIN
  IF _uid IS NULL OR _org IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT academia.is_lesson_unlocked(_lesson) THEN RAISE EXCEPTION 'lesson locked' USING ERRCODE = '42501'; END IF;
  _pct := greatest(0, least(100, coalesce(_percent, 0)));
  _done := _pct >= 90;
  SELECT m.course_id INTO _course FROM academia.lessons l JOIN academia.modules m ON m.id = l.module_id
   WHERE l.id = _lesson;
  INSERT INTO academia.enrollments (organization_id, user_id, course_id, enrolled_by)
  VALUES (_org, _uid, _course, _uid) ON CONFLICT DO NOTHING;
  INSERT INTO academia.lesson_progress AS lp
    (organization_id, user_id, lesson_id, percent, position_seconds, completed, completed_at, last_watched_at)
  VALUES (_org, _uid, _lesson, _pct, greatest(0, coalesce(_position, 0)), _done,
          CASE WHEN _done THEN now() END, now())
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    percent = greatest(lp.percent, excluded.percent),
    position_seconds = excluded.position_seconds,
    completed = lp.completed OR excluded.completed,
    completed_at = coalesce(lp.completed_at, CASE WHEN excluded.completed THEN now() END),
    last_watched_at = now()
  WHERE lp.last_watched_at < now() - interval '30 seconds' OR (excluded.completed AND NOT lp.completed)
  RETURNING * INTO _row;
  IF _row IS NULL THEN
    SELECT * INTO _row FROM academia.lesson_progress WHERE user_id = _uid AND lesson_id = _lesson;
  END IF;
  RETURN _row;
END;
$$;

-- Limpeza periódica de dados de usuários removidos do ADM (substitui a FK para auth.users).
CREATE FUNCTION academia.purge_orphans() RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a int; b int;
BEGIN
  DELETE FROM academia.lesson_progress lp WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = lp.user_id);
  GET DIAGNOSTICS a = ROW_COUNT;
  DELETE FROM academia.enrollments e WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = e.user_id);
  GET DIAGNOSTICS b = ROW_COUNT;
  RETURN a + b;
END;
$$;

-- Permissões das funções: nada para PUBLIC/anon.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA academia FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION academia.current_org(), academia.current_role(), academia.is_platform(), academia.managed_org(),
  academia.can_manage_org(uuid), academia.my_context(), academia.list_org_people(),
  academia.is_lesson_unlocked(uuid), academia.save_progress(uuid, numeric, integer),
  academia.user_org(uuid), academia.user_role(uuid), academia.is_platform_admin(uuid),
  academia.legacy_org_id()
  TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA academia TO service_role;
-- purge_orphans e os triggers ficam só com service_role (agendamento externo).

-- ============================================================================================
-- Storage próprio (materiais de apoio globais; vídeos no Vimeo). Caminho: <curso>/<arquivo>
-- ============================================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('academia-materiais', 'academia-materiais', false, 52428800);

CREATE POLICY academia_materiais_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'academia-materiais' AND ((SELECT academia.current_org()) IS NOT NULL OR (SELECT academia.is_platform())));
CREATE POLICY academia_materiais_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'academia-materiais' AND (SELECT academia.is_platform()));
CREATE POLICY academia_materiais_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'academia-materiais' AND (SELECT academia.is_platform()))
  WITH CHECK (bucket_id = 'academia-materiais' AND (SELECT academia.is_platform()));
CREATE POLICY academia_materiais_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'academia-materiais' AND (SELECT academia.is_platform()));
