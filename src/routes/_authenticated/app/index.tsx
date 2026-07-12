import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { fetchCourses, fetchMyProgress, fetchCourseTree, orderPublishedLessons, type Lesson, type Module } from "@/lib/courses";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, PlayCircle, ArrowRight, Sparkles, Trophy } from "lucide-react";
import { useUser } from "@/hooks/use-auth";
import { MediaCard, type MediaCardStatus } from "@/components/media-card";
import { videoThumbnailUrl, videoThumbnailUrlHQ } from "@/lib/video-thumbnail";

export const Route = createFileRoute("/_authenticated/app/")({
  component: HomePage,
});

type CourseState = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  firstLesson: Lesson | null;
  totalDurationSecs: number;
  total: number;
  done: number;
  pct: number;
  nextLesson: Lesson | null;
  lastWatchedAt: number;
  status: "in-progress" | "not-started" | "completed";
};

function HomePage() {
  const user = useUser();
  const { data: courses } = useQuery({ queryKey: ["courses"], queryFn: () => fetchCourses(false) });
  const { data: allProgress } = useQuery({ queryKey: ["progress", "all"], queryFn: () => fetchMyProgress() });

  const trees = useQueries({
    queries: (courses ?? []).map((c) => ({
      queryKey: ["tree", c.id],
      queryFn: () => fetchCourseTree(c.id),
    })),
  });

  const progressMap = new Map((allProgress ?? []).map((p) => [p.lesson_id, p]));

  const states: CourseState[] = (courses ?? []).map((c, i) => {
    const tree = (trees[i]?.data ?? []) as Array<Module & { lessons: Lesson[] }>;
    const ordered = orderPublishedLessons(tree);
    const done = ordered.filter((l) => progressMap.get(l.id)?.completed).length;
    const total = ordered.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const nextLesson = ordered.find((l) => !progressMap.get(l.id)?.completed) ?? null;
    const lastWatchedAt = Math.max(
      0,
      ...ordered
        .map((l) => progressMap.get(l.id)?.last_watched_at)
        .filter(Boolean)
        .map((s) => +new Date(s as string)),
    );
    const status: CourseState["status"] =
      total > 0 && done === total ? "completed" : done > 0 ? "in-progress" : "not-started";
    return {
      id: c.id, title: c.title, description: c.description,
      coverUrl: c.cover_url, firstLesson: ordered[0] ?? null,
      totalDurationSecs: ordered.reduce((s, l) => s + (l.duration_seconds || 0), 0),
      total, done, pct, nextLesson, lastWatchedAt, status,
    };
  });

  const totalLessons = states.reduce((s, c) => s + c.total, 0);
  const totalDone = states.reduce((s, c) => s + c.done, 0);
  const inProgress = states.filter((s) => s.status === "in-progress").length;

  // Continue hero: pick most recent in-progress course, else first not-started
  const resume =
    states
      .filter((s) => s.status === "in-progress")
      .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt)[0] ??
    states.find((s) => s.status === "not-started") ??
    null;

  // Sort cards: in-progress → not-started → completed
  const rankOrder: Record<CourseState["status"], number> = { "in-progress": 0, "not-started": 1, completed: 2 };
  const sortedStates = [...states].sort((a, b) => {
    const r = rankOrder[a.status] - rankOrder[b.status];
    if (r !== 0) return r;
    return b.lastWatchedAt - a.lastWatchedAt;
  });

  const firstName = user?.email ? user.email.split("@")[0].split(".")[0] : "";
  const capitalized = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold md:text-4xl">
          Olá{capitalized ? `, ${capitalized}` : ""}!
        </h1>
        <p className="mt-1 text-muted-foreground">
          {resume?.status === "in-progress"
            ? "Vamos continuar de onde você parou."
            : resume
            ? "Pronto para começar sua jornada?"
            : "Bem-vindo à sua área de aprendizado."}
        </p>
      </div>

      {resume && <ContinueHero state={resume} />}

      <StatStrip totalLessons={totalLessons} totalDone={totalDone} inProgress={inProgress} totalCourses={states.length} />

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Seus cursos</h2>
          <Link to="/app/cursos" className="text-sm text-[color:var(--color-brand)] hover:underline">
            Ver catálogo
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedStates.map((s) => (
            <CourseCard key={s.id} state={s} />
          ))}
          {courses && courses.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum curso disponível ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ContinueHero({ state }: { state: CourseState }) {
  const isNew = state.status === "not-started";
  const target = state.nextLesson;
  const label = isNew ? "Comece por aqui" : "Continue de onde parou";
  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="relative bg-brand-gradient p-6 text-white md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
              {isNew ? <Sparkles className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}
              {label}
            </div>
            <h2 className="mt-3 truncate text-2xl font-extrabold md:text-3xl">{state.title}</h2>
            {target && (
              <p className="mt-1 line-clamp-1 text-sm text-white/90 md:text-base">
                Próxima aula: <span className="font-semibold">{target.title}</span>
              </p>
            )}
            <div className="mt-5 max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-xs text-white/90">
                <span>
                  {state.done}/{state.total} aulas
                </span>
                <span>{state.pct}%</span>
              </div>
              <Progress value={state.pct} className="h-2 bg-white/20" />
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 md:items-end">
            {target ? (
              <Button
                size="lg"
                className="bg-[color:var(--color-brand-red)] font-semibold text-white shadow-md hover:brightness-110"
                asChild
              >
                <Link to="/app/aulas/$lessonId" params={{ lessonId: target.id }}>
                  {isNew ? "Começar agora" : "Retomar aula"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" variant="secondary" asChild>
                <Link to="/app/cursos/$courseId" params={{ courseId: state.id }}>
                  Ver curso
                </Link>
              </Button>
            )}
            <Link
              to="/app/cursos/$courseId"
              params={{ courseId: state.id }}
              className="text-xs text-white/80 hover:text-white hover:underline"
            >
              Ver módulos do curso
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatStrip({
  totalLessons,
  totalDone,
  inProgress,
  totalCourses,
}: {
  totalLessons: number;
  totalDone: number;
  inProgress: number;
  totalCourses: number;
}) {
  const pct = totalLessons ? Math.round((totalDone / totalLessons) * 100) : 0;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatItem
        icon={<BookOpen className="h-4 w-4" />}
        label="Cursos disponíveis"
        value={String(totalCourses)}
        hint={`${inProgress} em andamento`}
      />
      <StatItem
        icon={<CheckCircle2 className="h-4 w-4" />}
        label="Aulas concluídas"
        value={`${totalDone}/${totalLessons || "–"}`}
        hint={`${pct}% do total`}
      />
      <StatItem
        icon={<Trophy className="h-4 w-4" />}
        label="Progresso geral"
        value={`${pct}%`}
        hint={pct === 100 && totalLessons > 0 ? "Trilha completa!" : "Continue avançando"}
      />
    </div>
  );
}

function StatItem({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-[color:var(--color-brand)]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold leading-tight">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-[11px] text-muted-foreground/80">{hint}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function CourseCard({ state }: { state: CourseState }) {
  const { status, firstLesson, coverUrl, totalDurationSecs, pct, done, total } = state;
  const mediaStatus: MediaCardStatus =
    status === "completed" ? "done" : status === "in-progress" ? "in-progress" : "new";
  const thumb = coverUrl ?? (firstLesson ? videoThumbnailUrl(firstLesson.video_provider, firstLesson.video_ref) : null);
  const thumbHQ = coverUrl ? null : firstLesson ? videoThumbnailUrlHQ(firstLesson.video_provider, firstLesson.video_ref) : null;
  const targetLessonId = state.nextLesson?.id;

  return (
    <div className="space-y-2">
      <MediaCard
        title={state.title}
        thumbnailUrl={thumb}
        thumbnailUrlHQ={thumbHQ}
        durationSeconds={totalDurationSecs || undefined}
        status={mediaStatus}
        hint={total ? `${done}/${total} aulas` : undefined}
        linkProps={
          targetLessonId
            ? { to: "/app/aulas/$lessonId", params: { lessonId: targetLessonId } }
            : { to: "/app/cursos/$courseId", params: { courseId: state.id } }
        }
      />
      {total > 0 && <Progress value={pct} className="h-1" />}
    </div>
  );
}

