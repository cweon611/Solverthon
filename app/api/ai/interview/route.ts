// POST /api/ai/interview — 대화형 온보딩 한 턴.
// 대화 기록을 받아 다음 질문과 "지금까지 파악한 값"을 돌려준다. 서버는 대화를 저장하지 않고 로그에도 남기지 않는다.
// 주의: 이 라우트는 사용자가 말한 회사 정보가 서버를 "경유"한다. 저장은 브라우저(localStorage)에서만 한다.

import { z } from "zod";

import { describeError, generateJson, hasGeminiKey } from "@/lib/ai/gemini";
import { INTERVIEW_SYSTEM, buildInterviewTurns } from "@/lib/ai/geminiPrompts";
import { InterviewOutputZ } from "@/lib/ai/geminiSchemas";
import { coerceExtracted } from "@/lib/ai/interviewCoerce";
import { clientIp, rateLimit } from "@/lib/ai/rateLimit";
import { toIso } from "@/lib/engine/format";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RATE_PER_MIN = 30; // 대화형이라 넉넉히

const BodyZ = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "model"]), text: z.string().min(1).max(1500) }))
    .max(40),
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

  const limit = rateLimit(`interview:${clientIp(req)}`, RATE_PER_MIN);
  if (!limit.ok) return err("rate_limited", `잠시 후 다시 시도하세요 (분당 ${RATE_PER_MIN}회 제한)`, 429, { "Retry-After": String(limit.retryAfter) });

  const parsed = BodyZ.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "요청 형식이 올바르지 않습니다.", 400);

  const today = new Date();
  try {
    const { data, usage } = await generateJson({
      system: INTERVIEW_SYSTEM,
      input: buildInterviewTurns(parsed.data.messages, toIso(today)),
      schema: InterviewOutputZ,
      maxOutputTokens: 2048,
    });
    // 대화 내용은 로그에 남기지 않는다 — 턴 수와 소요 시간만
    console.log(`[ai/interview] ${parsed.data.messages.length}턴 · ${usage.model} · ${usage.ms}ms`);
    return Response.json({
      reply: data.reply,
      done: data.done,
      extracted: coerceExtracted(data.extracted, today),
      usage,
    });
  } catch (e) {
    logError("ai/interview", e);
    return err("ai_failed", describeError(e), 502);
  }
}
