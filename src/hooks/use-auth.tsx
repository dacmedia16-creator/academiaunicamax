import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "student";

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

export function useRoles() {
  const user = useUser();
  const [roles, setRoles] = useState<AppRole[] | undefined>(undefined);
  useEffect(() => {
    if (user === undefined) return;
    if (!user) { setRoles([]); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setRoles((data ?? []).map((r) => r.role as AppRole));
    });
  }, [user?.id]);
  return roles;
}

export function useIsAdmin() {
  const roles = useRoles();
  if (roles === undefined) return undefined;
  return roles.includes("admin");
}

export function useIsManager() {
  const roles = useRoles();
  if (roles === undefined) return undefined;
  return roles.includes("manager");
}

/** Admin OR Manager — anyone with access to the admin panel. */
export function useIsStaff() {
  const roles = useRoles();
  if (roles === undefined) return undefined;
  return roles.includes("admin") || roles.includes("manager");
}
