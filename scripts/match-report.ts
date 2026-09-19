// scripts/match-report.ts — 매칭 품질 리포트 (결정론 · 재현 가능)
//
//   npm run match:report                       → docs/matching/REPORT.md 갱신
//   npm run match:report -- --baseline <json>  → 이전 카탈로그와 나란히 비교
//
// 기준일을 2026-09-03으로 고정한다(엔진 테스트와 같은 날). 같은 입력이면 항상 같은 숫자가 나온다.
// 잰 것: ① 카탈로그 구조 ② 판별력(가상 회사 격자) ③ 항목별 민감도 ④ 정답 사례 ⑤ 데모 프로필 맞춤도

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { FIELD_META, INDUSTRY_LABEL, REGION_LABEL } from "@/lib/constants";
import { loadDemoProfiles, toStoredProfile } from "@/lib/data/demoProfiles";
import { loadSeedCatalog } from "@/lib/data/seedRepository";
import { evaluateProgram, isGroup, toFlatProfile, type Verdict } from "@/lib/engine/evaluate";
import { resolveDate } from "@/lib/engine/format";
import { computeFit } from "@/lib/engine/rank";
import { entropyBits, fieldSensitivity, verdictVector, type FieldProbe } from "@/lib/engine/sensitivity";
import type { CompanyProfile, Condition, ConditionGroup, Program } from "@/lib/types";

import { GOLD_CASES } from "@/lib/engine/__tests__/goldCases";
import { TODAY, profile } from "@/lib/engine/__tests__/helpers";

const OUT = "docs/matching/REPORT.md";

// ─── 카탈로그 적재 ───────────────────────────────────────────────────────────

function loadPrograms(path: string | null): Program[] {
  if (!path) return loadSeedCatalog(TODAY).programs;
  const raw = JSON.parse(readFileSync(resolve(path), "utf8")) as Program[];
  const r = (t: string | null) => (t === null ? null : resolveDate(t, TODAY));
  return raw
    .filter((p) => p.duplicate_of === null)
    .map((p) => ({ ...p, apply_start: r(p.apply_start), apply_end: r(p.apply_end), created_at: r(p.created_at)!, updated_at: r(p.updated_at)! }));
}

const leaves = (n: Condition | ConditionGroup): Condition[] => (isGroup(n) ? n.conditions.flatMap(leaves) : [n]);

// ─── ① 카탈로그 구조 ────────────────────────────────────────────────────────

interface Structure {
  programs: number;
  conditions: number;
  perProgram: number;
  unmapped: number;
  withBasis: number;
  basisByKind: Record<string, number>;
  fieldsUsed: Record<string, number>; // 필드 → 그 필드를 쓰는 공고 수
}

function structure(programs: Program[]): Structure {
  const fieldsUsed: Record<string, number> = {};
  const basisByKind: Record<string, number> = {};
  let conditions = 0, unmapped = 0, withBasis = 0;
  for (const p of programs) {
    const ls = leaves(p.eligibility);
    conditions += ls.length;
    unmapped += p.unmapped_conditions.length;
    for (const f of new Set(ls.map((c) => c.field))) fieldsUsed[f] = (fieldsUsed[f] ?? 0) + 1;
    for (const c of ls) if (c.basis) { withBasis++; basisByKind[c.basis.kind] = (basisByKind[c.basis.kind] ?? 0) + 1; }
  }
  return { programs: programs.length, conditions, perProgram: conditions / programs.length, unmapped, withBasis, basisByKind, fieldsUsed };
}

// ─── ② 판별력: 가상 회사 격자 ────────────────────────────────────────────────

const GRID = {
  industry: ["J62", "C26", "C10", "G47", "I561", "I5622", "I5621", "M72", "H", "F", "L", "K"],
  region: ["29", "46", "11", "41"],
  ageMonths: [3, 18, 30, 48, 90],
  employees: [0, 3, 7, 15],
  ceoAge: [28, 45],
  gender: ["male", "female"] as const,
  tax: [false, null, true] as const,
  prior: [[], null, ["early_startup_pkg"]] as const,
};

function gridProfiles(): CompanyProfile[] {
  const out: CompanyProfile[] = [];
  for (const industry_code of GRID.industry) for (const region_code of GRID.region) for (const age of GRID.ageMonths)
    for (const employee_count of GRID.employees) for (const ceo of GRID.ceoAge) for (const ceo_gender of GRID.gender)
      for (const has_tax_arrears of GRID.tax) for (const prior of GRID.prior)
        out.push(profile({
          industry_code, region_code, employee_count, ceo_gender, has_tax_arrears,
          prior_support: prior === null ? null : [...prior],
          founded_at: `-${age}m`, ceo_birth_date: `-${ceo}y`, flags: { hiring_planned: false },
        }, TODAY));
  return out;
}

