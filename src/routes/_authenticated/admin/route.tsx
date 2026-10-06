import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { fetchMyContext } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const uid = (context as any).user?.id;
    if (!uid) throw redirect({ to: "/auth" });
    // Catálogo só para o administrador da plataforma; "Minha equipe" vem em outro cartão.
    const ctx = await fetchMyContext().catch(() => null);
    if (ctx?.role !== "platform" || ctx.user_id !== uid) throw redirect({ to: "/app" });
    return { isPlatform: true };
  },
  component: AdminLayout,
});

const linkCls = "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground";

function AdminLayout() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">Painel da plataforma</h1>
          <p className="text-sm text-muted-foreground">Gerencie o catálogo global de cursos e aulas.</p>
        </div>
        <nav className="flex gap-2">
          <Link to="/admin/cursos" className={linkCls} activeProps={{ className: "bg-accent text-foreground" }}>Cursos</Link>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
