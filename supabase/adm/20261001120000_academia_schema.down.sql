-- Rollback da Academia no Supabase do ADM MAX. Remove somente objetos da Academia.
SET lock_timeout = '5s';
DROP POLICY IF EXISTS academia_materiais_read ON storage.objects;
DROP POLICY IF EXISTS academia_materiais_insert ON storage.objects;
DROP POLICY IF EXISTS academia_materiais_update ON storage.objects;
DROP POLICY IF EXISTS academia_materiais_delete ON storage.objects;
-- O bucket só sai vazio (remover os objetos antes pela API de Storage). A trava storage.protect_delete
-- é liberada só nesta transação e só para o bucket da Academia.
BEGIN;
SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM storage.buckets b WHERE b.id = 'academia-materiais'
  AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = b.id);
DROP SCHEMA IF EXISTS academia CASCADE;
COMMIT;
