import { describe, expect, it } from "vitest";

import { applyPrefill, buildPrefillValues } from "@/lib/ai/prefill";
import { loadSeedCatalog } from "@/lib/data/seedRepository";
import { eligibilityEvidence } from "@/lib/draft/evidence";
import { LIB_KEYS, libraryProgress } from "@/lib/draft/library";
import { buildBasicDraft } from "@/lib/draft/template";
import { evaluateProgram, toFlatProfile } from "@/lib/engine/evaluate";

import { TODAY, profile } from "@/lib/engine/__tests__/helpers";

const { programs } = loadSeedCatalog(TODAY);
const byId = (id: string) => programs.find((p) => p.id === id)!;
const company = profile({ name: "테크스타트", has_tax_arrears: false, prior_support: [], business_direction: "재고 관리 SaaS" });
const flat = toFlatProfile(company, TODAY);

describe("기본 양식 (AI 없음)", () => {
  it("창업 공고는 PSST 목차 + 기업 개요 + 자격 충족 현황", () => {
    const d = buildBasicDraft(byId("seed-01"));
    expect(d.evaluation_criteria.map((c) => c.name)).toEqual([
      "문제 인식 (Problem)", "실현 가능성 (Solution)", "성장 전략 (Scale-up)", "팀 구성 (Team)",
    ]);
    expect(d.sections[0].heading).toBe("0. 기업 개요");
    expect(d.sections.at(-1)!.template).toBe("{{eligibility_summary}}");
    // 모든 평가항목에 관련 문단이 하나 이상 있다
    d.evaluation_criteria.forEach((_, i) => expect(d.sections.some((s) => s.criteria.includes(i))).toBe(true));
    // 공고의 제출 서류를 그대로 옮긴다
    expect(d.documents.map((x) => x.name)).toEqual(byId("seed-01").required_documents.map((x) => x.name));
    // 중복수혜 조건이 있는 공고는 경고
    expect(d.warnings.some((w) => w.includes("수혜 이력"))).toBe(true);
  });

  it("분야별로 다른 목차", () => {
    expect(buildBasicDraft(byId("seed-06")).evaluation_criteria[0].name).toBe("기술성"); // R&D
    expect(buildBasicDraft(byId("seed-08")).evaluation_criteria[0].name).toBe("채용 필요성"); // 고용
    expect(buildBasicDraft(byId("seed-07")).evaluation_criteria[0].name).toBe("해외 진출 역량"); // 수출
    expect(buildBasicDraft(byId("seed-09")).evaluation_criteria[0].name).toBe("필요성"); // 금융
  });

  it("모든 공고의 모든 토큰이 알려진 키다 (채우면 {{ }}가 남지 않는다)", () => {
    const lib = Object.fromEntries(LIB_KEYS.map((k) => [k, `${k} 답`]));
    const values = buildPrefillValues(company, TODAY, { eligibility_summary: "근거" });
    for (const p of programs) {
      for (const s of buildBasicDraft(p).sections) {
        const r = applyPrefill(s.template, values, lib);
        expect(r.text, `${p.id} ${s.heading}`).not.toMatch(/\{\{/);
        expect(r.missing, `${p.id} ${s.heading}`).toEqual([]);
      }
    }
  });

  it("내 사업 정보를 채우면 PSST 문단의 빈칸이 사라진다", () => {
    const d = buildBasicDraft(byId("seed-01"));
    const values = buildPrefillValues(company, TODAY);
    const problem = d.sections[1].template;
    expect(applyPrefill(problem, values, {}).libMissing).toEqual(["problem", "customer"]);
    expect(applyPrefill(problem, values, { problem: "문제", customer: "고객" }).text).toBe("문제\n\n목표 고객은 고객");
  });
});

describe("자격 충족 근거 (판정 엔진 → 문단)", () => {
  it("대상 공고: 요건마다 기준과 우리 값을 적는다", () => {
    const e = eligibilityEvidence(evaluateProgram(byId("seed-01"), flat, TODAY), "테크스타트");
    expect(e.text.split("\n")[0]).toBe("테크스타트은(는) 본 사업의 신청 자격 요건을 아래와 같이 모두 충족합니다.");
    expect(e.text).toContain("- 직원 수: 공고 기준 '상시근로자 10인 미만' — 현재 4인 (충족)");
    expect(e.text).toContain("- 세금 체납: 공고 기준 '국세·지방세 체납 없음' — 현재 체납 없음 (충족)");
    expect(e.warnings).toEqual([]);
  });

  it("확인 필요는 빈칸, 미충족은 경고로 뺀다", () => {
    const unknown = toFlatProfile(profile({ name: "A", has_tax_arrears: null, prior_support: [] }), TODAY);
    const e = eligibilityEvidence(evaluateProgram(byId("seed-01"), unknown, TODAY), "A");
    expect(e.text).toContain("[[세금 체납 여부 확인 후 기재]]");

    const old = toFlatProfile(profile({ name: "B", founded_at: "-60m", has_tax_arrears: false, prior_support: [] }), TODAY);
    const e2 = eligibilityEvidence(evaluateProgram(byId("seed-01"), old, TODAY), "B");
    expect(e2.warnings[0]).toMatch(/^자격 미충족: 업력/);
    expect(e2.text).not.toContain("업력 3년 이내' —");
  });
});

describe("내 사업 정보 진행", () => {
  it("채운 수와 짧은 항목", () => {
    const r = libraryProgress({ problem: "짧음", team: "대표: 카페 운영 5년, CTO: 앱 개발 7년, 연내 개발자 1명 채용 예정" });
    expect(r).toEqual({ filled: 2, total: 10, short: ["problem"] });
  });
});
