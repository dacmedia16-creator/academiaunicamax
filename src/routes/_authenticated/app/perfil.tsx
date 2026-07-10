import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useUser } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/perfil")({
  component: ProfilePage,
});

function ProfilePage() {
  const user = useUser();
  const isAdmin = useIsAdmin();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setName(data?.full_name ?? ""));
  }, [user?.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", user.id);
    setLoading(false);
    if (error) toast.error(error.message); else toast.success("Perfil atualizado");
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">Atualize seus dados.</p>
      </div>
      <Card><CardContent className="pt-6">
        <form className="space-y-4" onSubmit={save}>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Perfil de acesso</Label>
            <div className="mt-2">
              <Badge variant={isAdmin ? "default" : "secondary"}>{isAdmin ? "Administrador" : "Aluno"}</Badge>
            </div>
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar"}</Button>
        </form>
      </CardContent></Card>
    </div>
  );
}
