import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCourses, fetchMyProgress, fetchCourseTree, orderPublishedLessons } from "@/lib/courses";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/cursos/")({
  component: CatalogPage,
});

function CatalogPage() {
  const { data: courses, isLoading } = useQuery({ queryKey: ["courses"], queryFn: () => fetchCourses(false) });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">Catálogo de cursos</h1>
        <p className="text-sm text-muted-foreground">Escolha um curso para começar ou continuar.</p>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses?.map((c) => <CourseItem key={c.id} id={c.id} title={c.title} description={c.description} />)}
      </div>
    </div>
  );
}

function CourseItem({ id, title, description }: { id: string; title: string; description: string | null }) {
  const { data: tree } = useQuery({ queryKey: ["tree", id], queryFn: () => fetchCourseTree(id) });
  const { data: progress } = useQuery({ queryKey: ["progress", id], queryFn: () => fetchMyProgress(id) });
  const ordered = tree ? orderPublishedLessons(tree) : [];
  const done = progress?.filter((p) => p.completed).length ?? 0;
  const pct = ordered.length ? Math.round((done / ordered.length) * 100) : 0;
  return (
    <Card className="overflow-hidden">
      <div className="h-20 bg-brand-gradient" />
      <CardContent className="pt-4">
        <h3 className="text-base font-bold">{title}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">{description}</p>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{done}/{ordered.length} aulas</span><span>{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
        <Button className="mt-4 w-full" asChild>
          <Link to="/app/cursos/$courseId" params={{ courseId: id }}>Abrir</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
