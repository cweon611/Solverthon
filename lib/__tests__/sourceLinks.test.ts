// 공고 링크가 포털 첫 화면으로 떨어지지 않는지 검증한다.

import { describe, expect, it } from "vitest";

import {
  announcementDetailUrl,
  announcementListUrl,
  isBareHomepage,
  resolveApplyUrl,
  resolveOriginalUrl,
} from "@/lib/sourceLinks";

describe("sourceLinks", () => {
  it("포털 첫 화면 URL을 알아본다", () => {
    expect(isBareHomepage("https://www.k-startup.go.kr")).toBe(true);
    expect(isBareHomepage("https://www.k-startup.go.kr/")).toBe(true);
    expect(isBareHomepage("https://www.k-startup.go.kr/web")).toBe(true);
    expect(isBareHomepage("https://www.bizinfo.go.kr/")).toBe(true);
    expect(isBareHomepage("https://www.bizinfo.go.kr/index.do")).toBe(true);
    // 공고 목록·상세는 첫 화면이 아니다
    expect(isBareHomepage("https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do")).toBe(false);
    expect(isBareHomepage("https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do")).toBe(false);
    expect(isBareHomepage("not a url")).toBe(false);
  });

  it("출처별 공고 목록 URL", () => {
    expect(announcementListUrl("kstartup")).toBe("https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do");
    expect(announcementListUrl("kstartup", true)).toBe("https://www.k-startup.go.kr/web/contents/bizpbanc-deadline.do");
    expect(announcementListUrl("bizinfo")).toBe("https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do");
    expect(announcementListUrl("local")).toBeNull();
  });

  it("공고 식별자가 있으면 상세 페이지로 만든다", () => {
    expect(announcementDetailUrl("kstartup", "175845")).toBe(
      "https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=175845",
    );
    expect(announcementDetailUrl("bizinfo", "PBLN_000000000016024")).toBe(
      "https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000016024",
    );
    expect(announcementDetailUrl("kstartup", null)).toBeNull();
  });

  it("수집된 상세 URL이 있으면 그대로 쓴다", () => {
    expect(
      resolveOriginalUrl({
        source: "kstartup",
        source_id: "175845",
        original_url: "https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=999",
      }),
    ).toContain("pbancSn=999");
  });

  it("원문 URL이 포털 첫 화면이면 버리고 상세 → 목록 순으로 대체한다", () => {
    expect(
      resolveOriginalUrl({ source: "kstartup", source_id: "175845", original_url: "https://www.k-startup.go.kr" }),
    ).toBe("https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=175845");

    expect(resolveOriginalUrl({ source: "bizinfo", source_id: null, original_url: "https://www.bizinfo.go.kr/" })).toBe(
      "https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do",
    );
  });

  it("포털 형식이 아닌 공고 식별자로는 상세 링크를 만들지 않는다", () => {
    // 시드의 "SEED-01"로 상세 URL을 만들면 포털이 "페이지를 찾을 수 없습니다"를 띄운다
    expect(announcementDetailUrl("kstartup", "SEED-01")).toBeNull();
    expect(announcementDetailUrl("bizinfo", "SEED-04")).toBeNull();
    expect(announcementDetailUrl("kstartup", "179116")).toContain("pbancSn=179116");
    expect(announcementDetailUrl("bizinfo", "PBLN_000000000016024")).toContain("pblancId=PBLN_");
  });

  it("합성 데이터는 상세 링크 대신 공고 목록으로 보낸다", () => {
    expect(
      resolveOriginalUrl({ source: "kstartup", source_id: "SEED-01", original_url: null, is_synthetic: true }),
    ).toBe("https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do");
    expect(
      resolveOriginalUrl({ source: "bizinfo", source_id: "SEED-04", original_url: null, is_synthetic: true }),
    ).toBe("https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do");
  });

  it("실수집 데이터는 상세 링크로 바로 보낸다", () => {
    expect(
      resolveOriginalUrl({ source: "kstartup", source_id: "179116", original_url: null, is_synthetic: false }),
    ).toBe("https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=179116");
  });

  it("마감된 공고는 마감 목록으로 보낸다", () => {
    expect(resolveOriginalUrl({ source: "kstartup", source_id: null, original_url: null }, true)).toBe(
      "https://www.k-startup.go.kr/web/contents/bizpbanc-deadline.do",
    );
  });

  it("포털이 없는 출처는 null → 버튼 비활성", () => {
    expect(resolveOriginalUrl({ source: "local", source_id: null, original_url: null })).toBeNull();
  });

  it("신청 URL이 없으면 원문 링크로 대체한다", () => {
    expect(
      resolveApplyUrl({ source: "bizinfo", source_id: "PBLN_1", original_url: null, apply_url: null }),
    ).toBe("https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_1");

    expect(
      resolveApplyUrl({
        source: "bizinfo",
        source_id: "PBLN_1",
        original_url: null,
        apply_url: "https://apply.example.go.kr/form",
      }),
    ).toBe("https://apply.example.go.kr/form");
  });
});
