-- Restaura exatamente a policy progress_select anterior; aplicar somente para reverter esta migration.
BEGIN;
DROP POLICY IF EXISTS progress_select ON academia.lesson_progress;
CREATE POLICY progress_select ON academia.lesson_progress FOR SELECT TO authenticated USING (
  user_id = (SELECT auth.uid()) OR (SELECT academia.is_platform())
  OR organization_id = (SELECT academia.managed_org()));
REVOKE ALL ON FUNCTION academia.my_led_team_member_ids() FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS academia.my_led_team_member_ids();
COMMIT;
