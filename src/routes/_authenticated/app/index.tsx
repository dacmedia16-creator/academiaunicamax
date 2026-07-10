import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCourses, fetchMyProgress, fetchCourseTree, orderPublishedLessons } from "@/lib/courses";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, PlayCircle } from "lucide-react";
import { useUser } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/app/")({
  component: HomePage,
});

function HomePage() {
  const user = useUser();
  const { data: courses } = useQuery({ queryKey: ["courses"], queryFn: () => fetchCourses(false) });
  const { data: progress } = useQuery({ queryKey: ["progress", "all"], queryFn: () => fetchMyProgress() });

  const totalDone = progress?.filter((p) => p.completed).length ?? 0;
  const lastWatched = progress && progress.length > 0
    ? [...progress].sort((a, b) => +new Date(b.last_watched_at) - +new Date(a.last_watched_at))[0]
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold md:text-4xl">Olá{user?.email ? `, ${user.email.split("@")[0]}` : ""}!</h1>
        <p className="mt-1 text-muted-foreground">Bem-vindo à sua área de aprendizado.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="Cursos disponíveis" value={String(courses?.length ?? "–")} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Aulas concluídas" value={String(totalDone)} />
        <ContinueCard lastLessonId={lastWatched?.lesson_id} />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Seus cursos</h2>
          <Link to="/app/cursos" className="text-sm text-[color:var(--color-brand)] hover:underline">Ver todos</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses?.map((c) => <CourseCard key={c.id} id={c.id} title={c.title} description={c.description} />)}
          {courses && courses.length === 0 && <p className="text-sm text-muted-foreground">Nenhum curso disponível ainda.</p>}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card><CardContent className="flex items-center gap-4 pt-6">
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-accent text-[color:var(--color-brand)]">{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </CardContent></Card>
  );
}

function ContinueCard({ lastLessonId }: { lastLessonId?: string | null }) {
  return (
    <Card><CardContent className="flex items-center gap-4 pt-6">
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-[color:var(--color-brand-red)]/10 text-[color:var(--color-brand-red)]">
        <PlayCircle className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold">Continuar estudando</div>
        {lastLessonId ? (
          <Button size="sm" className="mt-2" asChild>
            <Link to="/app/aulas/$lessonId" params={{ lessonId: lastLessonId }}>Voltar à última aula</Link>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Comece por qualquer curso disponível.</p>
        )}
      </div>
    </CardContent></Card>
  );
}

function CourseCard({ id, title, description }: { id: string; title: string; description: string | null }) {
  const { data: tree } = useQuery({ queryKey: ["tree", id], queryFn: () => fetchCourseTree(id) });
  const { data: progress } = useQuery({ queryKey: ["progress", id], queryFn: () => fetchMyProgress(id) });
  const ordered = tree ? orderPublishedLessons(tree) : [];
  const done = progress?.filter((p) => p.completed).length ?? 0;
  const pct = ordered.length ? Math.round((done / ordered.length) * 100) : 0;

  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <div className="h-24 bg-brand-gradient" />
      <CardContent className="pt-4">
        <h3 className="line-clamp-1 text-base font-bold">{title}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">{description}</p>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{done}/{ordered.length} aulas</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
        <Button className="mt-4 w-full" variant="outline" asChild>
          <Link to="/app/cursos/$courseId" params={{ courseId: id }}>Acessar curso</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
