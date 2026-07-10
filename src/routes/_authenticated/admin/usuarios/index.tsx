import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useUser } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserPlus, ShieldCheck, ShieldOff, Trash2, Briefcase, BriefcaseBusiness } from "lucide-react";
import {
  createUserAsAdmin, setUserRole, deleteUserAsAdmin,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin/usuarios/")({
  component: UsersPage,
});

const SUPER_ADMIN_EMAIL = "dacmedia16@gmail.com";

async function fetchUsersWithProgress() {
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false });
  const { data: progress } = await supabase.from("lesson_progress")
    .select("user_id, lesson_id, completed, last_watched_at, lessons!inner(module_id, modules!inner(course_id))");
  const { data: roles } = await supabase.from("user_roles").select("user_id, role");
  const byUser = new Map<string, { completed: number; started: Set<string>; last: string | null }>();
  for (const p of progress ?? []) {
    const cId = (p as any).lessons?.modules?.course_id as string | undefined;
    const rec = byUser.get(p.user_id) ?? { completed: 0, started: new Set<string>(), last: null };
    if (p.completed) rec.completed++;
    if (cId) rec.started.add(cId);
    if (!rec.last || (p.last_watched_at && p.last_watched_at > rec.last)) rec.last = p.last_watched_at;
    byUser.set(p.user_id, rec);
  }
  const roleByUser = new Map<string, string[]>();
  for (const r of roles ?? []) {
    const arr = roleByUser.get(r.user_id) ?? [];
    arr.push(r.role); roleByUser.set(r.user_id, arr);
  }
  return (profiles ?? []).map((p) => ({
    ...p,
    roles: roleByUser.get(p.id) ?? [],
    completed: byUser.get(p.id)?.completed ?? 0,
    courses_started: byUser.get(p.id)?.started.size ?? 0,
    last: byUser.get(p.id)?.last ?? null,
  }));
}

function UsersPage() {
  const qc = useQueryClient();
  const currentUser = useUser();
  const isAdmin = useIsAdmin();
  const { data } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsersWithProgress });

  const createFn = useServerFn(createUserAsAdmin);
  const roleFn = useServerFn(setUserRole);
  const deleteFn = useServerFn(deleteUserAsAdmin);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "student" as "student" | "admin" | "manager" });
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createFn({ data: form });
      toast.success("Usuário criado com sucesso");
      setOpen(false);
      setForm({ full_name: "", email: "", password: "", role: "student" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar usuário");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRole(userId: string, role: "admin" | "manager", enabled: boolean) {
    setRowBusy(userId);
    try {
      await roleFn({ data: { user_id: userId, role, enabled } });
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao alterar papel");
    } finally {
      setRowBusy(null);
    }
  }

  async function removeUser(userId: string) {
    setRowBusy(userId);
    try {
      await deleteFn({ data: { user_id: userId } });
      toast.success("Usuário excluído");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao excluir usuário");
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <Card><CardContent className="pt-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Gerencie contas, papéis e acompanhe o progresso." : "Crie contas de alunos e acompanhe o progresso."}
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><UserPlus className="mr-1 h-4 w-4" />Novo usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
              <DialogDescription>O usuário já é criado com e-mail confirmado.</DialogDescription>
            </DialogHeader>
            <form className="space-y-3" onSubmit={handleCreate}>
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nome completo</Label>
                <Input id="full_name" value={form.full_name} maxLength={100} required
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={form.email} required
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
                <Input id="password" type="password" minLength={8} value={form.password} required
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Papel</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Aluno</SelectItem>
                    {isAdmin && <SelectItem value="manager">Gestor</SelectItem>}
                    {isAdmin && <SelectItem value="admin">Administrador</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={busy}>{busy ? "Criando…" : "Criar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2">Nome</th><th>E-mail</th><th>Papel</th>
              <th>Cursos iniciados</th><th>Aulas concluídas</th><th>Última atividade</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((u) => {
              const rowIsAdmin = u.roles.includes("admin");
              const rowIsManager = u.roles.includes("manager");
              const isSuper = u.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
              const isSelf = currentUser?.id === u.id;
              const disabled = rowBusy === u.id;
              // Managers can only delete pure students
              const canDelete = isAdmin ? (!isSuper && !isSelf) : (!rowIsAdmin && !rowIsManager && !isSelf);
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-2 pr-3">{u.full_name || "—"}{isSuper && <Badge className="ml-2" variant="outline">Super</Badge>}</td>
                  <td className="pr-3">{u.email}</td>
                  <td className="pr-3">
                    {rowIsAdmin && <Badge className="mr-1">Admin</Badge>}
                    {rowIsManager && <Badge className="mr-1" variant="outline">Gestor</Badge>}
                    {!rowIsAdmin && !rowIsManager && <Badge variant="secondary">Aluno</Badge>}
                  </td>
                  <td className="pr-3">{u.courses_started}</td>
                  <td className="pr-3">{u.completed}</td>
                  <td className="pr-3">{u.last ? new Date(u.last).toLocaleString("pt-BR") : "—"}</td>
                  <td className="pr-3 text-right">
                    <div className="inline-flex gap-1">
                      {isAdmin && (
                        <>
                          {rowIsAdmin ? (
                            <Button size="sm" variant="outline" disabled={disabled || isSuper || isSelf}
                              onClick={() => toggleRole(u.id, "admin", false)} title={isSuper ? "Super admin protegido" : "Remover admin"}>
                              <ShieldOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" disabled={disabled}
                              onClick={() => toggleRole(u.id, "admin", true)} title="Tornar admin">
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {rowIsManager ? (
                            <Button size="sm" variant="outline" disabled={disabled}
                              onClick={() => toggleRole(u.id, "manager", false)} title="Remover gestor">
                              <Briefcase className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" disabled={disabled}
                              onClick={() => toggleRole(u.id, "manager", true)} title="Tornar gestor">
                              <BriefcaseBusiness className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={disabled} title="Excluir">
                              <Trash2 className="h-4 w-4 text-[color:var(--color-brand-red)]" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação remove o acesso de {u.email} e apaga o progresso. Não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeUser(u.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">Nenhum usuário ainda.</p>}
      </div>
    </CardContent></Card>
  );
}
