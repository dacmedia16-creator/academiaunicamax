import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { BrandMark } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/forgot")({
  component: ForgotPage,
});

function ForgotPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = z.string().trim().email("E-mail inválido").safeParse(fd.get("email"));
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-10">
        <BrandMark />
        <Card className="mt-8 w-full">
          <CardContent className="pt-6">
            <h1 className="text-xl font-semibold">Recuperar senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enviaremos um link para redefinir sua senha.</p>
            {sent ? (
              <div className="mt-6 rounded-md border border-border bg-accent/30 p-4 text-sm">
                Se o e-mail estiver cadastrado, você receberá as instruções em instantes.
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" required autoComplete="email" />
                </div>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar link
                </Button>
              </form>
            )}
            <div className="mt-4 text-center text-sm">
              <Link to="/auth" className="text-[color:var(--color-brand)] hover:underline">Voltar ao login</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
