import { supabase } from "@/integrations/supabase/client";
import type { VideoProviderId } from "@/lib/video";

// Cliente já aponta para o schema `academia` (db.schema). Catálogo global; progresso por agência.
export type Course = {
  id: string; title: string; description: string | null;
  cover_url: string | null; is_published: boolean; sort_order: number;
};
export type Module = { id: string; course_id: string; title: string; description: string | null; sort_order: number };
export type Lesson = {
  id: string; module_id: string; title: string; description: string | null;
  video_provider: VideoProviderId; video_id: string; video_hash: string | null;
  duration_seconds: number; sort_order: number; is_published: boolean;
};
export type Progress = {
  lesson_id: string; percent: number; position_seconds: number;
  completed: boolean; completed_at: string | null; last_watched_at: string;
};

export async function fetchCourses(includeUnpublished = false): Promise<Course[]> {
  let q = supabase.from("courses").select("*").order("sort_order");
  if (!includeUnpublished) q = q.eq("is_published", true);
  const { data, error } = await q;
  if (error) throw error;
  return data as Course[];
}

export async function fetchCourse(id: string) {
  const { data, error } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Course | null;
}

export async function fetchCourseTree(courseId: string) {
  const [{ data: mods, error: e1 }, { data: lessons, error: e2 }] = await Promise.all([
    supabase.from("modules").select("*").eq("course_id", courseId).order("sort_order"),
    supabase.from("lessons").select("*, modules!inner(course_id, sort_order)")
      .eq("modules.course_id", courseId).order("sort_order"),
  ]);
  if (e1) throw e1; if (e2) throw e2;
  const modules = (mods ?? []) as Module[];
  const allLessons = (lessons ?? []) as unknown as Lesson[];
  return modules.map((m) => ({
    ...m,
    lessons: allLessons.filter((l) => l.module_id === m.id).sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export async function fetchLesson(id: string) {
  const { data, error } = await supabase.from("lessons").select("*, modules!inner(id, course_id, sort_order, title)")
    .eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as (Lesson & { modules: { id: string; course_id: string; sort_order: number; title: string } }) | null;
}

export async function fetchMyProgress(courseId?: string): Promise<Progress[]> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return [];
  let q = supabase.from("lesson_progress")
    .select("lesson_id, percent, position_seconds, completed, completed_at, last_watched_at, lessons!inner(module_id, modules!inner(course_id))")
    .eq("user_id", userRes.user.id);
  if (courseId) q = q.eq("lessons.modules.course_id", courseId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    lesson_id: r.lesson_id, percent: Number(r.percent), position_seconds: r.position_seconds,
    completed: r.completed, completed_at: r.completed_at, last_watched_at: r.last_watched_at,
  }));
}

/** Ordered published lessons for a course, respecting module + lesson order. */
export function orderPublishedLessons(tree: Array<Module & { lessons: Lesson[] }>): Lesson[] {
  return tree
    .slice().sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((m) => m.lessons.filter((l) => l.is_published).sort((a, b) => a.sort_order - b.sort_order));
}

/** Desbloqueio sequencial decidido no servidor (academia.is_lesson_unlocked). */
export async function isLessonUnlocked(lessonId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_lesson_unlocked", { _lesson: lessonId });
  if (error) return false;
  return !!data;
}

/**
 * Grava progresso pela RPC academia.save_progress (única forma de escrita; valida desbloqueio,
 * deriva a agência no servidor e ignora regravações < 30 s sem mudança de conclusão).
 */
export async function saveProgress(lessonId: string, percent: number, positionSeconds: number) {
  const { data, error } = await supabase.rpc("save_progress", {
    _lesson: lessonId, _percent: Math.round(percent * 100) / 100, _position: Math.floor(positionSeconds),
  });
  if (error) throw error;
  return data as unknown as Progress;
}

export type HistoryItem = {
  course_id: string; course_title: string; lesson_id: string; lesson_title: string;
  percent: number; completed: boolean; completed_at: string | null; last_watched_at: string;
};

/** Histórico próprio — inclusive de quem foi desligado (sem catálogo). */
export async function fetchMyHistory(): Promise<HistoryItem[]> {
  const { data, error } = await supabase.rpc("my_history");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, percent: Number(r.percent) })) as HistoryItem[];
}
