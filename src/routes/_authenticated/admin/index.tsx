import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

async function fetchStats() {
  const [c, l, u, p] = await Promise.all([
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("lessons").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("lesson_progress").select("*", { count: "exact", head: true }).eq("completed", true),
  ]);
  return { courses: c.count ?? 0, lessons: l.count ?? 0, users: u.count ?? 0, completions: p.count ?? 0 };
}

function AdminHome() {
  const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchStats });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Cursos" value={data?.courses} />
      <Stat label="Aulas" value={data?.lessons} />
      <Stat label="Usuários" value={data?.users} />
      <Stat label="Conclusões" value={data?.completions} />
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
