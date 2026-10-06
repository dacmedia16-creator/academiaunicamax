import { supabase } from "@/integrations/supabase/client";

// A verificação de acesso pertence ao schema public do ADM; o restante do catálogo usa academia.
// A identidade vem apenas do JWT; jamais aceitar um ID fornecido pelo navegador para autorização.
export async function hasActiveAdmAccess(): Promise<boolean> {
  const { data, error } = await supabase.schema("public" as never)
    .rpc("academia_has_active_adm_access" as never);
  return !error && data === true;
}
