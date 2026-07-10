import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/usuarios/")({
  component: UsersPage,
});

async function fetchUsersWithProgress() {
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false });
  const { data: progress } = await supabase.from("lesson_progress")
    .select("user_id, lesson_id, completed, last_watched_at, lessons!inner(module_id, modules!inner(course_id))");
  const { data: roles } = await supabase.from("user_roles").select("user_id, role");
  const byUser = new Map<string, { completed: number; started: Set<string>; last: string | null }>();
  for (const p of progress ?? []) {
    const cId = (p as any).lessons?.modules?.course_id as string | undefined;
    const rec = byUser.get(p.user_id) ?? { completed: 0, started: new Set<string>(), last: null };
    if (p.completed) rec.completed++;
    if (cId) rec.started.add(cId);
    if (!rec.last || (p.last_watched_at && p.last_watched_at > rec.last)) rec.last = p.last_watched_at;
    byUser.set(p.user_id, rec);
  }
  const roleByUser = new Map<string, string[]>();
  for (const r of roles ?? []) {
    const arr = roleByUser.get(r.user_id) ?? [];
    arr.push(r.role); roleByUser.set(r.user_id, arr);
  }
  return (profiles ?? []).map((p) => ({
    ...p,
    roles: roleByUser.get(p.id) ?? [],
    completed: byUser.get(p.id)?.completed ?? 0,
    courses_started: byUser.get(p.id)?.started.size ?? 0,
    last: byUser.get(p.id)?.last ?? null,
  }));
}

function UsersPage() {
  const { data } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsersWithProgress });
  return (
    <Card><CardContent className="pt-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="py-2">Nome</th><th>E-mail</th><th>Papel</th><th>Cursos iniciados</th><th>Aulas concluídas</th><th>Última atividade</th></tr>
          </thead>
          <tbody>
            {data?.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="py-2 pr-3">{u.full_name || "—"}</td>
                <td className="pr-3">{u.email}</td>
                <td className="pr-3">
                  {u.roles.includes("admin") ? <Badge>Admin</Badge> : <Badge variant="secondary">Aluno</Badge>}
                </td>
                <td className="pr-3">{u.courses_started}</td>
                <td className="pr-3">{u.completed}</td>
                <td className="pr-3">{u.last ? new Date(u.last).toLocaleString("pt-BR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">Nenhum usuário ainda.</p>}
      </div>
    </CardContent></Card>
  );
}
