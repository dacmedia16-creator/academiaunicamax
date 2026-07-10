import { supabase } from "@/integrations/supabase/client";

export type Course = {
  id: string; title: string; description: string | null;
  cover_url: string | null; is_published: boolean; sort_order: number;
};
export type Module = { id: string; course_id: string; title: string; description: string | null; sort_order: number };
export type Lesson = {
  id: string; module_id: string; title: string; description: string | null;
  video_provider: "youtube" | "vimeo" | "url"; video_ref: string;
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
  const allLessons = (lessons ?? []) as Lesson[];
  const grouped = modules.map((m) => ({
    ...m,
    lessons: allLessons.filter((l) => l.module_id === m.id).sort((a, b) => a.sort_order - b.sort_order),
  }));
  return grouped;
}

export async function fetchLesson(id: string) {
  const { data, error } = await supabase.from("lessons").select("*, modules!inner(id, course_id, sort_order, title)")
    .eq("id", id).maybeSingle();
  if (error) throw error;
  return data as (Lesson & { modules: { id: string; course_id: string; sort_order: number; title: string } }) | null;
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

/** Ordered published lesson ids for a course, respecting module + lesson order. */
export function orderPublishedLessons(tree: Array<Module & { lessons: Lesson[] }>): Lesson[] {
  return tree
    .slice().sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((m) => m.lessons.filter((l) => l.is_published).sort((a, b) => a.sort_order - b.sort_order));
}

export async function isLessonUnlocked(lessonId: string): Promise<boolean> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return false;
  const { data, error } = await supabase.rpc("is_lesson_unlocked", {
    _user_id: userRes.user.id, _lesson_id: lessonId,
  });
  if (error) return false;
  return !!data;
}

export async function upsertProgress(lessonId: string, percent: number, positionSeconds: number) {
  const { data, error } = await supabase.rpc("upsert_lesson_progress", {
    _lesson_id: lessonId, _percent: percent, _position_seconds: Math.floor(positionSeconds),
  });
  if (error) throw error;
  return data;
}
