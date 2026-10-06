// Regras da tela "Minha equipe" (puras, testáveis sem rede).
export type TeamProgressRow = {
  user_id: string;
  nome: string | null;
  organization_id: string | null;
  organization_nome: string | null;
  team_id: string | null;
  team_nome: string | null;
  completed_lessons: number;
  total_lessons: number;
  current_lesson_id: string | null;
  current_lesson_title: string | null;
  current_lesson_position: number | null;
  current_lesson_in_progress: boolean;
  last_activity_at: string | null;
};

export type TeamStatus = "done" | "in-progress" | "stalled" | "not-started";

export const STALE_DAYS = 7;
const DAY_MS = 86_400_000;

/** verde = concluiu; azul = em andamento; cinza = não começou; âmbar = parado há mais de 7 dias. */
export function teamStatus(row: TeamProgressRow, now: Date = new Date()): TeamStatus {
  const total = row.total_lessons ?? 0;
  if (total > 0 && row.completed_lessons >= total) return "done";
  if (!row.last_activity_at && row.completed_lessons === 0) return "not-started";
  const last = row.last_activity_at ? new Date(row.last_activity_at).getTime() : NaN;
  if (Number.isFinite(last) && now.getTime() - last > STALE_DAYS * DAY_MS) return "stalled";
  return "in-progress";
}

export const STATUS_META: Record<TeamStatus, { label: string; className: string; dot: string }> = {
  done: { label: "Concluiu", className: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  "in-progress": { label: "Em andamento", className: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500" },
  "not-started": { label: "Não começou", className: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  stalled: { label: "Parado há mais de 7 dias", className: "bg-amber-100 text-amber-900 border-amber-200", dot: "bg-amber-500" },
};

export function percent(row: TeamProgressRow): number {
  if (!row.total_lessons) return 0;
  return Math.round((row.completed_lessons / row.total_lessons) * 100);
}

/** Remove acentos e caixa para a busca por nome. */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export const NO_TEAM = "__sem_equipe__";

export function filterRows(rows: TeamProgressRow[], opts: { team: string; query: string }): TeamProgressRow[] {
  const q = normalize(opts.query);
  return rows.filter((r) => {
    if (opts.team !== "all") {
      const key = r.team_id ?? NO_TEAM;
      if (key !== opts.team) return false;
    }
    if (q && !normalize(r.nome ?? "").includes(q)) return false;
    return true;
  });
}

export function teamOptions(rows: TeamProgressRow[]): { value: string; label: string }[] {
  const map = new Map<string, string>();
  const multiOrg = new Set(rows.map((r) => r.organization_id)).size > 1;
  for (const r of rows) {
    const key = r.team_id ?? NO_TEAM;
    if (map.has(key)) continue;
    const base = r.team_nome ?? "Sem equipe";
    map.set(key, multiOrg && r.team_id && r.organization_nome ? `${base} · ${r.organization_nome}` : base);
  }
  return [...map.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => (a.value === NO_TEAM ? 1 : b.value === NO_TEAM ? -1 : a.label.localeCompare(b.label, "pt-BR")));
}

export function currentLessonLabel(row: TeamProgressRow): string {
  if (!row.current_lesson_title) return row.total_lessons > 0 && row.completed_lessons >= row.total_lessons ? "Curso concluído" : "—";
  const pos = row.current_lesson_position ? `Aula ${row.current_lesson_position}: ` : "";
  return `${pos}${row.current_lesson_title}`;
}

export function canSeeTeam(role: string | null | undefined): boolean {
  return role === "platform" || role === "admin" || role === "manager";
}
