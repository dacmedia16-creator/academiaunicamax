import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchLesson, fetchCourseTree, fetchMyProgress, isLessonUnlocked, orderPublishedLessons, saveProgress, type Lesson } from "@/lib/courses";
import { LessonPlayer } from "@/lib/video";
import { getLessonPlayback } from "@/lib/video/playback.functions";
import { lessonCoverUrl } from "@/lib/lesson-covers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/aulas/$lessonId")({
  component: LessonPage,
});

/** Gravação moderada: a cada 60 s de reprodução, ao pausar, ao concluir e ao sair. Nunca por segundo. */
const SAVE_EVERY_MS = 60_000;
const DONE_PCT = 90;

function LessonPage() {
  const { lessonId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: lesson, isLoading } = useQuery({ queryKey: ["lesson", lessonId], queryFn: () => fetchLesson(lessonId) });
  const courseId = lesson?.modules.course_id;
  const { data: tree } = useQuery({ queryKey: ["tree", courseId ?? "-"], queryFn: () => fetchCourseTree(courseId!), enabled: !!courseId });
  const { data: progress } = useQuery({ queryKey: ["progress", courseId ?? "-"], queryFn: () => fetchMyProgress(courseId!), enabled: !!courseId });

  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  useEffect(() => {
    setChecked(false); setUnlocked(null);
    isLessonUnlocked(lessonId).then((ok) => {
      setUnlocked(ok); setChecked(true);
      if (!ok) toast.warning("Aula bloqueada", { description: "Conclua a aula anterior para acessar esta." });
    });
  }, [lessonId]);

  const ordered: Lesson[] = tree ? orderPublishedLessons(tree) : [];
  const progressMap = new Map(progress?.map((p) => [p.lesson_id, p]) ?? []);

  useEffect(() => {
    if (checked && unlocked === false && ordered.length > 0) {
      let target = ordered[0].id;
      for (const l of ordered) { if (!progressMap.get(l.id)?.completed) { target = l.id; break; } }
      if (target !== lessonId) navigate({ to: "/app/aulas/$lessonId", params: { lessonId: target }, replace: true });
      else if (courseId) navigate({ to: "/app/cursos/$courseId", params: { courseId }, replace: true });
    }
  }, [checked, unlocked, ordered.length]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando aula…</p>;
  if (!lesson) return <p className="text-sm text-muted-foreground">Aula indisponível.</p>;
  if (!checked) return <p className="text-sm text-muted-foreground">Verificando acesso…</p>;
  if (unlocked === false) return null;

  const idx = ordered.findIndex((l) => l.id === lessonId);
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
  const nextUnlockedNow = !!progressMap.get(lessonId)?.completed;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Button variant="ghost" size="sm" className="h-10 justify-start px-3" asChild>
          <Link to="/app/cursos/$courseId" params={{ courseId: lesson.modules.course_id }}>
            <ArrowLeft className="mr-1 h-4 w-4" />Voltar ao curso
          </Link>
        </Button>
        <div className="whitespace-nowrap text-[11px] text-muted-foreground sm:text-xs">Aula {idx + 1} de {ordered.length}</div>
      </div>

      <div>
        <h1 className="line-clamp-2 text-xl font-extrabold sm:text-2xl md:text-3xl">{lesson.title}</h1>
        {lesson.description && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{lesson.description}</p>}
      </div>

      <LessonVideo
        lesson={lesson}
        stored={progressMap.get(lessonId)}
        onCompleted={() => {
          qc.invalidateQueries({ queryKey: ["progress"] });
          toast.success("Aula concluída!", { description: next ? "Próxima aula desbloqueada." : "Você concluiu esta trilha." });
        }}
      />

      {next && (
        <Card>
          <CardContent className="flex flex-col items-stretch gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Próxima aula</div>
              <div className="line-clamp-2 font-semibold">{next.title}</div>
            </div>
            <Button className="w-full sm:w-auto" asChild disabled={!nextUnlockedNow}>
              <Link to="/app/aulas/$lessonId" params={{ lessonId: next.id }}>
                {nextUnlockedNow ? "Ir para a próxima" : "Conclua para desbloquear"}<ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LessonVideo({ lesson, stored, onCompleted }: {
  lesson: Lesson;
  stored?: { percent: number; position_seconds: number; completed: boolean };
  onCompleted: () => void;
}) {
  const playbackFn = useServerFn(getLessonPlayback);
  const { data: source, error } = useQuery({
    queryKey: ["playback", lesson.id],
    queryFn: () => playbackFn({ data: { lessonId: lesson.id } }),
    staleTime: 30 * 60_000, // token vale 2 h; renovamos bem antes
    retry: 1,
  });

  const [percent, setPercent] = useState(stored?.percent ?? 0);
  const [done, setDone] = useState(!!stored?.completed);
  const doneRef = useRef(done); doneRef.current = done;
  const last = useRef({ pct: stored?.percent ?? 0, pos: stored?.position_seconds ?? 0, savedAt: 0, dirty: false });

  async function persist(force: boolean) {
    const now = Date.now();
    if (!last.current.dirty && !force) return;
    if (!force && now - last.current.savedAt < SAVE_EVERY_MS) return;
    last.current.savedAt = now; last.current.dirty = false;
    try {
      const row = await saveProgress(lesson.id, last.current.pct, last.current.pos);
      if (row?.completed && !doneRef.current) { setDone(true); onCompleted(); }
    } catch { /* transitório: a próxima janela regrava */ }
  }

  function onTime(cur: number, dur: number) {
    if (!dur) return;
    const pct = Math.min(100, (cur / dur) * 100);
    last.current.pct = Math.max(last.current.pct, pct);
    last.current.pos = cur; last.current.dirty = true;
    setPercent((p) => Math.max(p, pct));
    if (pct >= DONE_PCT && !doneRef.current) persist(true);
    else persist(false);
  }

  useEffect(() => {
    const flush = () => { if (last.current.dirty) persist(true); };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); flush(); };
  }, [lesson.id]);

  return (
    <div className="space-y-4">
      <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-lg">
        {source ? (
          <LessonPlayer
            source={source}
            title={lesson.title}
            posterUrl={lessonCoverUrl(lesson.id)}
            startAt={stored?.completed ? 0 : stored?.position_seconds ?? 0}
            onTimeUpdate={onTime}
            onPause={(cur, dur) => { onTime(cur, dur); persist(true); }}
            onEnded={(dur) => { onTime(dur, dur); persist(true); }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-white/80">
            {error ? "Vídeo indisponível no momento." : "Carregando vídeo…"}
          </div>
        )}
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso desta aula</span>
          <span>{Math.round(percent)}%{done && " • concluída"}</span>
        </div>
        <Progress value={percent} />
      </div>
    </div>
  );
}
