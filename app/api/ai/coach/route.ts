// POST /api/ai/coach — 미충족·확인필요 요건을 쉬운 말로 설명하고 충족 방법을 안내한다.
// 입력은 공고 id와 "요건 행"(라벨·기준·원문·상태)뿐이다. 회사의 현재 값·프로필은 받지 않는다 (§0.1-4).
// 판정은 이미 클라이언트의 lib/engine이 끝냈다. 여기서는 판정을 바꾸지 않는다 (§0.1-1).

import { z } from "zod";

import { describeError, generateJson, hasGeminiKey } from "@/lib/ai/gemini";
import { COACH_SYSTEM, buildCoachInput } from "@/lib/ai/geminiPrompts";
import { CoachOutputZ } from "@/lib/ai/geminiSchemas";
import { clientIp, rateLimit } from "@/lib/ai/rateLimit";
import { loadCatalog } from "@/lib/data/repository";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RATE_PER_MIN = 10;

const BodyZ = z.object({
  programId: z.string().min(1).max(100),
  criteria: z
    .array(
      z.object({
        label: z.string().max(200),
        required: z.string().max(400),
        sourceText: z.string().max(1000),
        state: z.enum(["fail", "check"]),
      }),
    )
    .min(1)
    .max(15),
});

const err = (code: string, message: string, status: number, headers?: HeadersInit) =>
  Response.json({ error: { code, message } }, { status, headers });

/** 서버 로그용: 오류 종류와 메시지 앞부분. 키처럼 보이는 토큰은 가린다 */
function logError(tag: string, e: unknown): void {
  const name = e instanceof Error ? e.constructor.name : typeof e;
  const msg = (e instanceof Error ? e.message : String(e)).replace(/[A-Za-z0-9_-]{30,}/g, "…").slice(0, 300);
  console.error(`[${tag}] ${name}: ${msg}`);
}

export async function POST(req: Request) {
  if (!hasGeminiKey()) return err("no_api_key", "서버에 Gemini API 키가 설정되어 있지 않습니다.", 503);

  const limit = rateLimit(`coach:${clientIp(req)}`, RATE_PER_MIN);
  if (!limit.ok) return err("rate_limited", `잠시 후 다시 시도하세요 (분당 ${RATE_PER_MIN}회 제한)`, 429, { "Retry-After": String(limit.retryAfter) });

  const parsed = BodyZ.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "요청 형식이 올바르지 않습니다.", 400);

  const { programs } = await loadCatalog(new Date());
  const program = programs.find((p) => p.id === parsed.data.programId);
  if (!program) return err("not_found", "해당 공고를 찾을 수 없습니다.", 404);

  try {
    const { data, usage } = await generateJson({
      system: COACH_SYSTEM,
      input: buildCoachInput({
        title: program.title,
        organization: program.organization,
        summary: program.summary,
        criteria: parsed.data.criteria,
      }),
      schema: CoachOutputZ,
    });
    console.log(`[ai/coach] ${parsed.data.criteria.length}행 · ${usage.model} · ${usage.ms}ms`);
    return Response.json({ coach: data, usage });
  } catch (e) {
    logError("ai/coach", e);
    return err("ai_failed", describeError(e), 502);
  }
}
