import { createFileRoute } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  fetchCourses,
  fetchMyProgress,
  fetchCourseTree,
  orderPublishedLessons,
  type Lesson,
  type Module,
} from "@/lib/courses";
import { MediaCard, type MediaCardStatus } from "@/components/media-card";
import { videoThumbnailUrl, videoThumbnailUrlHQ } from "@/lib/video-thumbnail";

export const Route = createFileRoute("/_authenticated/app/cursos/")({
  component: CatalogPage,
});

function CatalogPage() {
  const { data: courses, isLoading } = useQuery({ queryKey: ["courses"], queryFn: () => fetchCourses(false) });
  const { data: allProgress } = useQuery({ queryKey: ["progress", "all"], queryFn: () => fetchMyProgress() });

  const trees = useQueries({
    queries: (courses ?? []).map((c) => ({
      queryKey: ["tree", c.id],
      queryFn: () => fetchCourseTree(c.id),
    })),
  });

  const progressMap = new Map((allProgress ?? []).map((p) => [p.lesson_id, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold sm:text-2xl md:text-3xl">Catálogo de cursos</h1>
        <p className="text-sm text-muted-foreground">Escolha um curso para começar ou continuar.</p>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {courses?.map((c, i) => {
          const tree = (trees[i]?.data ?? []) as Array<Module & { lessons: Lesson[] }>;
          const ordered = orderPublishedLessons(tree);
          const done = ordered.filter((l) => progressMap.get(l.id)?.completed).length;
          const total = ordered.length;
          const totalSecs = ordered.reduce((s, l) => s + (l.duration_seconds || 0), 0);
          const status: MediaCardStatus =
            total > 0 && done === total ? "done" : done > 0 ? "in-progress" : "new";
          const firstLesson = ordered[0];
          const thumb = c.cover_url ?? (firstLesson ? videoThumbnailUrl(firstLesson.video_provider, firstLesson.video_ref) : null);
          const thumbHQ = c.cover_url ? null : firstLesson ? videoThumbnailUrlHQ(firstLesson.video_provider, firstLesson.video_ref) : null;
          return (
            <MediaCard
              key={c.id}
              title={c.title}
              thumbnailUrl={thumb}
              thumbnailUrlHQ={thumbHQ}
              durationSeconds={totalSecs || undefined}
              status={status}
              hint={total ? `${done}/${total} aulas` : undefined}
              linkProps={{ to: "/app/cursos/$courseId", params: { courseId: c.id } }}
            />
          );
        })}
      </div>
    </div>
  );
}
