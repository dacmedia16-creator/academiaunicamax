import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { fetchCourse, fetchCourseTree } from "@/lib/courses";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-auth";
import { assignCourseManager } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin/cursos/$courseId")({
  component: EditCourse,
});


function EditCourse() {
  const { courseId } = Route.useParams();
  const qc = useQueryClient();
  const { data: course } = useQuery({ queryKey: ["admin-course", courseId], queryFn: () => fetchCourse(courseId) });
  const { data: tree } = useQuery({ queryKey: ["admin-tree", courseId], queryFn: () => fetchCourseTree(courseId) });

  async function updateCourse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("courses").update({
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim() || null,
      is_published: fd.get("is_published") === "on",
    }).eq("id", courseId);
    if (error) toast.error(error.message); else { toast.success("Curso atualizado"); qc.invalidateQueries(); }
  }

  async function addModule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("mtitle") ?? "").trim();
    if (!title) return;
    const { error } = await supabase.from("modules").insert({
      course_id: courseId, title, sort_order: (tree?.length ?? 0) + 1,
    });
    if (error) toast.error(error.message);
    else { (e.target as HTMLFormElement).reset(); qc.invalidateQueries(); }
  }

  async function moveModule(id: string, dir: -1 | 1) {
    if (!tree) return;
    const list = [...tree].sort((a, b) => a.sort_order - b.sort_order);
    const i = list.findIndex((x) => x.id === id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    await Promise.all([
      supabase.from("modules").update({ sort_order: list[j].sort_order }).eq("id", list[i].id),
      supabase.from("modules").update({ sort_order: list[i].sort_order }).eq("id", list[j].id),
    ]);
    qc.invalidateQueries();
  }

  async function deleteModule(id: string) {
    if (!confirm("Excluir módulo e suas aulas?")) return;
    const { error } = await supabase.from("modules").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries();
  }

  async function addLesson(moduleId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentLessons = tree?.find((m) => m.id === moduleId)?.lessons ?? [];
    const { error } = await supabase.from("lessons").insert({
      module_id: moduleId,
      title: String(fd.get("ltitle") ?? "").trim(),
      description: String(fd.get("ldesc") ?? "").trim() || null,
      video_provider: (String(fd.get("provider") ?? "youtube") as "youtube" | "vimeo" | "url"),
      video_ref: String(fd.get("vref") ?? "").trim(),
      duration_seconds: Number(fd.get("dur") ?? 0) || 0,
      sort_order: currentLessons.length + 1,
      is_published: true,
    });
    if (error) toast.error(error.message);
    else { (e.target as HTMLFormElement).reset(); qc.invalidateQueries(); }
  }

  async function moveLesson(moduleId: string, id: string, dir: -1 | 1) {
    const list = (tree?.find((m) => m.id === moduleId)?.lessons ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const i = list.findIndex((x) => x.id === id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    await Promise.all([
      supabase.from("lessons").update({ sort_order: list[j].sort_order }).eq("id", list[i].id),
      supabase.from("lessons").update({ sort_order: list[i].sort_order }).eq("id", list[j].id),
    ]);
    qc.invalidateQueries();
  }

  async function toggleLessonPub(id: string, next: boolean) {
    const { error } = await supabase.from("lessons").update({ is_published: next }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries();
  }

  async function deleteLesson(id: string) {
    if (!confirm("Excluir aula? Registros de progresso desta aula também serão removidos.")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries();
  }

  if (!course) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin/cursos"><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link>
      </Button>

      <Card><CardContent className="pt-6">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={updateCourse}>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="title">Título</Label><Input id="title" name="title" defaultValue={course.title} required /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" name="description" defaultValue={course.description ?? ""} rows={3} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={course.is_published} /> Publicado</label>
          <div className="md:col-span-2"><Button type="submit">Salvar curso</Button></div>
        </form>
      </CardContent></Card>

      <Card><CardContent className="pt-6">
        <h3 className="mb-4 text-lg font-bold">Módulos</h3>
        <form className="mb-4 flex gap-2" onSubmit={addModule}>
          <Input name="mtitle" placeholder="Título do módulo" required />
          <Button type="submit">Adicionar</Button>
        </form>
        <div className="space-y-6">
          {tree?.map((m) => (
            <div key={m.id} className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="font-semibold">{m.title}</div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => moveModule(m.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => moveModule(m.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteModule(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                {m.lessons.sort((a,b)=>a.sort_order-b.sort_order).map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-accent/30 p-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{l.title}</div>
                      <div className="text-xs text-muted-foreground">{l.video_provider} • {l.video_ref} • {l.duration_seconds}s</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={l.is_published} onCheckedChange={(v) => toggleLessonPub(l.id, v)} />
                      <Button variant="ghost" size="icon" onClick={() => moveLesson(m.id, l.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => moveLesson(m.id, l.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteLesson(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => addLesson(m.id, e)} className="mt-3 grid gap-2 sm:grid-cols-6">
                <Input name="ltitle" placeholder="Título da aula" required className="sm:col-span-2" />
                <Select name="provider" defaultValue="youtube">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="url">URL direta</SelectItem>
                  </SelectContent>
                </Select>
                <Input name="vref" placeholder="ID ou URL do vídeo" required />
                <Input name="dur" type="number" min={0} placeholder="Duração (s)" />
                <Button type="submit">Adicionar aula</Button>
                <Input name="ldesc" placeholder="Descrição (opcional)" className="sm:col-span-6" />
              </form>
            </div>
          ))}
          {tree && tree.length === 0 && <p className="text-sm text-muted-foreground">Nenhum módulo ainda.</p>}
        </div>
      </CardContent></Card>
    </div>
  );
}
