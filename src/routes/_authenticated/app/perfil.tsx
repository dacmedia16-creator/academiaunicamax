import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAcademiaContext, useUser, ROLE_LABEL } from "@/hooks/use-auth";
import { fetchMyHistory } from "@/lib/courses";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/perfil")({
  component: ProfilePage,
});

// Nome, papel e agência vêm do ADM MAX (fonte única). Aqui é só leitura + histórico próprio,
// que continua disponível mesmo para quem foi desligado.
function ProfilePage() {
  const user = useUser();
  const ctx = useAcademiaContext();
  const { data: history } = useQuery({ queryKey: ["my-history", user?.id ?? "-"], queryFn: fetchMyHistory, enabled: !!user });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">Seus dados são geridos no ADM MAX.</p>
      </div>
      <Card><CardContent className="space-y-4 pt-6">
        <div className="space-y-2"><Label>E-mail</Label><Input value={user?.email ?? ""} disabled /></div>
        <div className="space-y-2"><Label>Nome</Label><Input value={ctx?.nome ?? ""} disabled /></div>
        <div>
          <Label>Perfil de acesso</Label>
          <div className="mt-2">
            {ctx?.role
              ? <Badge>{ROLE_LABEL[ctx.role]}</Badge>
              : <Badge variant="secondary">Sem acesso ao catálogo (procure o administrador da sua agência)</Badge>}
          </div>
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6">
        <h2 className="mb-3 text-lg font-bold">Meu histórico</h2>
        {!history?.length && <p className="text-sm text-muted-foreground">Nenhuma aula assistida ainda.</p>}
        <ul className="divide-y divide-border text-sm">
          {history?.map((h) => (
            <li key={h.lesson_id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{h.lesson_title}</div>
                <div className="truncate text-xs text-muted-foreground">{h.course_title}</div>
              </div>
              <div className="whitespace-nowrap text-xs">
                {h.completed ? `Concluída em ${new Date(h.completed_at!).toLocaleDateString("pt-BR")}` : `${Math.round(h.percent)}%`}
              </div>
            </li>
          ))}
        </ul>
      </CardContent></Card>
    </div>
  );
}
