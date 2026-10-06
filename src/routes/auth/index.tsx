import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { BrandMark } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { hasActiveAdmAccess } from "@/lib/adm-access";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const GOOGLE_LOGIN_URL = "https://conta-max-poc.dacmedia16.workers.dev/login?app=academia-max";

// A Academia não cria contas no Auth do ADM; só contas já existentes podem entrar.
const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const Route = createFileRoute("/auth/")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/app" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.user) {
      setLoading(false);
      toast.error("Não foi possível entrar. Verifique seus dados.");
      return;
    }
    const allowed = await hasActiveAdmAccess().catch(() => false);
    if (!allowed) {
      await supabase.auth.signOut({ scope: "local" });
      setLoading(false);
      toast.error("Acesso restrito a contas ativas do ADM MAX.");
      return;
    }
    setLoading(false);
    toast.success("Bem-vindo!");
    navigate({ to: "/app" });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-10">
        <BrandMark />
        <Card className="mt-8 w-full">
          <CardContent className="pt-6">
            <h1 className="text-xl font-semibold">Entrar na Academia</h1>
            <p className="mt-2 text-sm text-muted-foreground">Use sua conta ativa no ADM MAX.</p>
            <Button type="button" variant="outline" className="mt-5 w-full" asChild>
              <a href={GOOGLE_LOGIN_URL}>Entrar com Google</a>
            </Button>
            <div className="my-5 text-center text-xs text-muted-foreground">ou entre com sua senha</div>
            <form onSubmit={onLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="l-email">E-mail</Label>
                <Input id="l-email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="l-password">Senha</Label>
                  <Link to="/auth/forgot" className="text-xs text-[color:var(--color-brand)] hover:underline">Esqueci minha senha</Link>
                </div>
                <Input id="l-password" name="password" type="password" required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Entrar
              </Button>
            </form>
            <p className="mt-4 text-xs text-muted-foreground">Sem acesso? Peça ao administrador da sua agência no ADM MAX.</p>
          </CardContent>
        </Card>
        <Link to="/" className="mt-6 text-sm text-muted-foreground hover:underline">← Voltar ao início</Link>
      </div>
    </div>
  );
}
