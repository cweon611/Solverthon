import { describe, expect, it } from "vitest";

import { companyIntro, enrichTemplate, tableFor, type TableKind } from "@/lib/draft/enrich";
import { readiness, sectionQuality, targetChars } from "@/lib/draft/quality";
import { budgetTable, scheduleTable, targetTable } from "@/lib/draft/tables";

import { TODAY, profile, program } from "@/lib/engine/__tests__/helpers";

const p = program({ apply_end: "2026-10-01", title: "테스트 지원사업" });
const me = profile({ name: "테크스타트", annual_revenue_krw: 320_000_000 });
const opts = (heading: string, used = new Set<TableKind>()) => ({ heading, program: p, profile: me, usedTables: used });

describe("문단 다듬기", () => {
  it("단독 줄 {{lib:키}} 앞에 도입 문장을 넣는다", () => {
    expect(enrichTemplate("{{lib:problem}}", opts("1. 문제 인식"))).toBe("당사가 해결하려는 문제는 다음과 같습니다.\n{{lib:problem}}");
  });

  it("꼬리표 줄은 도입 문장으로 바꾼다", () => {
    expect(enrichTemplate("목표 고객\n{{lib:customer}}", opts("1. 문제 인식"))).toBe("본 사업의 목표 고객은 다음과 같습니다.\n{{lib:customer}}");
  });

  it("앞 줄이 이미 문장이면 그대로 둔다", () => {
    const t = "당사는 다음 문제를 풀고 있습니다.\n{{lib:problem}}";
    expect(enrichTemplate(t, opts("1. 문제 인식"))).toBe(t);
  });

  it("문장 중간의 토큰은 건드리지 않는다", () => {
    const t = "당사는 {{lib:problem}}을 해결합니다.";
    expect(enrichTemplate(t, opts("1. 문제 인식"))).toBe(t);
  });

  it("문단 제목에 맞는 표를 한 번만 붙인다", () => {
    const used = new Set<TableKind>();
    const first = enrichTemplate("{{lib:schedule}}", opts("4. 추진 일정", used));
    expect(first).toContain("[추진 일정표]");
    expect(enrichTemplate("{{lib:schedule}}", opts("5. 추진 일정 보완", used))).not.toContain("[추진 일정표]");
  });

  it("제목으로 표 종류를 고른다", () => {
    expect(tableFor("3. 자금 사용 계획")).toBe("budget");
    expect(tableFor("4. 추진 일정")).toBe("schedule");
    expect(tableFor("5. 기대효과")).toBe("targets");
    expect(tableFor("1. 문제 인식")).toBeNull();
  });

  it("회사 소개 문장에 프로필과 충족 요건이 들어간다", () => {
    const s = companyIntro(p, me, "2년", ["업력 3년 이내", "상시근로자 10인 미만"]);
    expect(s).toContain("테크스타트");
    expect(s).toContain("광주광역시");
    expect(s).toContain("업력 2년");
    expect(s).toContain("업력 3년 이내 · 상시근로자 10인 미만 요건을 충족합니다");
  });
});

describe("표", () => {
  it("일정표는 마감일을 안내하고 칸은 빈칸으로 둔다", () => {
    const t = scheduleTable(p);
    expect(t).toContain("| 구분 | 추진 내용 | 산출물 | 담당 |");
    expect(t).toContain("2026.10.01");
    expect(t).toContain("[[1~3개월에 할 일]]");
  });

  it("자금표는 비목을 주고 금액은 빈칸", () => {
    expect(budgetTable()).toContain("인건비");
    expect(budgetTable()).toContain("[[금액]]");
  });

  it("목표표는 아는 현재 값을 채운다", () => {
    expect(targetTable(me)).toContain("3.2억원");
    expect(targetTable(me)).toContain("4명");
    expect(targetTable(null)).toContain("[[현재]]");
  });
});

describe("품질 점검", () => {
  it("권장 분량은 평가항목 연결 여부로 정한다", () => {
    expect(targetChars({ criteriaCount: 2, heading: "2. 실현 가능성" })).toBe(800);
    expect(targetChars({ criteriaCount: 1, heading: "3. 성장 전략" })).toBe(600);
    expect(targetChars({ criteriaCount: 0, heading: "신청 자격 충족 현황" })).toBe(200);
  });

  it("빈칸은 분량에서 빼고, 수치·출처·과장 표현을 본다", () => {
    const q = sectionQuality("매출 1억원을 목표로 합니다. 출처: 통계청. [[빈칸]] 최고의 제품입니다.", { criteriaCount: 1, heading: "3. 성장 전략" });
    expect(q.blanks).toBe(1);
    expect(q.hasNumber).toBe(true);
    expect(q.hasSource).toBe(true);
    expect(q.hype).toEqual(["최고"]);
    expect(q.chars).toBeLessThan(60);
  });

  it("체크리스트는 통과하지 못한 이유를 적는다", () => {
    const q = sectionQuality("짧다 [[빈칸]]", { criteriaCount: 1, heading: "2. 실현 가능성" });
    const checks = readiness({
      sections: [{ heading: "2. 실현 가능성", quality: q, criteria: [0] }],
      criteriaCount: 2,
      documents: [{ name: "사업자등록증명", is_required: true }],
    });
    const by = (label: string) => checks.find((c) => c.label.startsWith(label))!;
    expect(by("빈칸을").ok).toBe(false);
    expect(by("문단 분량이").ok).toBe(false);
    expect(by("평가항목을").ok).toBe(false);
    expect(by("평가항목을").detail).toContain("1개 평가항목");
    expect(by("숫자로").ok).toBe(false);
    expect(by("제출 서류를").ok).toBe(true);
  });
});
