import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useIsAdmin, useUser } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

async function fetchStats(isAdmin: boolean, userId: string | undefined) {
  if (isAdmin) {
    const [c, l, u, p] = await Promise.all([
      supabase.from("courses").select("*", { count: "exact", head: true }),
      supabase.from("lessons").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("lesson_progress").select("*", { count: "exact", head: true }).eq("completed", true),
    ]);
    return { courses: c.count ?? 0, lessons: l.count ?? 0, users: u.count ?? 0, completions: p.count ?? 0 };
  }
  if (!userId) return { courses: 0, lessons: 0, users: 0, completions: 0 };
  const { data: cm } = await supabase.from("course_managers").select("course_id").eq("user_id", userId);
  const courseIds = (cm ?? []).map((r) => r.course_id);
  if (courseIds.length === 0) {
    const { count: users } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    return { courses: 0, lessons: 0, users: users ?? 0, completions: 0 };
  }
  const { data: mods } = await supabase.from("modules").select("id").in("course_id", courseIds);
  const moduleIds = (mods ?? []).map((m) => m.id);
  const [lessonsRes, usersRes, progressRes] = await Promise.all([
    moduleIds.length
      ? supabase.from("lessons").select("id", { count: "exact", head: true }).in("module_id", moduleIds)
      : Promise.resolve({ count: 0 } as any),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    moduleIds.length
      ? supabase.from("lesson_progress")
          .select("lessons!inner(module_id)", { count: "exact", head: true })
          .eq("completed", true)
          .in("lessons.module_id", moduleIds)
      : Promise.resolve({ count: 0 } as any),
  ]);
  return {
    courses: courseIds.length,
    lessons: lessonsRes.count ?? 0,
    users: usersRes.count ?? 0,
    completions: progressRes.count ?? 0,
  };
}

function AdminHome() {
  const user = useUser();
  const isAdmin = useIsAdmin();
  const { data } = useQuery({
    queryKey: ["admin-stats", isAdmin, user?.id],
    queryFn: () => fetchStats(!!isAdmin, user?.id),
    enabled: isAdmin !== undefined && user !== undefined,
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label={isAdmin ? "Cursos" : "Meus cursos"} value={data?.courses} />
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
