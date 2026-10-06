-- Rollback de 20261006040000_academia_platform_admin_lessons.sql
-- Definições ATUAIS de produção (pg_get_functiondef, lidas em 06/10/2026 antes da mudança).

CREATE OR REPLACE FUNCTION academia.is_lesson_unlocked(_lesson uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION academia.save_progress(_lesson uuid, _percent numeric, _position integer)
 RETURNS academia.lesson_progress
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