interface Discrimination {
  profiles: number;
  distinctVectors: number;
  entropy: number;
  meanEligible: number;
  zeroEligibleShare: number;
  meanNeedsCheck: number;
  /** 체납 없음·수혜 이력 없음으로 답한 회사만 — 새 입력 항목의 '모름' 효과를 뺀 비교 */
  meanEligibleClean: number;
  constantPrograms: string[]; // 격자 전체에서 판정이 한 번도 바뀌지 않는 공고 = 입력과 무관
}

function discrimination(programs: Program[], grid: CompanyProfile[]): Discrimination {
  const vecCounts = new Map<string, number>();
  const seen = programs.map(() => new Set<Verdict>());
  let eligible = 0, zero = 0, check = 0, cleanEligible = 0, clean = 0;
  for (const p of grid) {
    const v = verdictVector(programs, p, TODAY);
    const key = v.map((x) => x[0]).join("");
    vecCounts.set(key, (vecCounts.get(key) ?? 0) + 1);
    v.forEach((x, i) => seen[i].add(x));
    const e = v.filter((x) => x === "eligible").length;
    eligible += e;
    check += v.filter((x) => x === "needs_check").length;
    if (e === 0) zero++;
    if (p.has_tax_arrears === false && Array.isArray(p.prior_support) && p.prior_support.length === 0) { clean++; cleanEligible += e; }
  }
  return {
    profiles: grid.length,
    distinctVectors: vecCounts.size,
    entropy: entropyBits([...vecCounts.values()]),
    meanEligible: eligible / grid.length,
    zeroEligibleShare: zero / grid.length,
    meanNeedsCheck: check / grid.length,
    meanEligibleClean: clean === 0 ? 0 : cleanEligible / clean,
    constantPrograms: programs.filter((_, i) => seen[i].size === 1).map((p) => p.id),
  };
}

// ─── ③ 항목별 민감도 ────────────────────────────────────────────────────────

const PROBES: FieldProbe[] = [
  { field: "업종", variants: ["C26", "I5622", "L", "K", "H"].map((c) => ({ label: c, patch: (p) => ({ ...p, industry_code: c }) })) },
  { field: "지역", variants: ["46", "11", "41"].map((c) => ({ label: c, patch: (p) => ({ ...p, region_code: c }) })) },
  { field: "업력", variants: [6, 48, 96].map((m) => ({ label: `${m}m`, patch: (p) => ({ ...p, founded_at: resolveDate(`-${m}m`, TODAY) }) })) },
  { field: "직원 수", variants: [0, 7, 15].map((n) => ({ label: `${n}`, patch: (p) => ({ ...p, employee_count: n }) })) },
  { field: "대표자 연령", variants: [25, 45].map((a) => ({ label: `${a}`, patch: (p) => ({ ...p, ceo_birth_date: resolveDate(`-${a}y`, TODAY) }) })) },
  { field: "대표자 성별", variants: [{ label: "female", patch: (p) => ({ ...p, ceo_gender: "female" as const }) }] },
  { field: "사업자 형태", variants: [{ label: "individual", patch: (p) => ({ ...p, business_type: "individual" as const }) }] },
  { field: "연매출", variants: [null, 3_000_000_000].map((n) => ({ label: `${n}`, patch: (p) => ({ ...p, annual_revenue_krw: n }) })) },
  { field: "수출액", variants: [200_000].map((n) => ({ label: `${n}`, patch: (p) => ({ ...p, export_revenue_usd_prev_year: n }) })) },
  { field: "보유 인증", variants: [{ label: "venture", patch: (p) => ({ ...p, certifications: ["venture" as const] }) }] },
  { field: "세금 체납", variants: [true, null].map((t) => ({ label: `${t}`, patch: (p) => ({ ...p, has_tax_arrears: t }) })) },
  { field: "이전 수혜 이력", variants: [["early_startup_pkg" as const], ["youth_academy" as const], null].map((s) => ({ label: `${s}`, patch: (p) => ({ ...p, prior_support: s }) })) },
];

