// Rodar: bun test tests/lesson-card.test.ts  (local, sem rede)
import { expect, test } from "bun:test";
import { lessonCardState } from "../src/lib/lesson-card";

const ordered = [{ id: "a" }, { id: "b" }, { id: "c" }];

test("sem progresso: 1ª disponível, demais bloqueadas", () => {
  const m = new Map();
  expect(lessonCardState(ordered, m, "a")).toEqual({ status: "available", label: "Disponível", locked: false });
  expect(lessonCardState(ordered, m, "b").status).toBe("locked");
  expect(lessonCardState(ordered, m, "c").label).toBe("Bloqueada");
});

test("em andamento mostra o percentual arredondado", () => {
  const m = new Map([["a", { percent: 44.6, completed: false }]]);
  expect(lessonCardState(ordered, m, "a")).toEqual({ status: "in-progress", label: "Em andamento 45%", locked: false });
  expect(lessonCardState(ordered, m, "b").locked).toBe(true);
});

test("concluída libera a seguinte", () => {
  const m = new Map([
    ["a", { percent: 100, completed: true }],
    ["b", { percent: 0, completed: false }],
  ]);
  expect(lessonCardState(ordered, m, "a").status).toBe("done");
  expect(lessonCardState(ordered, m, "b").status).toBe("available");
  expect(lessonCardState(ordered, m, "c").status).toBe("locked");
});

test("percentual 100 sem conclusão não aparece como 100%", () => {
  const m = new Map([["a", { percent: 100, completed: false }]]);
  expect(lessonCardState(ordered, m, "a").label).toBe("Em andamento 99%");
});
