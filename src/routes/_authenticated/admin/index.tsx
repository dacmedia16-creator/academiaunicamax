import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useRole, ROLE_LABEL, type AcademiaRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

type PersonRow = { user_id: string; nome: string; email: string; role: string; done: number; started: number; last: string | null };

/**
 * Relatório: a RLS já recorta o progresso (agência do admin/gestor; tudo para a plataforma).
 * list_org_people lista só pessoas ATIVAS da própria agência (a plataforma vê a própria agência).
 */
async function fetchReport() {
  const [people, prog, courses, lessons] = await Promise.all([
    supabase.rpc("list_org_people"),
    supabase.from("lesson_progress").select("user_id, completed, last_watched_at"),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("is_published", true),
  ]);
  if (people.error) throw people.error;
  if (prog.error) throw prog.error;
  const agg = new Map<string, { done: number; started: number; last: string | null }>();
  for (const p of prog.data ?? []) {
    const a = agg.get(p.user_id) ?? { done: 0, started: 0, last: null };
    a.started += 1; if (p.completed) a.done += 1;
    if (!a.last || p.last_watched_at > a.last) a.last = p.last_watched_at;
    agg.set(p.user_id, a);
  }
  const rows: PersonRow[] = (people.data ?? []).map((p) => ({ ...p, ...(agg.get(p.user_id) ?? { done: 0, started: 0, last: null }) }));
  rows.sort((a, b) => b.done - a.done || a.nome.localeCompare(b.nome));
  return {
    rows,
    courses: courses.count ?? 0,
    lessons: lessons.count ?? 0,
    completions: (prog.data ?? []).filter((p) => p.completed).length,
  };
}

function AdminHome() {
  const role = useRole();
  const { data, error } = useQuery({ queryKey: ["admin-report"], queryFn: fetchReport, enabled: !!role });
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cursos publicados" value={data?.courses} />
        <Stat label="Aulas publicadas" value={data?.lessons} />
        <Stat label="Pessoas ativas" value={data?.rows.length} />
        <Stat label="Aulas concluídas" value={data?.completions} />
      </div>
      <Card><CardContent className="pt-6">
        <h2 className="mb-4 text-lg font-bold">Progresso da equipe</h2>
        {error && <p className="text-sm text-destructive">Não foi possível carregar o relatório.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Pessoa</th><th>Papel</th><th>Aulas concluídas</th><th>Em andamento</th><th>Último acesso</th></tr>
            </thead>
            <tbody>
              {data?.rows.map((r) => (
                <tr key={r.user_id} className="border-t border-border">
                  <td className="py-2"><div className="font-medium">{r.nome || r.email}</div><div className="text-xs text-muted-foreground">{r.email}</div></td>
                  <td>{ROLE_LABEL[r.role as AcademiaRole] ?? r.role}</td>
                  <td>{r.done}</td>
                  <td>{r.started - r.done}</td>
                  <td>{r.last ? new Date(r.last).toLocaleDateString("pt-BR") : "—"}</td>
                </tr>
              ))}
              {data && data.rows.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-muted-foreground">Nenhuma pessoa ativa na agência.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="text-3xl font-extrabold">{value ?? "–"}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </CardContent></Card>
  );
}
