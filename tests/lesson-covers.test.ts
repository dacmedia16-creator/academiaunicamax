import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { COVERS_VERSION, lessonCoverUrl } from "../src/lib/lesson-covers";

const IDS = [
  "948a9ba4-58ef-46c4-8c70-61848083c867",
  "87fd345b-db97-4d14-ab2e-bec9209adc88",
  "5a1e4794-d66b-4dc1-b583-01e680cd2915",
  "a1d1a5c6-006a-456c-b26f-6045d200845d",
  "6ee3f93d-4c36-46fd-9ea9-86d9185ec3f3",
  "ab186123-eb8c-440e-a864-cad4968405e9",
  "e291f0a3-67bf-4e97-90cf-9aadb91b8552",
  "fcdb06bb-b59e-469f-9a1f-f782e8a2565c",
  "7318f7b5-7198-453c-92d2-07cf33924ffa",
  "40006da2-a497-400b-8e91-4b836819874d",
];

test("as 10 aulas têm capa na ordem e o arquivo existe em public/", () => {
  IDS.forEach((id, i) => {
    const url = lessonCoverUrl(id);
    const file = `/aulas/capas/aula-${String(i + 1).padStart(2, "0")}.webp`;
    expect(url).toBe(`${file}?v=${COVERS_VERSION}`);
    expect(existsSync(join(import.meta.dir, "..", "public", file))).toBe(true);
  });
});

test("aula sem capa cai no placeholder", () => {
  expect(lessonCoverUrl("00000000-0000-0000-0000-000000000000")).toBeNull();
});
