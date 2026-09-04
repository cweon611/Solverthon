// POST /api/ai/draft — 공고 → 신청서 뼈대 (SSE 스트리밍)
// 입력은 공고 id 하나다. 프로필은 받지 않는다. 템플릿의 {{키}}는 브라우저가 채운다 (§0.1-4).

import { z } from "zod";

import { describeError, hasGeminiKey, streamJson } from "@/lib/ai/gemini";
import { DRAFT_SYSTEM, buildDraftInput } from "@/lib/ai/geminiPrompts";
import { DraftOutputZ } from "@/lib/ai/geminiSchemas";
import { buildProgramText } from "@/lib/ai/programText";
import { clientIp, rateLimit } from "@/lib/ai/rateLimit";
import { loadProgramForAi } from "@/lib/data/repository";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RATE_PER_MIN = 6;
const BodyZ = z.object({ programId: z.string().min(1).max(100) });

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

  const limit = rateLimit(`draft:${clientIp(req)}`, RATE_PER_MIN);
  if (!limit.ok) return err("rate_limited", `잠시 후 다시 시도하세요 (분당 ${RATE_PER_MIN}회 제한)`, 429, { "Retry-After": String(limit.retryAfter) });

  const parsed = BodyZ.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "programId가 필요합니다.", 400);

  const found = await loadProgramForAi(parsed.data.programId, new Date());
  if (!found) return err("not_found", "해당 공고를 찾을 수 없습니다.", 404);

  const text = buildProgramText(found.program, found.rawText);
  console.log(`[ai/draft] ${found.program.id} · ${text.length}자 · raw=${found.rawText ? "y" : "n"}`);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      try {
        const { data, usage } = await streamJson({
          system: DRAFT_SYSTEM,
          input: buildDraftInput(text),
          schema: DraftOutputZ,
          maxOutputTokens: 8192,
          onDelta: (t) => send({ type: "delta", text: t }),
          onReset: () => send({ type: "reset" }),
        });
        send({ type: "final", draft: data, usage, program: { id: found.program.id, title: found.program.title, organization: found.program.organization } });
      } catch (e) {
        logError("ai/draft", e);
        send({ type: "error", message: describeError(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
