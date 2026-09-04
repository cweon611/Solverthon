// PRD §12.1 케이스 17~23 — expiry

import { describe, expect, it } from "vitest";

import { evaluateProgram, toFlatProfile } from "@/lib/engine/evaluate";
import { computeExpiringList, computeExpiry } from "@/lib/engine/expiry";
import { addDays, fromIso } from "@/lib/engine/format";

import { TODAY, and, cond, or, profile, program } from "./helpers";

const flat = (o?: Parameters<typeof profile>[0]) => toFlatProfile(profile(o), TODAY);

function expiry(p: ReturnType<typeof program>, o?: Parameters<typeof profile>[0], today = TODAY) {
  const f = toFlatProfile(profile(o), TODAY);
  const verdict = evaluateProgram(p, f, today);
  return computeExpiry(p, verdict, f, today);
}

describe("expiry", () => {
  it("17. 업력 상한 → flip = founded + 37개월, axis 업력, evaluate가 flip 전날 pass·당일 fail", () => {
    const p = program({ eligibility: and(cond("business_age_months", "lte", 36)) });
    const item = expiry(p);

    expect(item).not.toBeNull();
    expect(item!.axis).toBe("업력");
    expect(item!.expiresOn).toBe("2026.10.28"); // founded 2023.09.28 + 37개월
    expect(item!.expiresIn).toBeGreaterThanOrEqual(54);
    expect(item!.expiresIn).toBeLessThanOrEqual(57);
    expect(item!.reason).toBe("업력 3년 이내 조건 — 2026.10.28 이후 자격 소멸");

    // 같은 헬퍼를 쓰므로 소멸일 전날은 pass, 당일은 fail이어야 한다
    const flip = fromIso("2026-10-28")!;
    expect(evaluateProgram(p, toFlatProfile(profile(), addDays(flip, -1)), addDays(flip, -1)).overall).toBe("eligible");
    expect(evaluateProgram(p, toFlatProfile(profile(), flip), flip).overall).toBe("ineligible");
  });

  it("18. 대표자 연령 상한 → axis 대표자연령, expiresIn ≈ 243", () => {
    const p = program({ eligibility: and(cond("ceo_age", "lte", 39)) });
    const item = expiry(p);
    expect(item!.axis).toBe("대표자연령");
    expect(item!.expiresIn).toBeGreaterThanOrEqual(240);
    expect(item!.expiresIn).toBeLessThanOrEqual(245);
    expect(item!.reason).toContain("대표자 만 39세 이하 조건");
  });

  it("19a. 두 축 모두 있으면 이른 쪽 1건만", () => {
    const p = program({
      eligibility: and(cond("business_age_months", "lte", 36), cond("ceo_age", "lte", 39)),
    });
    const item = expiry(p);
    expect(item!.axis).toBe("업력"); // D-55 < D-242
  });

  it("19b. 충족된 OR 그룹 안의 상한 리프는 반사실 평가로 항목이 생기지 않는다 (§10.2 #14)", () => {
    const p = program({
      eligibility: and(
        cond("region_code", "in", ["29"]),
        or(cond("ceo_age", "lte", 39), cond("hiring_planned", "eq", true)),
        cond("business_age_months", "lte", 84),
      ),
    });
    // ceo_age가 40이 되어도 hiring_planned가 OR를 지탱하므로 루트는 유지된다
    const item = expiry(p, { flags: { hiring_planned: true } });
    expect(item).toBeNull();
  });

  it("19c. 먼 시간 축(365일 초과)에 가려 임박한 직원수 축이 사라지지 않는다 (§10.2 #14)", () => {
    const p = program({
      eligibility: and(
        cond("region_code", "in", ["29"]),
        cond("employee_count", "lt", 5),
        cond("business_age_months", "lte", 84),
      ),
    });
    const item = expiry(p, { employee_count: 4, region_code: "29" });
    expect(item).not.toBeNull();
    expect(item!.axis).toBe("직원수");
    expect(item!.expiresIn).toBeNull();
  });

  it("20. employee_count lt 5, 현재 4 → expiresIn null, axis 직원수", () => {
    const p = program({ eligibility: and(cond("employee_count", "lt", 5)) });
    const item = expiry(p, { employee_count: 4 });
    expect(item!.axis).toBe("직원수");
    expect(item!.expiresIn).toBeNull();
    expect(item!.expiresOn).toBeNull();
    expect(item!.reason).toBe("상시근로자 5인 미만 조건 — 채용으로 5인 도달 시 자격 소멸");
  });

  it("21. employee_count lt 30, 현재 4, 채용 예정 → 항목 없음 (노이즈)", () => {
    const p = program({ eligibility: and(cond("employee_count", "lt", 30)) });
    expect(expiry(p, { employee_count: 4, flags: { hiring_planned: true } })).toBeNull();
  });

  it("21b. 채용 예정이면 두 명 차이까지는 만든다", () => {
    const p = program({ eligibility: and(cond("employee_count", "lt", 5)) });
    expect(expiry(p, { employee_count: 3, flags: { hiring_planned: true } })).not.toBeNull();
    expect(expiry(p, { employee_count: 3, flags: { hiring_planned: false } })).toBeNull();
  });

  it("22. ineligible 프로그램 → null", () => {
    const p = program({
      eligibility: and(cond("business_age_months", "lte", 36), cond("ceo_gender", "eq", "female")),
    });
    expect(expiry(p)).toBeNull();
  });

  it("23. ceo_birth_date null → 연령 축 항목 없음", () => {
    const p = program({ eligibility: and(cond("ceo_age", "lte", 39)) });
    // 생년월일이 없으면 조건 자체가 check → eligible이 아니므로 항목도 없다
    expect(expiry(p, { ceo_birth_date: null })).toBeNull();
  });

  it("365일을 넘는 소멸은 목록에서 제외하고, null(직원수형)은 마지막에 정렬한다", () => {
    const soon = program({ id: "soon", eligibility: and(cond("business_age_months", "lte", 36)) });
    const far = program({ id: "far", eligibility: and(cond("business_age_months", "lte", 84)) });
    const staff = program({ id: "staff", eligibility: and(cond("employee_count", "lt", 5)) });
    const f = flat();
    const catalog = [staff, far, soon];
    const verdicts = catalog.map((p) => evaluateProgram(p, f, TODAY));
    const list = computeExpiringList(catalog, verdicts, f, TODAY);
    expect(list.map((i) => i.programId)).toEqual(["soon", "staff"]);
  });
});
