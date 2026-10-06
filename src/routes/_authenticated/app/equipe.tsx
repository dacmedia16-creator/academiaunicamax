import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyContext, useUser } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Search, Users } from "lucide-react";
import {
  canSeeTeam,
  currentLessonLabel,
  filterRows,
  percent,
  STATUS_META,
  teamOptions,
  teamStatus,
  type TeamProgressRow,
  type TeamStatus,
} from "@/lib/team-progress";

export const Route = createFileRoute("/_authenticated/app/equipe")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const uid = (context as { user?: { id?: string } }).user?.id;
    if (!uid) throw redirect({ to: "/auth" });
    // Corretor não acessa; o banco também recusa (team_progress_overview → forbidden).
    const ctx = await fetchMyContext().catch(() => null);
    if (!ctx || ctx.user_id !== uid || !canSeeTeam(ctx.role)) throw redirect({ to: "/app" });
    return { teamRole: ctx.role };
  },
  component: TeamPage,
});

async function fetchTeamProgress(): Promise<TeamProgressRow[]> {
  const { data, error } = await supabase.rpc("team_progress_overview");
  if (error) throw error;
  return (data ?? []) as TeamProgressRow[];
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
function fmtDate(iso: string | null) {
  return iso ? dateFmt.format(new Date(iso)) : "—";
}

function StatusBadge({ status }: { status: TeamStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${m.className}`}>
      <span className={`h-2 w-2 rounded-full ${m.dot}`} aria-hidden />
      {m.label}
    </span>
  );
}

function TeamPage() {
  const user = useUser();
  const { teamRole } = Route.useRouteContext();
  const [team, setTeam] = useState("all");
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["team-progress", user?.id ?? "-"],
    queryFn: fetchTeamProgress,
    enabled: !!user,
    staleTime: 60_000,
  });

  const rows = data ?? [];
  const options = useMemo(() => teamOptions(rows), [rows]);
  const filtered = useMemo(() => filterRows(rows, { team, query }), [rows, team, query]);
  const now = useMemo(() => new Date(), [data]);
  const counts = useMemo(() => {
    const c: Record<TeamStatus, number> = { done: 0, "in-progress": 0, "not-started": 0, stalled: 0 };
    for (const r of filtered) c[teamStatus(r, now)]++;
    return c;
  }, [filtered, now]);

  const subtitle =
    teamRole === "manager"
      ? "Progresso das pessoas da sua equipe e subequipes."
      : teamRole === "admin"
        ? "Progresso de todas as equipes da sua imobiliária."
        : "Progresso de todas as equipes.";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold md:text-3xl">
          <Users className="h-6 w-6 text-[color:var(--color-brand-red)]" />Minha equipe
        </h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <div className="space-y-1">
          <Label htmlFor="team-filter">Equipe</Label>
          <select
            id="team-filter"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Todas as equipes</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="team-search">Buscar por nome</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="team-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite um nome" className="h-11 pl-9" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.keys(STATUS_META) as TeamStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1"><StatusBadge status={s} /> {counts[s]}</span>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {error && <p className="text-sm text-destructive">Não foi possível carregar o progresso da equipe.</p>}
      {!isLoading && !error && filtered.length === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhuma pessoa encontrada.</CardContent></Card>
      )}

      {filtered.length > 0 && (
        <>
          {/* Celular: cartões */}
          <ul className="space-y-3 md:hidden">
            {filtered.map((r) => {
              const st = teamStatus(r, now);
              const pct = percent(r);
              return (
                <li key={r.user_id}>
                  <Card><CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{r.nome ?? "Sem nome"}</div>
                        <div className="truncate text-xs text-muted-foreground">{r.team_nome ?? "Sem equipe"}</div>
                      </div>
                      <StatusBadge status={st} />
                    </div>
                    <div className="text-sm">{currentLessonLabel(r)}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="w-10 text-right text-xs font-medium">{pct}%</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{r.completed_lessons} de {r.total_lessons} aulas</span>
                      <span>Última atividade: {fmtDate(r.last_activity_at)}</span>
                    </div>
                  </CardContent></Card>
                </li>
              );
            })}
          </ul>

          {/* Desktop: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Equipe</th>
                  <th className="px-3 py-2">Aula atual</th>
                  <th className="px-3 py-2">Concluídas</th>
                  <th className="px-3 py-2">% do curso</th>
                  <th className="px-3 py-2">Última atividade</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const pct = percent(r);
                  return (
                    <tr key={r.user_id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{r.nome ?? "Sem nome"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.team_nome ?? "Sem equipe"}</td>
                      <td className="max-w-[260px] truncate px-3 py-2" title={currentLessonLabel(r)}>{currentLessonLabel(r)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{r.completed_lessons} de {r.total_lessons}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2"><Progress value={pct} className="h-2 w-20" /><span>{pct}%</span></div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{fmtDate(r.last_activity_at)}</td>
                      <td className="px-3 py-2"><StatusBadge status={teamStatus(r, now)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
