-- Acesso de progresso: próprio usuário, plataforma, ou membros de times liderados
-- (inclusive co-liderança e subequipes) por gestor/coordenador/team_leader.
-- Não modifica tabelas ou policies de public.
BEGIN;
CREATE FUNCTION academia.my_led_team_member_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH RECURSIVE led_teams (id, organization_id) AS (
    SELECT t.id, t.organization_id
    FROM public.teams t
    WHERE t.organization_id = academia.current_org()
      AND (
        t.lider_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.team_co_leaders cl
                   WHERE cl.team_id = t.id AND cl.organization_id = t.organization_id
                     AND cl.user_id = auth.uid())
      )
    UNION
    SELECT child.id, child.organization_id
    FROM public.teams child
    JOIN led_teams parent ON child.parent_team_id = parent.id
      AND child.organization_id = parent.organization_id
  )
  SELECT DISTINCT tm.membro_id
  FROM led_teams t
  JOIN public.team_members tm ON tm.team_id = t.id
    AND tm.organization_id = t.organization_id
  JOIN public.profiles p ON p.id = tm.membro_id AND p.ativo IS TRUE
  WHERE auth.uid() IS NOT NULL
    AND academia.current_role() = 'manager'
    AND public.academia_has_active_adm_access()
    AND academia.user_org(tm.membro_id) = t.organization_id
$$;
REVOKE ALL ON FUNCTION academia.my_led_team_member_ids() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION academia.my_led_team_member_ids() TO authenticated;
DROP POLICY progress_select ON academia.lesson_progress;
CREATE POLICY progress_select ON academia.lesson_progress FOR SELECT TO authenticated USING (
  user_id = (SELECT auth.uid()) OR (SELECT academia.is_platform())
  OR (organization_id = (SELECT academia.current_org())
      AND user_id IN (SELECT academia.my_led_team_member_ids())));
COMMIT;
