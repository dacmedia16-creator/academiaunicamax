import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRole = "admin" | "student";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const createUserAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; full_name: string; role: AppRole }) => {
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    const full_name = String(input.full_name ?? "").trim().slice(0, 100);
    const role: AppRole = input.role === "admin" ? "admin" : "student";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido");
    if (password.length < 8) throw new Error("Senha deve ter ao menos 8 caracteres");
    return { email, password, full_name, role };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("Falha ao criar usuário");

    // Ensure profile exists (trigger should do it, but be defensive)
    await supabaseAdmin.from("profiles").upsert(
      { id: newId, email: data.email, full_name: data.full_name },
      { onConflict: "id" },
    );

    if (data.role === "admin") {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: newId, role: "admin" }, { onConflict: "user_id,role" });
    }
    return { user_id: newId };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; role: AppRole; enabled: boolean }) => {
    if (!input.user_id) throw new Error("user_id obrigatório");
    const role: AppRole = input.role === "admin" ? "admin" : "student";
    return { user_id: String(input.user_id), role, enabled: Boolean(input.enabled) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Protect super admin from being demoted
    if (data.role === "admin" && !data.enabled) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
      if (u.user?.email?.toLowerCase() === "dacmedia16@gmail.com") {
        throw new Error("Não é possível remover o super administrador");
      }
      if (data.user_id === context.userId) {
        throw new Error("Você não pode remover seu próprio acesso admin");
      }
    }

    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteUserAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string }) => {
    if (!input.user_id) throw new Error("user_id obrigatório");
    return { user_id: String(input.user_id) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) throw new Error("Você não pode excluir a si mesmo");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    if (u.user?.email?.toLowerCase() === "dacmedia16@gmail.com") {
      throw new Error("Não é possível excluir o super administrador");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
