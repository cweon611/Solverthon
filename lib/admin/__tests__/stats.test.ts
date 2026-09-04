import { describe, expect, it } from "vitest";

import { ageBucket, aggregate, employeeBucket, maskBizNo } from "@/lib/admin/stats";

const now = new Date("2026-09-03T12:00:00Z");

describe("admin stats", () => {
  it("버킷과 마스킹", () => {
    expect(employeeBucket(0)).toBe("0인");
    expect(employeeBucket(4)).toBe("1~4인");
    expect(employeeBucket(10)).toBe("10~29인");
    expect(ageBucket("2023-10-01", now)).toBe("1~3년");
    expect(ageBucket("2026-05-01", now)).toBe("1년 미만");
    expect(maskBizNo("1234567890")).toBe("123-**-***90");
  });

  it("회원·프로필·공고를 집계한다", () => {
    const s = aggregate({
      now,
      users: [
        { id: "u1", login_id: "kim", biz_no: "1234567890", created_at: "2026-09-02T00:00:00Z", last_login_at: "2026-09-03T01:00:00Z" },
        { id: "u2", login_id: "lee", biz_no: "2208162517", created_at: "2026-07-01T00:00:00Z", last_login_at: null },
      ],
      profiles: [
        { user_id: "u1", updated_at: "2026-09-02T00:00:00Z", data: { profile: { region_label: "광주광역시", industry_label: "소프트웨어 개발업", business_type: "corporation", employee_count: 4, founded_at: "2023-10-01", certifications: ["venture"], flags: { hiring_planned: true }, business_direction: "SaaS" }, drafts: { a: {}, b: {} } } },
      ],
      programs: [
        { is_synthetic: true, parsed_at: null, apply_end: "2026-09-15", is_rolling: false, support_field: "창업", review_status: "human_verified", source: "synthetic", duplicate_of: null },
        { is_synthetic: false, parsed_at: "2026-09-01", apply_end: "2026-09-05", is_rolling: false, support_field: "창업", review_status: "ai_draft", source: "kstartup", duplicate_of: null },
        { is_synthetic: false, parsed_at: "2026-09-01", apply_end: "2026-08-01", is_rolling: false, support_field: "R&D", review_status: "ai_draft", source: "kstartup", duplicate_of: null },
        { is_synthetic: false, parsed_at: null, apply_end: null, is_rolling: true, support_field: "고용", review_status: "ai_draft", source: "kstartup", duplicate_of: "x" },
      ],
      obligations: [{ legal_checked_at: "2026-09-01" }, { legal_checked_at: null }],
      runs: [],
    });
    expect(s.users).toMatchObject({ total: 2, new7d: 1, new30d: 1, active7d: 1, withProfile: 1 });
    expect(s.users.signupsByDay.length).toBe(30);
    expect(s.profiles.regions[0]).toEqual({ label: "광주광역시", count: 1 });
    expect(s.profiles.employees[0]).toEqual({ label: "1~4인", count: 1 });
    expect(s.profiles.drafts).toBe(2);
    expect(s.profiles.directions).toBe(1);
    expect(s.programs).toMatchObject({ total: 3, synthetic: 1, real: 2, parsed: 2, open: 1, closing: 1, closed: 1, duplicates: 1, humanVerified: 1 });
    expect(s.obligations).toEqual({ total: 2, verified: 1 });
    expect(s.members[0].loginId).toBe("kim");
    expect(s.members[0].bizNoMasked).toBe("123-**-***90");
    expect(s.members[1].hasProfile).toBe(false);
  });
});
