// lib/engine/sensitivity.ts — "입력이 결과를 바꾸는가"를 재는 도구 (리포트·검증용)
// 순수 TS. react·next·@supabase를 import하지 않는다.
//
// 매칭이 의미 있으려면, 사용자가 입력한 항목이 실제로 판정을 바꿔야 한다.
// 여기서는 프로필 하나를 기준으로 한 항목만 바꿔 보고(나머지는 고정) 판정이 몇 건 뒤집히는지 센다.

import type { CompanyProfile, Program } from "@/lib/types";

import { evaluateAll, toFlatProfile, type Verdict } from "./evaluate";

export type ProfilePatch = (p: CompanyProfile) => CompanyProfile;

export interface FieldProbe {
  field: string; // 사람용 이름 ("업종")
  variants: { label: string; patch: ProfilePatch }[];
}

export interface FlipCount {
  field: string;
  /** 변형 하나당 평균적으로 판정이 바뀐 공고 수 */
  meanFlips: number;
  /** 판정이 한 번이라도 바뀐 공고의 비율 (0~1) */
  programsAffected: number;
}

export function verdictVector(programs: Program[], profile: CompanyProfile, today: Date): Verdict[] {
  return evaluateAll(programs, toFlatProfile(profile, today), today).map((v) => v.overall);
}

/** 두 판정 벡터가 다른 공고 수 */
export function hamming(a: Verdict[], b: Verdict[]): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

/**
 * 기준 프로필들 × 항목별 변형 → 항목 민감도.
 * 기준 프로필이 여러 개면 평균을 낸다 (한 회사에서만 우연히 민감한 항목을 걸러낸다).
 */
export function fieldSensitivity(
  programs: Program[],
  bases: CompanyProfile[],
  probes: FieldProbe[],
  today: Date,
): FlipCount[] {
  return probes.map((probe) => {
    let flips = 0;
    let trials = 0;
    const touched = new Set<number>();
    for (const base of bases) {
      const baseVec = verdictVector(programs, base, today);
      for (const v of probe.variants) {
        const vec = verdictVector(programs, v.patch(base), today);
        vec.forEach((x, i) => { if (x !== baseVec[i]) touched.add(i); });
        flips += hamming(baseVec, vec);
        trials++;
      }
    }
    return {
      field: probe.field,
      meanFlips: trials === 0 ? 0 : flips / trials,
      programsAffected: programs.length === 0 ? 0 : touched.size / programs.length,
    };
  });
}

/** 섀넌 엔트로피 (비트). 분포가 고를수록 크다 — 판정 벡터 다양성 지표로 쓴다 */
export function entropyBits(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const h = -counts.reduce((acc, c) => (c === 0 ? acc : acc + (c / total) * Math.log2(c / total)), 0);
  return h === 0 ? 0 : h; // -0 방지
}
