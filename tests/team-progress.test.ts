// Rodar: bun test tests/team-progress.test.ts  (local, sem rede)
import { expect, test } from "bun:test";
import { canSeeTeam, currentLessonLabel, filterRows, percent, teamOptions, teamStatus, NO_TEAM, type TeamProgressRow } from "../src/lib/team-progress";

const now = new Date("2026-10-06T12:00:00Z");
const base: TeamProgressRow = {
  user_id: "u", nome: "Ana", organization_id: "o1", organization_nome: "Org", team_id: "t1", team_nome: "Equipe A",
  completed_lessons: 0, total_lessons: 10, current_lesson_id: "l1", current_lesson_title: "Boas-vindas",
  current_lesson_position: 1, current_lesson_in_progress: false, last_activity_at: null,
};

test("status: verde/azul/cinza/âmbar", () => {
  expect(teamStatus({ ...base, completed_lessons: 10 }, now)).toBe("done");
  expect(teamStatus(base, now)).toBe("not-started");
  expect(teamStatus({ ...base, completed_lessons: 2, last_activity_at: "2026-10-04T12:00:00Z" }, now)).toBe("in-progress");
  expect(teamStatus({ ...base, completed_lessons: 2, last_activity_at: "2026-09-28T11:00:00Z" }, now)).toBe("stalled");
  // exatamente 7 dias ainda conta como em andamento; acima disso, parado
  expect(teamStatus({ ...base, last_activity_at: "2026-09-29T12:00:00Z" }, now)).toBe("in-progress");
  expect(teamStatus({ ...base, completed_lessons: 10, last_activity_at: "2026-01-01T00:00:00Z" }, now)).toBe("done");
});

test("percentual e aula atual", () => {
  expect(percent({ ...base, completed_lessons: 3 })).toBe(30);
  expect(percent({ ...base, total_lessons: 0 })).toBe(0);
  expect(currentLessonLabel(base)).toBe("Aula 1: Boas-vindas");
  expect(currentLessonLabel({ ...base, completed_lessons: 10, current_lesson_title: null })).toBe("Curso concluído");
});

test("filtro por equipe e busca sem acento", () => {
  const rows = [base, { ...base, user_id: "v", nome: "João Él", team_id: "t2", team_nome: "Equipe B" }, { ...base, user_id: "w", nome: "Zé", team_id: null, team_nome: null }];
  expect(filterRows(rows, { team: "t2", query: "" }).map((r) => r.user_id)).toEqual(["v"]);
  expect(filterRows(rows, { team: "all", query: "joao el" }).map((r) => r.user_id)).toEqual(["v"]);
  expect(filterRows(rows, { team: NO_TEAM, query: "" }).map((r) => r.user_id)).toEqual(["w"]);
  expect(teamOptions(rows).map((o) => o.label)).toEqual(["Equipe A", "Equipe B", "Sem equipe"]);
});

test("menu só para gestor, admin e plataforma", () => {
  expect(canSeeTeam("manager")).toBe(true);
  expect(canSeeTeam("admin")).toBe(true);
  expect(canSeeTeam("platform")).toBe(true);
  expect(canSeeTeam("student")).toBe(false);
  expect(canSeeTeam(null)).toBe(false);
});
