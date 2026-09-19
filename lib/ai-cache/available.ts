// lib/ai-cache/available.ts — 데모 빌드에서 사전 생성된 AI 결과가 있는지 (키만 번들에 들어간다)

import available from "./available.json";
import { coachKey, type CoachRow } from "./key";

const DRAFTS = new Set<string>(available.drafts);
const COACH = new Set<string>(available.coach);

export const hasCachedDraft = (programId: string) => DRAFTS.has(programId);
export const hasCachedCoach = (programId: string, rows: CoachRow[]) => COACH.has(coachKey(programId, rows));