/** 민감도 기준 회사: 서로 다른 회사 6곳 (한 회사에서만 우연히 민감한 항목을 걸러낸다) */
function sensitivityBases(): CompanyProfile[] {
  const ok = { has_tax_arrears: false, prior_support: [] };
  return [
    profile({ ...ok }, TODAY),
    profile({ ...ok, industry_code: "C26", region_code: "11", employee_count: 0, founded_at: "-14m", ceo_birth_date: "-32y" }, TODAY),
    profile({ ...ok, industry_code: "C10", region_code: "46", employee_count: 2, founded_at: "-2m", ceo_birth_date: "-46y", ceo_gender: "female" }, TODAY),
    profile({ ...ok, industry_code: "G47", region_code: "41", employee_count: 6, founded_at: "-50m", ceo_birth_date: "-36y" }, TODAY),
    profile({ ...ok, industry_code: "I561", region_code: "29", employee_count: 1, founded_at: "-8m", ceo_birth_date: "-27y" }, TODAY),
    profile({ ...ok, industry_code: "M72", region_code: "11", employee_count: 12, founded_at: "-70m", ceo_birth_date: "-41y" }, TODAY),
  ];
}

// ─── ④ 정답 사례 ────────────────────────────────────────────────────────────

function gold(programs: Program[]) {
  return GOLD_CASES.map((g) => {
    const p = programs.find((x) => x.id === g.programId);
    const got = p ? evaluateProgram(p, toFlatProfile(profile(g.input, TODAY), TODAY), TODAY).overall : null;
    return { ...g, got, ok: got === g.expected };
  });
}

// ─── 출력 ───────────────────────────────────────────────────────────────────

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const f2 = (x: number) => x.toFixed(2);
const VERDICT_KO: Record<Verdict, string> = { eligible: "대상", ineligible: "제외", needs_check: "확인 필요" };

