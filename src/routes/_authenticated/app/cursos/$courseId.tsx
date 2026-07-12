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

  const totalDuration = ordered.reduce((s, l) => s + (l.duration_seconds || 0), 0);
  const totalMinutes = Math.round(totalDuration / 60);
  const nextLesson = ordered.find((l) => !progressMap.get(l.id)?.completed) ?? null;
  const isComplete = ordered.length > 0 && doneCount === ordered.length;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-lg md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative">
          <h1 className="text-2xl font-extrabold md:text-4xl">{course.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/90 md:text-base">{course.description}</p>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/85">
            <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />{ordered.length} aulas</span>
            {totalMinutes > 0 && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{totalMinutes} min de conteúdo</span>}
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />{doneCount} concluídas</span>
          </div>

          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-md flex-1">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span>{pct}% concluído</span>
                <span>{doneCount}/{ordered.length}</span>
              </div>
              <Progress value={pct} className="h-2 bg-white/20" />
            </div>
            {nextLesson && (
              <Button size="lg" className="bg-[color:var(--color-brand-red)] font-semibold text-white shadow-md hover:brightness-110" asChild>
                <Link to="/app/aulas/$lessonId" params={{ lessonId: nextLesson.id }}>
                  {doneCount === 0 ? "Começar curso" : "Continuar"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            )}
            {isComplete && (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <CheckCircle2 className="h-4 w-4" /> Curso concluído
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {tree?.map((m) => {
          const published = m.lessons.filter((l) => l.is_published);
          return (
            <div key={m.id}>
              <h2 className="mb-1 text-lg font-bold">{m.title}</h2>
              {m.description && <p className="mb-4 text-sm text-muted-foreground">{m.description}</p>}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {published.map((l, idx) => {
                  const s = stateFor(l);
                  const p = progressMap.get(l.id);
                  return <LessonCard key={l.id} lesson={l} index={idx} state={s} progress={p?.percent ?? 0} />;
                })}
              </div>
            </div>
          );
        })}
        {tree && tree.length === 0 && <p className="text-sm text-muted-foreground">Este curso ainda não tem módulos publicados.</p>}
      </div>
    </div>
  );
}

type LessonState = "done" | "available" | "locked";

function LessonCard({
  lesson,
  index,
  state,
  progress,
}: {
  lesson: Lesson;
  index: number;
  state: LessonState;
  progress: number;
}) {
  const inProgress = state === "available" && progress > 0 && progress < 100;
  const locked = state === "locked";
  const done = state === "done";

  const bannerClass = cn(
    "relative h-24 overflow-hidden",
    done && "bg-[color:var(--color-success)]/15",
    !done && !locked && "bg-brand-gradient",
    locked && "bg-muted",
  );

  const iconClass = cn(
    "grid h-12 w-12 place-items-center rounded-full backdrop-blur transition-transform group-hover:scale-110",
    done && "bg-[color:var(--color-success)] text-white",
    !done && !locked && "bg-white/25 text-white",
    locked && "bg-background/70 text-muted-foreground",
  );

  const badge = done ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-success)] px-2 py-0.5 text-[11px] font-semibold text-white">
      <CheckCircle2 className="h-3 w-3" /> Concluída
    </span>
  ) : locked ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground backdrop-blur">
      <Lock className="h-3 w-3" /> Bloqueada
    </span>
  ) : inProgress ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-brand)]">
      <Clock className="h-3 w-3" /> Em andamento
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-brand)]">
      <PlayCircle className="h-3 w-3" /> Disponível
    </span>
  );

  const ctaLabel = done ? "Revisar" : inProgress ? "Continuar" : locked ? "Bloqueada" : "Assistir";

  const inner = (
    <Card
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border-border/60 p-0 transition",
        locked ? "opacity-60" : "hover:-translate-y-0.5 hover:shadow-lg",
      )}
    >
      <div className={bannerClass}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.25),transparent_70%)]" />
        <div className="absolute right-3 top-3">{badge}</div>
        <div className="absolute inset-0 grid place-items-center">
          <div className={iconClass}>
            {done ? <CheckCircle2 className="h-6 w-6" /> : locked ? <Lock className="h-5 w-5" /> : <PlayCircle className="h-6 w-6" />}
          </div>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Aula {String(index + 1).padStart(2, "0")}
        </div>
        <h3 className="mt-1 line-clamp-2 min-h-[2.75rem] text-base font-bold leading-snug">{lesson.title}</h3>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{fmtDuration(lesson.duration_seconds)}</span>
        </div>

        {inProgress && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{Math.round(progress)}% assistido</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        <Button
          className="mt-4 w-full"
          variant={done ? "outline" : "default"}
          disabled={locked}
          asChild={!locked}
        >
          {locked ? (
            <span>
              <Lock className="mr-1 h-4 w-4" /> {ctaLabel}
            </span>
          ) : (
            <span className="inline-flex items-center justify-center">
              {ctaLabel}
              <ArrowRight className="ml-1 h-4 w-4" />
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  if (locked) {
    return (
      <div aria-disabled="true" title="Conclua a aula anterior para desbloquear">
        {inner}
      </div>
    );
  }
  return (
    <Link to="/app/aulas/$lessonId" params={{ lessonId: lesson.id }} className="block h-full">
      {inner}
    </Link>
  );
}

