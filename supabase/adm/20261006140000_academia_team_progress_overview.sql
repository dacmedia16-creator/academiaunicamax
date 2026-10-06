-- Tela "Minha equipe": visão de progresso por pessoa, somente leitura.
-- Escopo: plataforma = todas as pessoas ativas com organização; admin da imobiliária = a própria
-- organização; manager = academia.my_led_team_member_ids(); corretor = forbidden.
-- Aditiva: não altera tabelas, policies nem o schema public. Rollback: arquivo .down.sql.
BEGIN;
CREATE FUNCTION academia.team_progress_overview()
RETURNS TABLE (
  user_id uuid,
  nome text,
  organization_id uuid,
  organization_nome text,
  team_id uuid,
  team_nome text,
  completed_lessons integer,
  total_lessons integer,
  current_lesson_id uuid,
  current_lesson_title text,
  current_lesson_position integer,
  current_lesson_in_progress boolean,
  last_activity_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _uid uuid := auth.uid();
  _role text := academia.user_role(auth.uid());
  _org uuid := academia.user_org(auth.uid());
BEGIN
  IF _uid IS NULL OR NOT public.academia_has_active_adm_access()
     OR _role IS NULL OR _role NOT IN ('platform', 'admin', 'manager')
     OR (_role <> 'platform' AND _org IS NULL) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH people AS (
    SELECT p.id, p.nome, academia.user_org(p.id) AS org
    FROM public.profiles p
    WHERE p.ativo IS TRUE
      AND academia.user_org(p.id) IS NOT NULL
      AND (
        _role = 'platform'
        OR (_role = 'admin' AND academia.user_org(p.id) = _org)
        OR (_role = 'manager' AND p.id IN (SELECT academia.my_led_team_member_ids()))
      )
  ),
  ordered AS (
    SELECT l.id, l.title, c.exclusive_organization_id AS excl,
           row_number() OVER (ORDER BY c.sort_order, c.created_at, m.sort_order, l.sort_order, l.created_at)::integer AS pos
    FROM academia.lessons l
    JOIN academia.modules m ON m.id = l.module_id
    JOIN academia.courses c ON c.id = m.course_id
    WHERE l.is_published AND c.is_published
  ),
  per_person AS (
    SELECT pe.id AS uid, o.id AS lesson_id, o.title, o.pos,
           coalesce(lp.completed, false) AS done,
           lp.last_watched_at, lp.completed_at,
           (lp.user_id IS NOT NULL) AS touched
    FROM people pe
    JOIN ordered o ON o.excl IS NULL OR o.excl = pe.org
    LEFT JOIN academia.lesson_progress lp ON lp.user_id = pe.id AND lp.lesson_id = o.id
  )
  SELECT
    pe.id,
    pe.nome,
    pe.org,
    org.nome,
    tm.team_id,
    tm.team_nome,
    coalesce((SELECT count(*) FROM per_person x WHERE x.uid = pe.id AND x.done), 0)::integer,
    coalesce((SELECT count(*) FROM per_person x WHERE x.uid = pe.id), 0)::integer,
    cur.lesson_id,
    cur.title,
    cur.pos,
    coalesce(cur.in_progress, false),
    (SELECT max(greatest(x.last_watched_at, x.completed_at)) FROM per_person x WHERE x.uid = pe.id)
  FROM people pe
  LEFT JOIN public.organizations org ON org.id = pe.org
  LEFT JOIN LATERAL (
    SELECT t.id AS team_id, t.nome AS team_nome
    FROM public.team_members m
    JOIN public.teams t ON t.id = m.team_id AND t.organization_id = pe.org
    WHERE m.membro_id = pe.id
    ORDER BY t.nome
    LIMIT 1
  ) tm ON true
  LEFT JOIN LATERAL (
    SELECT y.lesson_id, y.title, y.pos, y.in_progress FROM (
      -- 1º: a aula em andamento mais recente; 2º: a primeira ainda não concluída (próxima liberada).
      SELECT x.lesson_id, x.title, x.pos, true AS in_progress, 0 AS pri, x.last_watched_at AS ts
      FROM per_person x WHERE x.uid = pe.id AND x.touched AND NOT x.done
      UNION ALL
      SELECT x.lesson_id, x.title, x.pos, false, 1, NULL
      FROM per_person x WHERE x.uid = pe.id AND NOT x.done
    ) y
    ORDER BY y.pri, y.ts DESC NULLS LAST, y.pos
    LIMIT 1
  ) cur ON true
  ORDER BY pe.nome;
END;
$$;
REVOKE ALL ON FUNCTION academia.team_progress_overview() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION academia.team_progress_overview() TO authenticated;
COMMIT;
