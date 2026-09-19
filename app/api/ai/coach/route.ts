// POST /api/ai/coach — 데모 빌드: 사전 생성된 요건 코치 결과를 돌려준다
// 결과는 scripts/pregen-ai.ts가 실제 Gemini로 만든 것이다(lib/ai-cache/coach.json). 조회 키는 공고 + 요건 행 내용.
// 준비된 조합이 없으면 그 사실을 그대로 알린다.

import { z } from "zod";

import coach from "@/lib/ai-cache/coach.json";
import type { CoachOutput } from "@/lib/ai/geminiSchemas";
import { coachKey } from "@/lib/ai-cache/key";

export const dynamic = "force-dynamic";

const BodyZ = z.object({
  programId: z.string().min(1).max(100),
  criteria: z.array(z.object({
    label: z.string().max(200), required: z.string().max(400), sourceText: z.string().max(1000), state: z.enum(["fail", "check"]),
  })).min(1).max(15),
});
const CACHE = coach as unknown as Record<string, { coach: CoachOutput; model: string; generatedAt: string }>;

const err = (code: string, message: string, status: number) => Response.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const parsed = BodyZ.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "요청 형식이 올바르지 않습니다.", 400);
  const hit = CACHE[coachKey(parsed.data.programId, parsed.data.criteria)];
  if (!hit) return err("no_cache", "시연 버전은 데모 프로필 기준으로 미리 생성해 둔 설명만 제공합니다. 프로필을 바꾸면 이 조합의 설명은 준비되어 있지 않을 수 있습니다.", 404);
  await new Promise((r) => setTimeout(r, 1200)); // 응답 체감
  return Response.json({ coach: hit.coach, usage: { model: hit.model, cached: true, generatedAt: hit.generatedAt } });
}
