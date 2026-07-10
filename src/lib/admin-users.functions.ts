import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRole = "admin" | "manager" | "student";
type StaffRole = "admin" | "manager";

async function getStaffRole(context: { supabase: any; userId: string }): Promise<StaffRole> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: any) => r.role as AppRole);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("manager")) return "manager";
  throw new Error("Forbidden");
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const role = await getStaffRole(context);
  if (role !== "admin") throw new Error("Forbidden");
}

export const createUserAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; full_name: string; role: AppRole }) => {
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    const full_name = String(input.full_name ?? "").trim().slice(0, 100);
    const role: AppRole =
      input.role === "admin" ? "admin" : input.role === "manager" ? "manager" : "student";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido");
    if (password.length < 8) throw new Error("Senha deve ter ao menos 8 caracteres");
    return { email, password, full_name, role };
  })
  .handler(async ({ data, context }) => {
    const staffRole = await getStaffRole(context);
    // Managers can only create students
    if (staffRole === "manager" && data.role !== "student") {
      throw new Error("Gestores só podem criar alunos");
    }
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

    await supabaseAdmin.from("profiles").upsert(
      { id: newId, email: data.email, full_name: data.full_name },
      { onConflict: "id" },
    );

    if (data.role === "admin" || data.role === "manager") {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: newId, role: data.role }, { onConflict: "user_id,role" });
    }
    return { user_id: newId };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; role: "admin" | "manager"; enabled: boolean }) => {
    if (!input.user_id) throw new Error("user_id obrigatório");
    const role = input.role === "manager" ? "manager" : "admin";
    return { user_id: String(input.user_id), role, enabled: Boolean(input.enabled) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
    const staffRole = await getStaffRole(context);
    if (data.user_id === context.userId) throw new Error("Você não pode excluir a si mesmo");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    if (u.user?.email?.toLowerCase() === "dacmedia16@gmail.com") {
      throw new Error("Não é possível excluir o super administrador");
    }
    // Manager can only delete pure students
    if (staffRole === "manager") {
      const { data: roles } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", data.user_id);
      const hasStaff = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "manager");
      if (hasStaff) throw new Error("Gestores só podem excluir alunos");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignCourseManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { course_id: string; user_id: string; enabled: boolean }) => {
    if (!input.course_id) throw new Error("course_id obrigatório");
    if (!input.user_id) throw new Error("user_id obrigatório");
    return {
      course_id: String(input.course_id),
      user_id: String(input.user_id),
      enabled: Boolean(input.enabled),
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.enabled) {
      // Target user must be a manager
      const { data: roles } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", data.user_id).eq("role", "manager");
      if (!roles || roles.length === 0) {
        throw new Error("Usuário precisa ter o papel Gestor antes de gerenciar cursos");
      }
      const { error } = await supabaseAdmin
        .from("course_managers")
        .upsert(
          { course_id: data.course_id, user_id: data.user_id, assigned_by: context.userId },
          { onConflict: "course_id,user_id" },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("course_managers")
        .delete()
        .eq("course_id", data.course_id)
        .eq("user_id", data.user_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
