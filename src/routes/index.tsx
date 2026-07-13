import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { ArrowRight, BookOpen, CheckCircle2, PlayCircle, Sparkles, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import bannerAsset from "@/assets/academia-remax-banner.png.asset.json";
import logoAsset from "@/assets/academia-remax-logo.png.asset.json";

const OG_IMAGE = "https://academiaunicamax.lovable.app/__l5e/assets-v1/1dc23e01-e660-455d-9cdb-b52a7484c596/academia-remax-logo.png";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/app" });
    }
  },
  head: () => ({
    meta: [
      { property: "og:url", content: "https://academiaunicamax.lovable.app/" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:alt", content: "Academia RE/MAX — Plataforma de treinamentos" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://academiaunicamax.lovable.app/" }],
  }),
  component: LandingPage,
});

const MODULES = [
  { label: "Atendimento", span: "md:col-span-2 md:row-span-2" },
  { label: "Captação", span: "" },
  { label: "Negociação", span: "" },
  { label: "Marketing", span: "md:col-span-2" },
  { label: "Gestão", span: "" },
  { label: "Mindset", span: "" },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      {/* Fundo global com halos radiais */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#1e40af] opacity-30 blur-[140px]" />
        <div className="absolute -bottom-40 -right-32 h-[520px] w-[520px] rounded-full bg-[#ef2b2d] opacity-25 blur-[160px]" />
        <div className="absolute inset-0 grid-neon opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      </div>

      <SiteHeader />

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-12 md:gap-8 md:py-24">
          <div className="md:col-span-5 md:pt-6">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ef2b2d] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ef2b2d]" />
              </span>
              Academia RE/MAX · Única Escolha
            </div>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl">
              Vender imóveis
              <br />
              é <span className="text-gradient-brand">ciência</span>.
            </h1>
            <p className="mt-5 max-w-md text-base text-white/70 md:text-lg">
              Treinamentos em vídeo, no seu ritmo. Menos teoria, mais fechamento.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                asChild
                className="h-12 bg-[#ef2b2d] px-6 text-base font-semibold text-white shadow-[0_10px_40px_-10px_rgba(239,43,45,0.7)] hover:brightness-110"
              >
                <Link to="/auth">
                  Entrar na Academia <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 border-white/20 bg-white/5 px-6 text-base font-semibold text-white backdrop-blur hover:bg-white/10 hover:text-white"
              >
                <Link to="/auth">Criar conta</Link>
              </Button>
            </div>
          </div>

          {/* Visual à direita */}
          <div className="relative md:col-span-7">
            <div className="relative mx-auto max-w-2xl">
              {/* moldura com glow */}
              <div className="absolute -inset-4 rounded-[2rem] bg-futuristic-gradient opacity-40 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111a2e] glow-ring">
                <div className="absolute inset-0 grid-neon opacity-40" />
                <img
                  src={bannerAsset.url}
                  alt="Academia RE/MAX"
                  className="relative z-10 h-auto w-full object-cover mix-blend-screen"
                  loading="eager"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#0b0f1a] via-transparent to-[#ef2b2d]/20" />
                {/* HUD chips */}
                <div className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/90 backdrop-blur">
                  <Zap className="h-3 w-3 text-[#60a5fa]" /> Ao vivo
                </div>
                <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/90 backdrop-blur">
                  <Sparkles className="h-3 w-3 text-[#ef2b2d]" /> V.2026
                </div>
              </div>

              {/* card flutuante de progresso */}
              <div className="absolute -bottom-6 -left-6 hidden w-56 rounded-2xl glass-panel p-4 md:block">
                <div className="flex items-center justify-between text-[11px] text-white/70">
                  <span className="uppercase tracking-widest">Progresso</span>
                  <span className="font-bold text-white">78%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[78%] bg-futuristic-gradient" />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-white/80">
                  <Trophy className="h-4 w-4 text-[#60a5fa]" /> Módulo Negociação
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STAT STRIP */}
      <section className="mx-auto -mt-4 max-w-7xl px-4">
        <div className="grid grid-cols-2 gap-3 rounded-2xl glass-panel p-4 sm:grid-cols-4 md:gap-6 md:p-6">
          <Stat icon={<BookOpen className="h-4 w-4" />} value="6" label="Cursos" />
          <Stat icon={<PlayCircle className="h-4 w-4" />} value="80+" label="Vídeo aulas" />
          <Stat icon={<CheckCircle2 className="h-4 w-4" />} value="100%" label="No seu ritmo" />
          <Stat icon={<Trophy className="h-4 w-4" />} value="1:1" label="Progresso individual" />
        </div>
      </section>

      {/* BENTO */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Trilhas de <span className="text-gradient-brand">alta performance</span>
          </h2>
          <span className="hidden text-xs uppercase tracking-widest text-white/50 sm:block">
            06 módulos · foco em prática
          </span>
        </div>

        <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {MODULES.map((m, i) => (
            <ModuleTile key={m.label} label={m.label} span={m.span} index={i} />
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="relative mx-auto max-w-7xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-white/10">
          <img
            src={bannerAsset.url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-screen"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f1a] via-[#111a2e]/85 to-[#ef2b2d]/70" />
          <div className="absolute inset-0 grid-neon opacity-30" />
          <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-16 text-center md:py-24">
            <img src={logoAsset.url} alt="Academia RE/MAX" className="h-14 w-14 rounded-full object-contain" />
            <h3 className="max-w-2xl font-display text-3xl font-extrabold leading-tight md:text-5xl">
              A próxima venda começa <span className="text-gradient-brand">agora</span>.
            </h3>
            <Button
              size="lg"
              asChild
              className="h-12 bg-white px-8 text-base font-semibold text-[#0b0f1a] hover:bg-white/90"
            >
              <Link to="/auth">
                Começar agora <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-white/50">
        © {new Date().getFullYear()} RE/MAX Academy — Plataforma de treinamentos.
      </footer>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-[#60a5fa] ring-1 ring-white/10">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-display text-xl font-extrabold leading-none">{value}</div>
        <div className="mt-1 text-[11px] uppercase tracking-widest text-white/60">{label}</div>
      </div>
    </div>
  );
}

function ModuleTile({ label, span, index }: { label: string; span: string; index: number }) {
  const isAccent = index % 3 === 0;
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111a2e] ${span}`}
    >
      <img
        src={bannerAsset.url}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-50 transition duration-700 group-hover:scale-105 group-hover:opacity-70"
        aria-hidden
        loading="lazy"
      />
      <div
        className={`absolute inset-0 ${
          isAccent
            ? "bg-gradient-to-br from-[#0b0f1a] via-[#111a2e]/70 to-[#ef2b2d]/60"
            : "bg-gradient-to-br from-[#0b0f1a] via-[#111a2e]/60 to-[#1e40af]/55"
        }`}
      />
      <div className="absolute inset-0 grid-neon opacity-25" />
      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur">
          0{index + 1}
        </span>
        <div>
          <div className="font-display text-xl font-extrabold leading-tight md:text-2xl">{label}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] uppercase tracking-widest text-white/70">
            Trilha <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
