// Estado exibido no card de cada aula. Só apresentação: a liberação real continua sendo
// decidida no servidor (academia.is_lesson_unlocked). Mantém a regra que a tela já usava:
// a 1ª aula é livre; as seguintes abrem quando a anterior está concluída.
import type { MediaCardStatus } from "@/components/media-card";

type LessonRef = { id: string };
type ProgressRef = { percent: number; completed: boolean };

export type LessonCardState = { status: MediaCardStatus; label: string; locked: boolean };

export function lessonCardState(
  ordered: LessonRef[],
  progress: Map<string, ProgressRef>,
  lessonId: string,
): LessonCardState {
  const p = progress.get(lessonId);
  if (p?.completed) return { status: "done", label: "Concluída", locked: false };

  const idx = ordered.findIndex((l) => l.id === lessonId);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  if (prev && !progress.get(prev.id)?.completed) {
    return { status: "locked", label: "Bloqueada", locked: true };
  }

  const pct = Math.round(p?.percent ?? 0);
  if (pct > 0) return { status: "in-progress", label: `Em andamento ${Math.min(pct, 99)}%`, locked: false };
  return { status: "available", label: "Disponível", locked: false };
}
