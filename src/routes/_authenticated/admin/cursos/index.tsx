import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useIsPlatform } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/cursos/")({
  component: AdminCourses,
});

// Catálogo global: só a plataforma edita (RLS garante; a tela só esconde para os demais).
async function fetchAdminCourses() {
  const { data, error } = await supabase.from("courses").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

function AdminCourses() {
  const qc = useQueryClient();
  const isPlatform = useIsPlatform();
  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: fetchAdminCourses,
    enabled: isPlatform === true,
  });
  const [creating, setCreating] = useState(false);
  if (isPlatform === false) return <p className="text-sm text-muted-foreground">Somente a plataforma edita o catálogo.</p>;


  async function createCourse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;
    setCreating(true);
    const { error } = await supabase.from("courses").insert({
      title,
      description: String(fd.get("description") ?? "").trim() || null,
      is_published: fd.get("is_published") === "on",
      sort_order: (courses?.length ?? 0) + 1,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    (e.target as HTMLFormElement).reset();
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
    qc.invalidateQueries({ queryKey: ["courses"] });
    toast.success("Curso criado");
  }

  async function deleteCourse(id: string) {
    if (!confirm("Excluir este curso? Isso removerá módulos, aulas e progresso relacionado.")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
    toast.success("Curso excluído");
  }

  async function togglePublish(id: string, next: boolean) {
    const { error } = await supabase.from("courses").update({ is_published: next }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card><CardContent className="pt-6">
        <h2 className="mb-4 text-lg font-bold">Cursos</h2>
        <div className="space-y-2">
          {courses?.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{c.title}</div>
                <div className="text-xs text-muted-foreground">Ordem {c.sort_order} • {c.is_published ? "Publicado" : "Rascunho"}</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={c.is_published} onCheckedChange={(v) => togglePublish(c.id, v)} aria-label="Publicar curso" />
                <Button variant="outline" size="sm" asChild><Link to="/admin/cursos/$courseId" params={{ courseId: c.id }}>Editar</Link></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteCourse(c.id)} aria-label="Excluir">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {courses && courses.length === 0 && <p className="text-sm text-muted-foreground">Nenhum curso ainda.</p>}
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6">
        <h2 className="mb-4 text-lg font-bold">Novo curso</h2>
        <form className="space-y-4" onSubmit={createCourse}>
          <div className="space-y-2"><Label htmlFor="title">Título</Label><Input id="title" name="title" required maxLength={140} /></div>
          <div className="space-y-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" name="description" rows={3} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" /> Publicar imediatamente</label>
          <Button type="submit" disabled={creating}>{creating ? "Criando…" : "Criar curso"}</Button>
        </form>
      </CardContent></Card>
    </div>
  );
}
