// PRD §12.1 케이스 36~38 — dedupe

import { describe, expect, it } from "vitest";

import { buildEmbeddingText, cosineSimilarity, decideDuplicate, periodsOverlap } from "@/lib/engine/dedupe";

const period = (apply_start: string | null, apply_end: string | null, is_rolling = false) => ({
  apply_start,
  apply_end,
  is_rolling,
});

describe("dedupe", () => {
  it("36. cosineSimilarity — 같은 벡터 1, 직교 0", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0); // 영벡터
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow();
  });

  it("37. periodsOverlap — 겹침·비겹침·rolling·null", () => {
    expect(periodsOverlap(period("2026-08-01", "2026-09-15"), period("2026-09-01", "2026-09-30"))).toBe(true);
    expect(periodsOverlap(period("2026-08-01", "2026-08-20"), period("2026-09-01", "2026-09-30"))).toBe(false);
    expect(periodsOverlap(period("2026-08-01", "2026-08-20"), period(null, null, true))).toBe(true);
    expect(periodsOverlap(period("2026-08-01", null), period("2026-09-01", "2026-09-30"))).toBe(true);
    // 경계일이 맞닿으면 겹친 것으로 본다
    expect(periodsOverlap(period("2026-08-01", "2026-09-01"), period("2026-09-01", "2026-09-30"))).toBe(true);
  });

  it("38. decideDuplicate — 임계값 0.92/0.85 + 기간 겹침", () => {
    expect(decideDuplicate(0.95, true)).toBe("duplicate");
    expect(decideDuplicate(0.95, false)).toBe("review");
    expect(decideDuplicate(0.86, true)).toBe("review");
    expect(decideDuplicate(0.5, true)).toBe("distinct");
    expect(decideDuplicate(0.92, true)).toBe("duplicate"); // 경계 포함
    expect(decideDuplicate(0.85, false)).toBe("review"); // 경계 포함
  });

  it("buildEmbeddingText — 저장 시와 질의 시가 같은 템플릿", () => {
    expect(
      buildEmbeddingText({
        title: "초기창업패키지",
        organization: "창업진흥원",
        amount_text: "최대 1억원",
        summary: "창업 3년 이내 기업 지원",
        raw_text: null,
      }),
    ).toBe("초기창업패키지\n기관: 창업진흥원\n지원: 최대 1억원\n창업 3년 이내 기업 지원");

    // summary가 없으면 raw_text 앞 1500자를 쓴다
    const long = "가".repeat(2000);
    const text = buildEmbeddingText({
      title: "제목",
      organization: "기관",
      amount_text: null,
      summary: null,
      raw_text: long,
    });
    expect(text).toBe(`제목\n기관: 기관\n지원: \n${"가".repeat(1500)}`);
  });
});
