// §11 Phase 2 완료 기준 — 시드 × 프로필 3종의 판정이 §10.2 표와 일치하는지 검증한다.
// 시드를 바꾸면 이 테스트도 함께 바꾼다 (§10.0).

import { describe, expect, it } from "vitest";

import { loadDemoProfiles, toStoredProfile } from "@/lib/data/demoProfiles";
import { loadSeedCatalog, loadSeedProgramsIncludingDuplicates } from "@/lib/data/seedRepository";
import { pickTopAlert } from "@/lib/engine/alerts";
import { evaluateProgram, toFlatProfile } from "@/lib/engine/evaluate";
import { computeExpiringList } from "@/lib/engine/expiry";
import { computeLeadTime } from "@/lib/engine/leadTime";
import { generateTasks } from "@/lib/engine/schedule";
import { toGrant } from "@/lib/view/toGrant";
import { announcementStatus } from "@/lib/view/toAnnouncement";

const TODAY = new Date(2026, 8, 3); // 2026-09-03

const catalog = loadSeedCatalog(TODAY);
const profiles = loadDemoProfiles(TODAY).map(toStoredProfile);
const [P1, P2, P3] = profiles;

/** 마감되지 않은 프로그램만 판정함에 오른다 (§8 S3) */
function verdictsFor(profile: (typeof profiles)[number]) {
  const flat = toFlatProfile(profile, TODAY);
  return catalog.programs
    .filter((p) => announcementStatus(p, TODAY) !== "closed")
    .map((p) => ({ id: p.id, grant: toGrant(p, evaluateProgram(p, flat, TODAY)) }));
}

const idsByStatus = (rows: ReturnType<typeof verdictsFor>, status: string) =>
  rows.filter((r) => r.grant.status === status).map((r) => r.id).sort();

describe("시드 구조", () => {
  it("프로그램 23건 · canonical 21건 · 중복 2건", () => {
    expect(loadSeedProgramsIncludingDuplicates(TODAY)).toHaveLength(23);
    expect(catalog.programs).toHaveLength(21);
    expect(catalog.dualListedIds.sort()).toEqual(["seed-01", "seed-02"]);
  });

  it("법정의무 22건 · 서류 12건 · 데모 프로필 3종", () => {
    expect(catalog.obligations).toHaveLength(22);
    expect(catalog.documentTypes).toHaveLength(12);
    expect(profiles).toHaveLength(3);
  });

  it("확인 표시가 붙은 의무는 반드시 조문 근거를 함께 갖는다 (§0.1-8)", () => {
    // §10.4는 모든 의무를 legal_checked_at: null로 "시작"하게 하고,
    // scripts/verify-law.ts가 실제 조문을 받아온 항목만 채운다.
    // 근거 없이 확인 표시만 붙는 일이 없어야 한다.
    for (const o of catalog.obligations) {
      if (o.legal_checked_at !== null) {
        expect(o.legal_text_excerpt, `${o.id}에 조문 발췌가 없습니다`).toBeTruthy();
        expect(o.legal_basis, `${o.id}에 법적 근거가 없습니다`).toBeTruthy();
      } else {
        // 미확인 항목은 발췌도 비어 있어야 한다 (추정으로 채우지 않는다)
        expect(o.legal_text_excerpt).toBeNull();
      }
    }
  });

  it("법령 확인을 마친 의무는 화면에서 \"확인 중\" 배지가 사라진다 (§11 Phase 6)", () => {
    const checked = catalog.obligations.filter((o) => o.legal_checked_at !== null);
    expect(checked.length).toBeGreaterThan(0);
  });

  it("canonical이 중복보다 먼저 수집된 것으로 기록된다 (§10.2)", () => {
    const all = loadSeedProgramsIncludingDuplicates(TODAY);
    const byId = new Map(all.map((p) => [p.id, p]));
    for (const dup of all.filter((p) => p.duplicate_of)) {
      expect(byId.get(dup.duplicate_of!)!.created_at < dup.created_at).toBe(true);
    }
  });

  it("모든 조건에 근거 원문 문장이 붙어 있다 (§10.2)", () => {
    const walk = (node: { operator?: string; conditions?: unknown[]; source_text?: string }): void => {
      if (Array.isArray(node.conditions)) {
        for (const c of node.conditions) walk(c as typeof node);
      } else {
        expect(node.source_text && node.source_text.length > 0).toBe(true);
      }
    };
    for (const p of catalog.programs) walk(p.eligibility);
  });
});

