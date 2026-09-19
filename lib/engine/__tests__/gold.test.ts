// 정답 사례 × 시드 카탈로그 — 규정대로 판정하는지 (goldCases.ts의 한계 설명 참고)

import { describe, expect, it } from "vitest";

import { loadSeedCatalog } from "@/lib/data/seedRepository";
import { evaluateProgram, toFlatProfile } from "@/lib/engine/evaluate";

import { GOLD_CASES } from "./goldCases";
import { TODAY, profile } from "./helpers";

const { programs } = loadSeedCatalog(TODAY);
const all = [...programs];

describe("정답 사례", () => {
  for (const g of GOLD_CASES) {
    it(`${g.id} ${g.programId} · ${g.who} → ${g.expected}`, () => {
      const program = all.find((p) => p.id === g.programId);
      expect(program, `${g.programId}가 카탈로그에 없습니다`).toBeTruthy();
      const v = evaluateProgram(program!, toFlatProfile(profile(g.input, TODAY), TODAY), TODAY);
      expect(v.overall, g.why).toBe(g.expected);
    });
  }
});
