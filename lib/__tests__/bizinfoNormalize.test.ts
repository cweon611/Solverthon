import { describe, expect, it } from "vitest";

import { parsePeriod, parseTitleRegion } from "@/lib/ingest/normalize";

describe("기업마당 정규화", () => {
  it("신청기간 두 표기를 읽는다", () => {
    expect(parsePeriod("2026-09-01 ~ 2026-10-02")).toEqual({ start: "2026-09-01", end: "2026-10-02" });
    expect(parsePeriod("20260901 ~ 20261002")).toEqual({ start: "2026-09-01", end: "2026-10-02" });
    expect(parsePeriod("예산 소진 시까지")).toBeNull();
    expect(parsePeriod(null)).toBeNull();
  });
  it("공고명 시도 접두를 지역 코드로", () => {
    expect(parseTitleRegion("[경기] 안산시 2026년 하반기 착한가격업소 신규 모집 공고")).toBe("41");
    expect(parseTitleRegion("[광주] 2026년 청년창업 지원")).toBe("29");
    expect(parseTitleRegion("[전남] 식품기업 판로지원")).toBe("46");
    expect(parseTitleRegion("[전국] 소상공인 정책자금")).toBeNull();
    expect(parseTitleRegion("2026년 초기창업패키지")).toBeNull();
  });
});