describe("프로필 ① 테크스타트 — §10.2 기대 판정", () => {
  const rows = verdictsFor(P1);

  it("대상 8 · 조건부 5 · 제외 6", () => {
    expect(idsByStatus(rows, "pass")).toEqual(
      ["seed-01", "seed-03", "seed-06", "seed-08", "seed-10", "seed-12", "seed-14", "seed-15"].sort(),
    );
    expect(idsByStatus(rows, "conditional")).toEqual(
      ["seed-02", "seed-04", "seed-05", "seed-16", "seed-20"].sort(),
    );
    expect(idsByStatus(rows, "fail")).toEqual(
      ["seed-07", "seed-09", "seed-13", "seed-17", "seed-18", "seed-19"].sort(),
    );
  });

  it("조건부에 near-miss와 확인 필요가 모두 있다", () => {
    const sub = (id: string) => rows.find((r) => r.id === id)!.grant.subStatus;
    expect(sub("seed-02")).toBe("near_miss"); // 업력 하한
    expect(sub("seed-04")).toBe("near_miss"); // 직원 충원
    expect(sub("seed-20")).toBe("near_miss"); // 인증 취득
    expect(sub("seed-05")).toBe("needs_check"); // TIPS 운영사 추천
    expect(sub("seed-16")).toBe("needs_check"); // 지역 우수기업
  });

  it("곧 사라짐: 업력 2건 · 대표자연령 1건 · 직원수 1건, 90일 이내는 2건", () => {
    const flat = toFlatProfile(P1, TODAY);
    const verdicts = catalog.programs.map((p) => evaluateProgram(p, flat, TODAY));
    const list = computeExpiringList(catalog.programs, verdicts, flat, TODAY);

    expect(list.map((i) => i.programId)).toEqual(["seed-01", "seed-03", "seed-15", "seed-14"]);
    expect(list.map((i) => i.axis)).toEqual(["업력", "업력", "대표자연령", "직원수"]);
    expect(list[3].expiresIn).toBeNull(); // 직원수 축은 "채용 시"
    expect(list.filter((i) => i.expiresIn !== null && i.expiresIn <= 90)).toHaveLength(2);
  });

  it("첫 배너는 #6 접수 마감 D-7 (§6.7)", () => {
    const flat = toFlatProfile(P1, TODAY);
    const verdicts = catalog.programs.map((p) => evaluateProgram(p, flat, TODAY));
    const tasks = generateTasks(catalog.obligations, flat, TODAY, {
      doneIds: [], hiddenIds: [], overrides: {}, custom: [], profileCreatedAt: P1.created_at,
    });
    const alert = pickTopAlert({ tasks, expiring: computeExpiringList(catalog.programs, verdicts, flat, TODAY), programs: catalog.programs, verdicts, today: TODAY });
    expect(alert?.kind).toBe("closing");
    expect(alert?.title).toBe("중소기업 기술개발 R&D(창업성장) 접수 마감 D-7");
  });

  it("온보딩 직후에는 기한이 지난 할 일이 없다", () => {
    const flat = toFlatProfile(P1, TODAY);
    const tasks = generateTasks(catalog.obligations, flat, TODAY, {
      doneIds: [], hiddenIds: [], overrides: {}, custom: [], profileCreatedAt: P1.created_at,
    });
    expect(tasks.some((t) => t.overdue)).toBe(false);
    expect(tasks.length).toBeGreaterThan(0);
  });
});

describe("프로필 ② 김창업 전자부품 — §10.2 기대 판정", () => {
  const rows = verdictsFor(P2);
  it("업력 하한이 22개월 남은 #2는 near-miss가 아니라 제외", () => {
    expect(rows.find((r) => r.id === "seed-02")!.grant.status).toBe("fail");
  });
  it("매출·수출을 모르면 확인 필요", () => {
    expect(rows.find((r) => r.id === "seed-06")!.grant.subStatus).toBe("needs_check");
    expect(rows.find((r) => r.id === "seed-07")!.grant.subStatus).toBe("needs_check");
  });
  it("제조업·0인이라 소공인 특화자금과 소상공인 자금이 대상", () => {
    expect(rows.find((r) => r.id === "seed-19")!.grant.status).toBe("pass");
    expect(rows.find((r) => r.id === "seed-09")!.grant.status).toBe("pass");
  });
  it("직원 1명 조건은 1명 충원 near-miss", () => {
    const g = rows.find((r) => r.id === "seed-12")!.grant;
    expect(g.subStatus).toBe("near_miss");
    expect(g.nearMissReason).toContain("1명 충원");
  });
});

describe("프로필 ③ 남도푸드 — §10.2 기대 판정", () => {
  const rows = verdictsFor(P3);
  it("전남 전용 사업이 대상", () => {
    expect(rows.find((r) => r.id === "seed-17")!.grant.status).toBe("pass");
    expect(rows.find((r) => r.id === "seed-18")!.grant.status).toBe("pass");
  });
  it("여성 대표자 사업이 대상", () => {
    expect(rows.find((r) => r.id === "seed-13")!.grant.status).toBe("pass");
  });
  it("만 46세라 청년 사업은 제외", () => {
    expect(rows.find((r) => r.id === "seed-03")!.grant.status).toBe("fail");
  });
  it("채용 계획이 없어 청년일자리도약장려금은 제외 (fixed 필드라 near-miss 아님)", () => {
    const g = rows.find((r) => r.id === "seed-08")!.grant;
    expect(g.status).toBe("fail");
    expect(g.subStatus).toBeUndefined();
  });
});

describe("서류 리드타임 (§8 S9)", () => {
  it("마감 D-9인 #14는 중소기업확인서(20일) 때문에 late", () => {
    const p14 = catalog.programs.find((p) => p.id === "seed-14")!;
    const plan = computeLeadTime(p14, catalog.documentTypes, TODAY);
    expect(plan.overall).toBe("late");
  });

  it("상시 접수는 rolling", () => {
    const p10 = catalog.programs.find((p) => p.id === "seed-10")!;
    expect(computeLeadTime(p10, catalog.documentTypes, TODAY).overall).toBe("rolling");
  });
});