function main() {
  const argv = process.argv.slice(2);
  const bi = argv.indexOf("--baseline");
  const baselinePath = bi >= 0 ? argv[bi + 1] : null;

  const after = loadPrograms(null);
  const before = baselinePath ? loadPrograms(baselinePath) : null;
  const grid = gridProfiles();
  const bases = sensitivityBases();

  const sA = structure(after), sB = before && structure(before);
  const dA = discrimination(after, grid), dB = before && discrimination(before, grid);
  const senA = fieldSensitivity(after, bases, PROBES, TODAY), senB = before && fieldSensitivity(before, bases, PROBES, TODAY);
  const gA = gold(after), gB = before && gold(before);

  const col = (a: string, b: string | null | undefined) => (before ? `| ${b ?? "-"} | ${a} |` : `| ${a} |`);
  const head = (name: string) => (before ? `| ${name} | 이전 | 현재 |\n|---|---:|---:|` : `| ${name} | 값 |\n|---|---:|`);

  const L: string[] = [];
  L.push("# 비즈버디 매칭 품질 리포트", "");
  L.push(`> \`npm run match:report${before ? ` -- --baseline ${baselinePath}` : ""}\`로 다시 만들 수 있습니다. 기준일 2026-09-03 고정 · 결정론 계산이라 같은 입력이면 같은 숫자가 나옵니다.`);
  L.push("> 카탈로그는 시연용 합성 공고(실제 공고 구조를 본뜬 것)입니다. 법령 근거는 모두 **원문 대조 전**입니다(`checked_at: null`).", "");

  L.push("## 1. 카탈로그 구조", "", head("지표"));
  L.push(`| 공고 수 ${col(String(sA.programs), sB && String(sB.programs))}`);
  L.push(`| 자격 조건 수 ${col(String(sA.conditions), sB && String(sB.conditions))}`);
  L.push(`| 공고당 조건 수 ${col(f2(sA.perProgram), sB && f2(sB.perProgram))}`);
  L.push(`| 필드에 매핑 못 한 조건 ${col(String(sA.unmapped), sB && String(sB.unmapped))}`);
  L.push(`| 상위 근거(법령·지침)가 달린 조건 ${col(`${sA.withBasis} (${pct(sA.withBasis / sA.conditions)})`, sB && `${sB.withBasis} (${pct(sB.withBasis / Math.max(1, sB.conditions))})`)}`);
  L.push(`| └ 법령 / 운영 기준 / 공고 규정 ${col(`${sA.basisByKind.law ?? 0} / ${sA.basisByKind.rule ?? 0} / ${sA.basisByKind.notice ?? 0}`, sB && `${sB.basisByKind.law ?? 0} / ${sB.basisByKind.rule ?? 0} / ${sB.basisByKind.notice ?? 0}`)}`);
  L.push("", "**필드별 사용 공고 수** — 입력 항목이 실제로 몇 개 공고의 판정에 쓰이는가", "", head("입력 항목"));
  const fields = Object.keys(FIELD_META).filter((f) => (sA.fieldsUsed[f] ?? 0) + (sB?.fieldsUsed[f] ?? 0) > 0);
  for (const f of fields) L.push(`| ${FIELD_META[f as keyof typeof FIELD_META].label} ${col(String(sA.fieldsUsed[f] ?? 0), sB && String(sB.fieldsUsed[f] ?? 0))}`);

  L.push("", "## 2. 판별력 — 회사가 달라지면 결과도 달라지는가", "");
  L.push(`가상 회사 ${dA.profiles.toLocaleString()}곳 = 업종 ${GRID.industry.length} × 지역 ${GRID.region.length} × 업력 ${GRID.ageMonths.length} × 직원 수 ${GRID.employees.length} × 대표 연령 ${GRID.ceoAge.length} × 성별 2 × 체납(없음·모름·있음) × 수혜 이력(없음·모름·초기창업패키지).`, "");
  L.push(head("지표"));
  L.push(`| 서로 다른 판정 결과 조합 수 ${col(dA.distinctVectors.toLocaleString(), dB && dB.distinctVectors.toLocaleString())}`);
  L.push(`| 판정 조합 엔트로피 (비트, 클수록 회사마다 결과가 다름) ${col(f2(dA.entropy), dB && f2(dB.entropy))}`);
  L.push(`| 회사당 평균 '대상' 공고 수 ${col(f2(dA.meanEligible), dB && f2(dB.meanEligible))}`);
  L.push(`| └ 체납 없음·수혜 이력 없음으로 답한 회사만 ${col(f2(dA.meanEligibleClean), dB && f2(dB.meanEligibleClean))}`);
  L.push(`| 회사당 평균 '확인 필요' 공고 수 ${col(f2(dA.meanNeedsCheck), dB && f2(dB.meanNeedsCheck))}`);
  L.push(`| '대상'이 0건인 회사 비율 ${col(pct(dA.zeroEligibleShare), dB && pct(dB.zeroEligibleShare))}`);
  L.push(`| 어떤 회사를 넣어도 판정이 같은 공고 ${col(dA.constantPrograms.join(", ") || "없음", dB && (dB.constantPrograms.join(", ") || "없음"))}`);
  L.push("", "읽는 법: '대상' 평균이 줄어든 것은 격자의 1/3이 체납 '있음', 1/3이 '모름'이기 때문이고, 체납·수혜 이력이 깨끗한 회사만 보면 줄어든 폭은 제외 업종(부동산·금융·주점 등)과 소상공인 기준 변경에서 옵니다.");
  L.push("판정이 한 번도 바뀌지 않는 공고는 격자가 바꾸지 않는 항목(수출액·채용 예정·식품 영업·보유 인증)에만 의존하는 공고입니다. 이 항목들의 효과는 3장 민감도에서 따로 잽니다.");
  L.push("'확인 필요'가 늘어난 것은 격자의 1/3이 체납을 '모름'으로, 1/3이 수혜 이력을 '모름'으로 답했기 때문입니다. 모르는 값은 제외가 아니라 확인 필요로 둡니다(§0.1-7).");

  L.push("", "## 3. 항목별 민감도 — 이 항목 하나만 바꾸면 판정이 몇 건 바뀌는가", "");
  L.push(`서로 다른 기준 회사 ${bases.length}곳에서 항목 하나만 바꾸고 나머지는 고정했습니다. '평균 변화'는 변형 1회당 판정이 바뀐 공고 수, '영향 공고'는 한 번이라도 판정이 바뀐 공고의 비율입니다.`, "");
  L.push(before ? "| 입력 항목 | 이전 평균 변화 | 현재 평균 변화 | 이전 영향 공고 | 현재 영향 공고 |\n|---|---:|---:|---:|---:|" : "| 입력 항목 | 평균 변화 | 영향 공고 |\n|---|---:|---:|");
  senA.forEach((a, i) => {
    const b = senB?.[i];
    L.push(before ? `| ${a.field} | ${f2(b!.meanFlips)} | ${f2(a.meanFlips)} | ${pct(b!.programsAffected)} | ${pct(a.programsAffected)} |` : `| ${a.field} | ${f2(a.meanFlips)} | ${pct(a.programsAffected)} |`);
  });
  const dead = senA.filter((a) => a.meanFlips === 0).map((a) => a.field);
  L.push("", dead.length ? `현재도 판정에 영향이 없는 항목: ${dead.join(", ")} — 이 항목을 쓰는 공고가 카탈로그에 없다는 뜻입니다.` : "모든 입력 항목이 적어도 한 공고의 판정을 바꿉니다.");

  L.push("", "## 4. 정답 사례 — 공개 규정대로 판정하는가", "");
  const okA = gA.filter((g) => g.ok).length, okB = gB?.filter((g) => g.ok).length;
  L.push(`사례 ${GOLD_CASES.length}건 · 현재 일치 **${okA}/${GOLD_CASES.length}**${gB ? ` · 이전 일치 ${okB}/${GOLD_CASES.length}` : ""}`, "");
  L.push("> 정답은 공개 규정(법령·통상적 공고 문구)을 읽고 사람이 붙였습니다. 독립 평가자의 정답이 아니므로 '정확도'가 아니라 '규정 준수 검사'로 읽어야 합니다.", "");
  L.push(before ? "| # | 공고 | 회사 | 정답 | 이전 | 현재 | 근거 |\n|---|---|---|---|---|---|---|" : "| # | 공고 | 회사 | 정답 | 현재 | 근거 |\n|---|---|---|---|---|---|");
  gA.forEach((g, i) => {
    const title = after.find((p) => p.id === g.programId)?.title ?? g.programId;
    const mark = (v: Verdict | null, ok: boolean) => `${v ? VERDICT_KO[v] : "-"}${ok ? "" : " ✗"}`;
    const b = gB?.[i];
    L.push(before
      ? `| ${g.id} | ${title} | ${g.who} | ${VERDICT_KO[g.expected]} | ${mark(b!.got, b!.ok)} | ${mark(g.got, g.ok)} | ${g.why} |`
      : `| ${g.id} | ${title} | ${g.who} | ${VERDICT_KO[g.expected]} | ${mark(g.got, g.ok)} | ${g.why} |`);
  });

  L.push("", "## 5. 데모 프로필의 맞춤도 순위", "");
  L.push("대상 공고끼리는 '대상을 좁히는 조건'(지역 한정·청년 대표·업종 한정·인증 등)을 몇 개 통과했는지로 정렬합니다. 누구나 통과하는 조건(업력 7년 이내·체납 없음·제외 업종 아님)은 점수가 없습니다(`lib/engine/rank.ts`).", "");
  for (const demo of loadDemoProfiles(TODAY)) {
    const p = toStoredProfile(demo);
    const flat = toFlatProfile(p, TODAY);
    const ranked = after
      .map((prog) => ({ prog, v: evaluateProgram(prog, flat, TODAY) }))
      .filter((x) => x.v.overall === "eligible")
      .map((x) => ({ ...x, fit: computeFit(x.prog, x.v, flat) }))
      .sort((a, b) => b.fit.score - a.fit.score);
    L.push(`**${demo.demo_label}** — ${INDUSTRY_LABEL[p.industry_code] ?? p.industry_code} · ${REGION_LABEL[p.region_code]} · 대상 ${ranked.length}건`, "");
    L.push("| 순위 | 공고 | 맞춤도 | 이유 |\n|---:|---|---:|---|");
    ranked.forEach((r, i) => L.push(`| ${i + 1} | ${r.prog.title} | ${r.fit.score} | ${r.fit.reasons.join(" · ") || "공통 요건만 충족"} |`));
    L.push("");
  }

  L.push("## 방법과 한계", "");
  L.push("- 판정은 LLM 없이 `lib/engine/evaluate.ts`의 결정론 규칙으로만 합니다. 이 리포트도 같은 코드를 호출합니다.");
  L.push("- 격자는 입력 공간을 고르게 덮으려고 만든 것이지 실제 창업기업 분포가 아닙니다. 실사용 분포로 가중하려면 창업기업 실태조사 등 외부 통계가 필요합니다.");
  L.push("- 법령 근거(`basis`)는 조항 위치와 요지만 사람이 적은 것이며, 조문 원문 대조(`checked_at`)는 아직입니다. 대조 전 항목은 화면에 '원문 대조 전'으로 표시됩니다.");
  L.push("- 정답 사례는 규칙 작성자가 붙였습니다. 외부 검증에는 실제 공고 원문 + 제3자 라벨이 필요합니다.");

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, L.join("\n") + "\n");
  console.log(`[match-report] ${OUT} 작성 · 판정 조합 ${dA.distinctVectors}${dB ? ` (이전 ${dB.distinctVectors})` : ""} · 정답 ${okA}/${GOLD_CASES.length}${gB ? ` (이전 ${okB})` : ""}`);
}

main();
