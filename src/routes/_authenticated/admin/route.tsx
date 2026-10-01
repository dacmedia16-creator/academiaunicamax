import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { fetchMyContext, ROLE_LABEL, type AcademiaRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const uid = (context as any).user?.id;
    if (!uid) throw redirect({ to: "/auth" });
    // Papel vem do ADM MAX (servidor). Painel: plataforma, admin ou gestor da agência.
    const ctx = await fetchMyContext().catch(() => null);
    const role = ctx?.role ?? null;
    if (role !== "platform" && role !== "admin" && role !== "manager") throw redirect({ to: "/app" });
    return { academiaRole: role as AcademiaRole, isPlatform: role === "platform" };
  },
  component: AdminLayout,
});

const linkCls = "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground";

function AdminLayout() {
  const ctx = Route.useRouteContext() as { academiaRole: AcademiaRole; isPlatform: boolean };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">
            {ctx.isPlatform ? "Painel da plataforma" : "Painel da agência"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ctx.isPlatform
              ? "Gerencie o catálogo global de cursos e aulas."
              : `${ROLE_LABEL[ctx.academiaRole]} — acompanhe o progresso da sua equipe. Usuários e papéis são geridos no ADM MAX.`}
          </p>
        </div>
        <nav className="flex gap-2">
          <Link to="/admin" className={linkCls} activeOptions={{ exact: true }} activeProps={{ className: "bg-accent text-foreground" }}>Relatório</Link>
          {ctx.isPlatform && (
            <Link to="/admin/cursos" className={linkCls} activeProps={{ className: "bg-accent text-foreground" }}>Cursos</Link>
          )}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
