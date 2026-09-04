// PRD §12.1 케이스 35 — leadTime

import { describe, expect, it } from "vitest";

import { addDays, toIso } from "@/lib/engine/format";
import { computeLeadTime } from "@/lib/engine/leadTime";
import type { ProgramDocument } from "@/lib/types";

import { TODAY, docType, program } from "./helpers";

const DOC_TYPES = [
  docType({ id: "sme_confirmation", name: "중소기업확인서", lead_time_days: 20 }),
  docType({ id: "biz_registration_cert", name: "사업자등록증명", issuer: "홈택스", lead_time_days: 0 }),
  docType({ id: "research_institute_cert", name: "기업부설연구소 인정서", issuer: "한국산업기술진흥협회", lead_time_days: 7 }),
  docType({ id: "business_plan", name: "사업계획서", issuer: "자체 작성", lead_time_days: null }),
];

const doc = (id: string | null, name: string): ProgramDocument => ({
  document_type_id: id,
  name,
  source_text: "제출 서류 안내",
  is_required: true,
});

const deadlineIn9Days = toIso(addDays(TODAY, 9));

describe("leadTime", () => {
  it("35a. 마감 D-9에 소요 20일 → late", () => {
    const plan = computeLeadTime(
      program({ is_rolling: false, apply_end: deadlineIn9Days, required_documents: [doc("sme_confirmation", "중소기업확인서")] }),
      DOC_TYPES,
      TODAY,
    );
    expect(plan.items[0].status).toBe("late");
    expect(plan.overall).toBe("late");
    expect(plan.items[0].latestStart).toBe(toIso(addDays(TODAY, -11)));
  });

  it("35b. 소요 0일 → ok", () => {
    const plan = computeLeadTime(
      program({ is_rolling: false, apply_end: deadlineIn9Days, required_documents: [doc("biz_registration_cert", "사업자등록증명")] }),
      DOC_TYPES,
      TODAY,
    );
    expect(plan.items[0].status).toBe("ok");
    expect(plan.overall).toBe("ok");
  });

  it("35c. 소요 7일 → tight (여유 2일, 경계 3일 규칙)", () => {
    const plan = computeLeadTime(
      program({ is_rolling: false, apply_end: deadlineIn9Days, required_documents: [doc("research_institute_cert", "기업부설연구소 인정서")] }),
      DOC_TYPES,
      TODAY,
    );
    expect(plan.items[0].status).toBe("tight");
    expect(plan.overall).toBe("tight");
  });

  it("35d. 소요기간 null 또는 카탈로그 매칭 실패 → unknown", () => {
    const plan = computeLeadTime(
      program({
        is_rolling: false,
        apply_end: deadlineIn9Days,
        required_documents: [doc("business_plan", "사업계획서"), doc(null, "기타 증빙")],
      }),
      DOC_TYPES,
      TODAY,
    );
    expect(plan.items.map((i) => i.status)).toEqual(["unknown", "unknown"]);
    expect(plan.overall).toBe("unknown");
  });

  it("35e. 상시 접수 → rolling (경고 없음)", () => {
    const plan = computeLeadTime(
      program({ is_rolling: true, apply_end: null, required_documents: [doc("sme_confirmation", "중소기업확인서")] }),
      DOC_TYPES,
      TODAY,
    );
    expect(plan.overall).toBe("rolling");
    expect(plan.isRolling).toBe(true);
  });

  it("35f. overall은 최악값을 고른다 (late > tight > unknown > ok)", () => {
    const plan = computeLeadTime(
      program({
        is_rolling: false,
        apply_end: deadlineIn9Days,
        required_documents: [
          doc("biz_registration_cert", "사업자등록증명"),
          doc("business_plan", "사업계획서"),
          doc("sme_confirmation", "중소기업확인서"),
        ],
      }),
      DOC_TYPES,
      TODAY,
    );
    expect(plan.overall).toBe("late");
  });
});
