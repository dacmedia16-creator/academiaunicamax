import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCourse, fetchCourseTree, fetchMyProgress, orderPublishedLessons } from "@/lib/courses";
import { lessonCardState } from "@/lib/lesson-card";
import { lessonCoverUrl } from "@/lib/lesson-covers";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, ArrowRight, BookOpen } from "lucide-react";
import { MediaCard } from "@/components/media-card";
import { videoThumbnailUrl, videoThumbnailUrlHQ } from "@/lib/video-thumbnail";

export const Route = createFileRoute("/_authenticated/app/cursos/$courseId")({
  component: CourseDetail,
});


function CourseDetail() {
  const { courseId } = Route.useParams();
  const { data: course } = useQuery({ queryKey: ["course", courseId], queryFn: () => fetchCourse(courseId) });
  const { data: tree } = useQuery({ queryKey: ["tree", courseId], queryFn: () => fetchCourseTree(courseId) });
  const { data: progress } = useQuery({ queryKey: ["progress", courseId], queryFn: () => fetchMyProgress(courseId) });

  const ordered = tree ? orderPublishedLessons(tree) : [];
  const progressMap = new Map(progress?.map((p) => [p.lesson_id, p]) ?? []);
  const doneCount = ordered.filter((l) => progressMap.get(l.id)?.completed).length;
  const pct = ordered.length ? Math.round((doneCount / ordered.length) * 100) : 0;

  if (!course) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const totalDuration = ordered.reduce((s, l) => s + (l.duration_seconds || 0), 0);
  const totalMinutes = Math.round(totalDuration / 60);
  const nextLesson = ordered.find((l) => !progressMap.get(l.id)?.completed) ?? null;
  const isComplete = ordered.length > 0 && doneCount === ordered.length;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-lg sm:p-6 md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative">
          <h1 className="text-xl font-extrabold sm:text-2xl md:text-4xl">{course.title}</h1>
          {course.description && <p className="mt-2 max-w-3xl text-sm text-white/90 md:text-base">{course.description}</p>}

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-white/85 sm:text-xs">
            <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />{ordered.length} aulas</span>
            {totalMinutes > 0 && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{totalMinutes} min</span>}
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
              <Button size="lg" className="w-full bg-[color:var(--color-brand-red)] font-semibold text-white shadow-md hover:brightness-110 md:w-auto" asChild>
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

      <div className="space-y-6">
        {tree?.map((m) => (
          <div key={m.id}>
            <h2 className="mb-3 text-base font-bold sm:text-lg">{m.title}</h2>
            {m.description && <p className="mb-3 text-sm text-muted-foreground">{m.description}</p>}
            <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {m.lessons.filter((l) => l.is_published).map((l) => {
                const st = lessonCardState(ordered, progressMap, l.id);
                const disabled = st.locked;
                const number = ordered.findIndex((o) => o.id === l.id) + 1;
                return (
                  <MediaCard
                    key={l.id}
                    eyebrow={number > 0 ? `Aula ${number}` : undefined}
                    title={l.title}
                    subtitle={l.description?.trim() || null}
                    thumbnailUrl={lessonCoverUrl(l.id) ?? videoThumbnailUrl(l.video_provider, l.video_id)}
                    thumbnailUrlHQ={lessonCoverUrl(l.id) ? null : videoThumbnailUrlHQ(l.video_provider, l.video_id)}
                    durationSeconds={l.duration_seconds || undefined}
                    status={st.status}
                    statusLabel={st.label}
                    disabled={disabled}
                    linkProps={disabled ? undefined : { to: "/app/aulas/$lessonId", params: { lessonId: l.id } }}
                  />
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
