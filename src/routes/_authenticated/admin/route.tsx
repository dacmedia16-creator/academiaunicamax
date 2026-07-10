import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const uid = (context as any).user?.id;
    if (!uid) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .in("role", ["admin", "manager"]);
    if (!data || data.length === 0) throw redirect({ to: "/app" });
    const isAdmin = data.some((r) => r.role === "admin");
    return { isAdmin, isManager: data.some((r) => r.role === "manager") };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const ctx = Route.useRouteContext() as { isAdmin: boolean };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">
            {ctx.isAdmin ? "Painel administrativo" : "Painel do Gestor"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ctx.isAdmin
              ? "Gerencie cursos, aulas e acompanhe usuários."
              : "Gerencie seus cursos e crie contas de alunos."}
          </p>
        </div>
        <nav className="flex gap-2">
          <Link to="/admin" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" activeOptions={{ exact: true }} activeProps={{ className: "bg-accent text-foreground" }}>Visão geral</Link>
          <Link to="/admin/cursos" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" activeProps={{ className: "bg-accent text-foreground" }}>Cursos</Link>
          <Link to="/admin/usuarios" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground" activeProps={{ className: "bg-accent text-foreground" }}>Usuários</Link>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
