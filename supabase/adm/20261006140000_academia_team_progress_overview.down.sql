-- Reverte 20261006140000_academia_team_progress_overview.sql (função aditiva, sem outros efeitos).
BEGIN;
DROP FUNCTION IF EXISTS academia.team_progress_overview();
COMMIT;
