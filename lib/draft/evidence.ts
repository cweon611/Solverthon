// lib/draft/evidence.ts — 판정 엔진 결과 → 신청서의 "신청 자격 충족 현황" 문단 (결정론, LLM 없음)
// 요건마다 공고 기준과 우리 회사 값을 나란히 적는다. 확인이 필요한 요건은 빈칸으로, 미충족은 경고로 뺀다.

import type { ProgramVerdict } from "@/lib/engine/evaluate";

export interface Evidence {
  text: string; // 문단 본문 — {{eligibility_summary}} 자리에 들어간다
  warnings: string[]; // 미충족 요건 — 초안의 "놓치기 쉬운 것"에 붙인다
}

export function eligibilityEvidence(verdict: ProgramVerdict, companyName: string): Evidence {
  const lines: string[] = [];
  const warnings: string[] = [];
  for (const c of verdict.criteria) {
    if (c.state === "pass") {
      lines.push(`- ${c.label}: 공고 기준 '${c.required}' — 현재 ${c.current} (충족)`);
    } else if (c.state === "check") {
      lines.push(`- ${c.label}: 공고 기준 '${c.required}' — [[${c.missingInput ? `${c.missingInput} 확인 후 기재` : "충족 여부 확인 후 기재"}]]`);
    } else {
      warnings.push(`자격 미충족: ${c.label} — 기준 '${c.required}', 현재 ${c.current}. 신청 전 주관기관에 문의하세요.`);
    }
  }
  const head = verdict.overall === "eligible"
    ? `${companyName}은(는) 본 사업의 신청 자격 요건을 아래와 같이 모두 충족합니다.`
    : `${companyName}의 신청 자격 요건 충족 현황은 다음과 같습니다.`;
  return { text: [head, ...lines].join("\n"), warnings };
}
