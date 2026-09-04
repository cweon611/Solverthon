// PRD §12.1 케이스 43 — 시드 상대 날짜 토큰 + 날짜 유틸

import { describe, expect, it } from "vitest";

import { addMonths, addYears, dDay, fmtMonths, monthsBetween, resolveDate, toIso } from "@/lib/engine/format";

import { TODAY } from "./helpers";

describe("format — resolveDate (§10.0)", () => {
  it("43a. 상대 토큰을 today 기준 ISO로 바꾼다", () => {
    expect(resolveDate("+27d", TODAY)).toBe("2026-09-30");
    expect(resolveDate("-34m", TODAY)).toBe("2023-11-03");
    expect(resolveDate("-39y4m", TODAY)).toBe("1987-05-03");
    expect(resolveDate("-35m5d", TODAY)).toBe("2023-09-28");
    expect(resolveDate("+1y2m3d", TODAY)).toBe("2027-11-06");
  });

  it("43b. ISO는 그대로 통과한다", () => {
    expect(resolveDate("2026-12-25", TODAY)).toBe("2026-12-25");
  });

  it("43c. 잘못된 토큰은 throw", () => {
    expect(() => resolveDate("27d", TODAY)).toThrow();
    expect(() => resolveDate("+", TODAY)).toThrow();
    expect(() => resolveDate("2026.09.03", TODAY)).toThrow();
    expect(() => resolveDate("", TODAY)).toThrow();
    expect(() => resolveDate("-3w", TODAY)).toThrow();
  });
});

describe("format — 날짜 계산", () => {
  it("addMonths는 말일을 클램프한다", () => {
    expect(toIso(addMonths(new Date(2026, 0, 31), 1))).toBe("2026-02-28");
    expect(toIso(addMonths(new Date(2028, 0, 31), 1))).toBe("2028-02-29");
    expect(toIso(addMonths(new Date(2026, 8, 3), -35))).toBe("2023-10-03");
  });

  it("addYears는 2/29를 평년 2/28로 클램프한다", () => {
    expect(toIso(addYears(new Date(2028, 1, 29), 1))).toBe("2029-02-28");
  });

  it("monthsBetween은 만 개월을 내림으로 센다", () => {
    expect(monthsBetween(new Date(2023, 8, 28), new Date(2026, 8, 3))).toBe(35);
    expect(monthsBetween(new Date(2023, 8, 28), new Date(2026, 8, 28))).toBe(36);
    expect(monthsBetween(new Date(2023, 8, 28), new Date(2026, 8, 27))).toBe(35);
    expect(monthsBetween(new Date(2026, 8, 3), new Date(2026, 8, 1))).toBe(0); // 음수는 0
  });

  it("dDay는 자정 기준 일수 차", () => {
    expect(dDay(new Date(2026, 8, 10), TODAY)).toBe(7);
    expect(dDay(new Date(2026, 8, 1), TODAY)).toBe(-2);
    expect(dDay(new Date(2026, 8, 3, 23, 59), TODAY)).toBe(0);
  });

  it("fmtMonths는 년·개월을 사람이 읽는 문구로 만든다", () => {
    expect(fmtMonths(36)).toBe("3년");
    expect(fmtMonths(35)).toBe("2년 11개월");
    expect(fmtMonths(6)).toBe("6개월");
    expect(fmtMonths(84)).toBe("7년");
  });
});
