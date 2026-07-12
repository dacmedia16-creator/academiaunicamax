import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { BookOpen, CheckCircle2, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import bannerAsset from "@/assets/academia-remax-banner.png.asset.json";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    // If already signed in on client, jump into the app
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/app" });
    }
  },
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[color:var(--color-brand-red)]" />
              Plataforma oficial de treinamentos
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Aprenda a vender mais no <span className="text-[color:var(--color-brand)]">mercado</span> <span className="text-[color:var(--color-brand-red)]">imobiliário</span>.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Cursos em vídeo com progresso individual, aulas desbloqueadas em sequência
              e conteúdos práticos sobre atendimento, captação, negociação e marketing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild><Link to="/auth">Criar minha conta</Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/auth">Já tenho login</Link></Button>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-[color:var(--color-brand)]" />6 cursos</div>
              <div className="flex items-center gap-2"><PlayCircle className="h-4 w-4 text-[color:var(--color-brand)]" />Vídeo aulas</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[color:var(--color-brand)]" />Progresso</div>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-border">
              <img
                src={bannerAsset.url}
                alt="Academia RE/MAX — Treinamento que transforma, resultados que se destacam"
                className="h-auto w-full object-cover"
                loading="eager"
              />
            </div>
          </div>

        </div>
      </section>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} RE/MAX Academy — Plataforma de treinamentos.
      </footer>
    </div>
  );
}
