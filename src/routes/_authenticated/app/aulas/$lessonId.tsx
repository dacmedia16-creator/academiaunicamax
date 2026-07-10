import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLesson, fetchCourseTree, fetchMyProgress, isLessonUnlocked, orderPublishedLessons, upsertProgress, type Lesson } from "@/lib/courses";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/aulas/$lessonId")({
  component: LessonPage,
});

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
      if (!ok) {
        toast.warning("Aula bloqueada", { description: "Conclua a aula anterior para acessar esta." });
      }
    });
  }, [lessonId]);

  const ordered: Lesson[] = tree ? orderPublishedLessons(tree) : [];
  const progressMap = new Map(progress?.map((p) => [p.lesson_id, p]) ?? []);

  // Redirect to nearest available lesson if locked
  useEffect(() => {
    if (checked && unlocked === false && ordered.length > 0) {
      // find first not-completed unlocked lesson
      let target = ordered[0].id;
      for (let i = 0; i < ordered.length; i++) {
        const p = progressMap.get(ordered[i].id);
        if (!p?.completed) { target = ordered[i].id; break; }
      }
      if (target !== lessonId) navigate({ to: "/app/aulas/$lessonId", params: { lessonId: target }, replace: true });
      else if (courseId) navigate({ to: "/app/cursos/$courseId", params: { courseId }, replace: true });
    }
  }, [checked, unlocked, ordered.length]);

  if (isLoading || !lesson) return <p className="text-sm text-muted-foreground">Carregando aula…</p>;
  if (!checked) return <p className="text-sm text-muted-foreground">Verificando acesso…</p>;
  if (unlocked === false) return null;

  const idx = ordered.findIndex((l) => l.id === lessonId);
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
  const nextUnlockedNow = !!progressMap.get(lessonId)?.completed;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/cursos/$courseId" params={{ courseId: lesson.modules.course_id }}>
            <ArrowLeft className="mr-1 h-4 w-4" />Voltar ao curso
          </Link>
        </Button>
        <div className="text-xs text-muted-foreground">Aula {idx + 1} de {ordered.length}</div>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{lesson.title}</h1>
        {lesson.description && <p className="mt-1 text-sm text-muted-foreground">{lesson.description}</p>}
      </div>

      <Player lesson={lesson} onCompleted={() => {
        qc.invalidateQueries();
        toast.success("Aula concluída!", { description: next ? "Próxima aula desbloqueada." : "Você concluiu esta trilha." });
      }} />

      {next && (
        <Card>
          <CardContent className="flex flex-col items-start gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Próxima aula</div>
              <div className="font-semibold">{next.title}</div>
            </div>
            <Button asChild disabled={!nextUnlockedNow}>
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

function Player({ lesson, onCompleted }: { lesson: Lesson; onCompleted: () => void }) {
  const [percent, setPercent] = useState(0);
  const [done, setDone] = useState(false);
  const lastSavedRef = useRef(0);
  const lastPercentRef = useRef(0);
  const lastPosRef = useRef(0);

  // Load stored progress once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userRes } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
      if (!userRes.user) return;
      const { data } = await (await import("@/integrations/supabase/client")).supabase
        .from("lesson_progress").select("percent, position_seconds, completed")
        .eq("user_id", userRes.user.id).eq("lesson_id", lesson.id).maybeSingle();
      if (!cancelled && data) {
        setPercent(Number(data.percent));
        lastPercentRef.current = Number(data.percent);
        lastPosRef.current = data.position_seconds;
        setDone(!!data.completed);
      }
    })();
    return () => { cancelled = true; };
  }, [lesson.id]);

  async function persist(pct: number, pos: number, force = false) {
    const now = Date.now();
    if (!force && now - lastSavedRef.current < 10_000) return;
    lastSavedRef.current = now;
    try {
      const res = await upsertProgress(lesson.id, pct, pos);
      if (res && (res as any).completed && !done) {
        setDone(true); onCompleted();
      }
    } catch (e) {
      // ignore transient
    }
  }

  function onTimeUpdate(cur: number, dur: number) {
    if (!dur) return;
    const pct = Math.min(100, (cur / dur) * 100);
    lastPercentRef.current = pct; lastPosRef.current = cur;
    setPercent(pct);
    if (pct >= 90 && !done) {
      persist(pct, cur, true);
    } else {
      persist(pct, cur);
    }
  }

  // save on unmount
  useEffect(() => {
    return () => {
      if (lastPercentRef.current > 0) {
        upsertProgress(lesson.id, lastPercentRef.current, lastPosRef.current).catch(() => {});
      }
    };
  }, [lesson.id]);

  async function markComplete() {
    try {
      const res = await upsertProgress(lesson.id, 100, lastPosRef.current);
      setPercent(100); setDone(true); onCompleted();
      return res;
    } catch (e: any) {
      toast.error("Não foi possível marcar como concluída");
    }
  }

  const supportsProgress = lesson.video_provider === "url"; // native <video> exposes timeupdate

  return (
    <div className="space-y-4">
      <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-lg">
        <VideoEmbed lesson={lesson} onTimeUpdate={onTimeUpdate} />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso desta aula</span>
          <span>{Math.round(percent)}%{done && " • concluída"}</span>
        </div>
        <Progress value={percent} />
      </div>
      {!supportsProgress && (
        <Card className="bg-accent/40">
          <CardContent className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              Este provedor de vídeo não permite medir o progresso automaticamente com segurança.
              Ao terminar de assistir, marque a aula como concluída para desbloquear a próxima.
            </p>
            <Button onClick={markComplete} disabled={done}>
              <CheckCircle2 className="mr-1 h-4 w-4" />{done ? "Concluída" : "Marcar como concluída"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VideoEmbed({ lesson, onTimeUpdate }: { lesson: Lesson; onTimeUpdate: (cur: number, dur: number) => void }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // YouTube: use IFrame API via origin postMessage polling (simpler: just embed and rely on duration_seconds heuristic).
  useEffect(() => {
    if (lesson.video_provider !== "youtube") return;
    let cancelled = false;
    const start = Date.now();
    // We can't reliably read time without the YT API here; fall back to using elapsed play time
    // capped by duration_seconds. This is a heuristic progress estimator.
    const interval = window.setInterval(() => {
      if (cancelled) return;
      const elapsed = (Date.now() - start) / 1000;
      const dur = lesson.duration_seconds || 0;
      if (dur > 0) onTimeUpdate(Math.min(elapsed, dur), dur);
    }, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [lesson.id]);

  // Vimeo: postMessage timeupdate events
  useEffect(() => {
    if (lesson.video_provider !== "vimeo") return;
    function onMsg(e: MessageEvent) {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "timeupdate" && data.data) {
          onTimeUpdate(Number(data.data.seconds ?? 0), Number(data.data.duration ?? lesson.duration_seconds ?? 0));
        }
      } catch {}
    }
    window.addEventListener("message", onMsg);
    // ask vimeo to send events
    const iv = window.setInterval(() => {
      try { iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ method: "addEventListener", value: "timeupdate" }), "*"); } catch {}
    }, 2000);
    return () => { window.removeEventListener("message", onMsg); window.clearInterval(iv); };
  }, [lesson.id]);

  if (lesson.video_provider === "url") {
    return (
      <video ref={ref} className="h-full w-full" controls preload="metadata"
        src={lesson.video_ref}
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime, e.currentTarget.duration || lesson.duration_seconds || 0)}
      />
    );
  }
  if (lesson.video_provider === "vimeo") {
    // video_ref is expected to be the numeric Vimeo id
    const id = String(lesson.video_ref).replace(/[^0-9]/g, "");
    const src = `https://player.vimeo.com/video/${id}?api=1`;
    return <iframe ref={iframeRef} src={src} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={lesson.title} />;
  }
  // youtube: video_ref is the video id
  const id = String(lesson.video_ref).replace(/[^A-Za-z0-9_\-]/g, "");
  const src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
  return <iframe src={src} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={lesson.title} />;
}
