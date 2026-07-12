import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCourse, fetchCourseTree, fetchMyProgress, orderPublishedLessons, type Lesson } from "@/lib/courses";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock, PlayCircle, Clock, ArrowRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/cursos/$courseId")({
  component: CourseDetail,
});

function fmtDuration(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}min${sec ? ` ${sec}s` : ""}`;
}

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { data: course } = useQuery({ queryKey: ["course", courseId], queryFn: () => fetchCourse(courseId) });
  const { data: tree } = useQuery({ queryKey: ["tree", courseId], queryFn: () => fetchCourseTree(courseId) });
  const { data: progress } = useQuery({ queryKey: ["progress", courseId], queryFn: () => fetchMyProgress(courseId) });

  const ordered = tree ? orderPublishedLessons(tree) : [];
  const progressMap = new Map(progress?.map((p) => [p.lesson_id, p]) ?? []);
  const doneCount = ordered.filter((l) => progressMap.get(l.id)?.completed).length;
  const pct = ordered.length ? Math.round((doneCount / ordered.length) * 100) : 0;

  function stateFor(lesson: Lesson): "done" | "available" | "locked" {
    const p = progressMap.get(lesson.id);
    if (p?.completed) return "done";
    const idx = ordered.findIndex((l) => l.id === lesson.id);
    if (idx <= 0) return "available";
    const prev = ordered[idx - 1];
    return progressMap.get(prev.id)?.completed ? "available" : "locked";
  }

  if (!course) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-brand-gradient p-6 text-white shadow-lg md:p-10">
        <h1 className="text-2xl font-extrabold md:text-4xl">{course.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/90 md:text-base">{course.description}</p>
        <div className="mt-6 max-w-md">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span>{doneCount}/{ordered.length} aulas concluídas</span><span>{pct}%</span>
          </div>
          <Progress value={pct} className="bg-white/20" />
        </div>
      </div>

      <div className="space-y-6">
        {tree?.map((m) => (
          <div key={m.id}>
            <h2 className="mb-3 text-lg font-bold">{m.title}</h2>
            {m.description && <p className="mb-3 text-sm text-muted-foreground">{m.description}</p>}
            <div className="space-y-2">
              {m.lessons.filter((l) => l.is_published).map((l) => {
                const s = stateFor(l);
                const p = progressMap.get(l.id);
                const disabled = s === "locked";
                const inner = (
                  <Card className={cn("transition", disabled ? "opacity-60" : "hover:shadow-md")}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className={cn("grid h-10 w-10 place-items-center rounded-full",
                        s === "done" && "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
                        s === "available" && "bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]",
                        s === "locked" && "bg-muted text-muted-foreground",
                      )}>
                        {s === "done" ? <CheckCircle2 className="h-5 w-5" /> : s === "locked" ? <Lock className="h-4 w-4" /> : <PlayCircle className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{l.title}</div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDuration(l.duration_seconds)}</span>
                          {p && !p.completed && p.percent > 0 && <span>{Math.round(p.percent)}% assistido</span>}
                          <span className="capitalize">{s === "done" ? "Concluída" : s === "locked" ? "Bloqueada" : "Disponível"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
                return disabled ? (
                  <div key={l.id} aria-disabled="true" title="Conclua a aula anterior para desbloquear">{inner}</div>
                ) : (
                  <Link key={l.id} to="/app/aulas/$lessonId" params={{ lessonId: l.id }}>{inner}</Link>
                );
              })}
            </div>
          </div>
        ))}
        {tree && tree.length === 0 && <p className="text-sm text-muted-foreground">Este curso ainda não tem módulos publicados.</p>}
      </div>
    </div>
  );
}
