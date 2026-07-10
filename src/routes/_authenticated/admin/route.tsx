import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const uid = (context as any).user?.id;
    if (!uid) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/app" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">Painel administrativo</h1>
          <p className="text-sm text-muted-foreground">Gerencie cursos, aulas e acompanhe usuários.</p>
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
