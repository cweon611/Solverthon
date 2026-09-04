// lib/view/toCompany.ts — CompanyProfile → 디자인 Company 뷰모델 (§5.4)
// yearsOld·ceoAge는 저장하지 않고 today 기준으로 계산한다 (§4.5-14·15).

import { ageYears, fmtDate, fromIso, monthsBetween } from "@/lib/engine/format";
import type { Company, CompanyProfile } from "@/lib/types";

export function toCompany(profile: CompanyProfile, today: Date): Company {
  const founded = fromIso(profile.founded_at) ?? today;
  const ageMonths = monthsBetween(founded, today);
  return {
    name: profile.name.trim() || "내 회사",
    bizNo: profile.biz_no ?? "미입력",
    sector: profile.industry_label,
    region: profile.region_label,
    employees: profile.employee_count,
    foundedDate: fmtDate(founded),
    ceoAge: profile.ceo_birth_date ? ageYears(profile.ceo_birth_date, today) : null,
    yearsOld: Math.floor(ageMonths / 12),
    ageMonths,
  };
}
