import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { hasActiveAdmAccess } from "@/lib/adm-access";
import { completeContaMaxLogin, type ContaMaxResult } from "@/lib/conta-max-flow";

export const Route = createFileRoute("/conta-max")({
  ssr: false,
  component: ContaMaxReturn,
});

const messages: Record<Exclude<ContaMaxResult, "ok">, string> = {
  missing_ticket: "O passe de acesso não foi encontrado. Tente entrar novamente.",
  bridge_failed: "Não foi possível confirmar a conta no ADM MAX. Verifique se ela está ativa e tente novamente.",
  session_failed: "Não foi possível iniciar sua sessão. Tente novamente.",
  not_allowed: "Esta conta não tem acesso ativo ao ADM MAX.",
};

function ContaMaxReturn() {
  const router = useRouter();
  const [failure, setFailure] = useState<Exclude<ContaMaxResult, "ok"> | null>(null);

  useEffect(() => {
    let mounted = true;
    const ticket = new URLSearchParams(window.location.search).get("ticket");
    void completeContaMaxLogin(ticket, {
      invoke: (value) => supabase.functions.invoke("conta-max-bridge", { body: { ticket: value } }),
      setSession: (tokens) => supabase.auth.setSession(tokens),
      isAllowed: hasActiveAdmAccess,
      signOut: () => supabase.auth.signOut({ scope: "local" }),
      navigate: () => router.navigate({ to: "/app", replace: true }),
    }).then((result) => {
      if (mounted && result !== "ok") setFailure(result);
    });
    return () => { mounted = false; };
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-10">
        <BrandMark />
        <Card className="mt-8 w-full">
          <CardContent className="space-y-4 pt-6 text-center" role="status" aria-live="polite">
            <h1 className="text-xl font-semibold">Conta MAX</h1>
            <p>{failure ? messages[failure] : "Confirmando sua conta e abrindo a Academia…"}</p>
            {failure && <Link to="/auth" className="text-[color:var(--color-brand)] hover:underline">Voltar ao login</Link>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
