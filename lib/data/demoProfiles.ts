// lib/data/demoProfiles.ts — 데모 프로필 3종 (§10.1)
// 클라이언트에서도 쓰므로 profiles.json만 import한다 (programs.json 등을 번들에 끌어오지 않기 위해).

import profilesJson from "@/seed/profiles.json";

import { resolveDate } from "@/lib/engine/format";
import type { CompanyProfile } from "@/lib/types";

export interface DemoProfile extends CompanyProfile {
  demo_label: string;
}

const RAW = profilesJson as unknown as DemoProfile[];

/** 시드의 상대 날짜를 today 기준으로 풀고, 생성 시각은 불러오는 시점으로 찍는다 */
export function loadDemoProfiles(today: Date): DemoProfile[] {
  const now = new Date().toISOString();
  return RAW.map((p) => ({
    ...p,
    founded_at: resolveDate(p.founded_at, today),
    ceo_birth_date: p.ceo_birth_date === null ? null : resolveDate(p.ceo_birth_date, today),
    created_at: now,
    updated_at: now,
  }));
}

/** 데모 프로필에서 화면 전용 라벨을 떼고 저장 가능한 프로필만 남긴다 */
export function toStoredProfile(demo: DemoProfile): CompanyProfile {
  const stored: Record<string, unknown> = { ...demo };
  delete stored.demo_label;
  return stored as unknown as CompanyProfile;
}
