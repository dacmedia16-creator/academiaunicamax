import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Papel na Academia, derivado do ADM MAX no servidor (academia.my_context):
 *   platform → mantém o catálogo global (public.platform_admins)
 *   admin / manager → relatórios da própria agência
 *   student → aluno
 *   null → sem acesso (inativo / desligado / sem agência)
 */
export type AcademiaRole = "platform" | "admin" | "manager" | "student";
export type AcademiaContext = {
  user_id: string;
  organization_id: string | null;
  role: AcademiaRole | null;
  nome: string | null;
};

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return session;
}

export function useUser(): User | null | undefined {
  const s = useSession();
  if (s === undefined) return undefined;
  return s?.user ?? null;
}

export async function fetchMyContext(): Promise<AcademiaContext | null> {
  const { data, error } = await supabase.rpc("my_context");
  if (error) throw error;
  return (data as unknown as AcademiaContext) ?? null;
}

export function useAcademiaContext() {
  const user = useUser();
  const q = useQuery({
    queryKey: ["my-context", user?.id ?? "-"],
    queryFn: fetchMyContext,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  if (user === undefined || (user && q.isLoading)) return undefined;
  if (!user) return null;
  return q.data ?? null;
}

export function useRole(): AcademiaRole | null | undefined {
  const ctx = useAcademiaContext();
  if (ctx === undefined) return undefined;
  return ctx?.role ?? null;
}

/** Mantém o catálogo global. */
export function useIsPlatform() {
  const r = useRole();
  return r === undefined ? undefined : r === "platform";
}

/** Acesso ao painel: plataforma, admin ou gestor da agência. */
export function useIsStaff() {
  const r = useRole();
  return r === undefined ? undefined : r === "platform" || r === "admin" || r === "manager";
}

export const ROLE_LABEL: Record<AcademiaRole, string> = {
  platform: "Administrador da plataforma",
  admin: "Administrador da agência",
  manager: "Gestor",
  student: "Aluno",
};
