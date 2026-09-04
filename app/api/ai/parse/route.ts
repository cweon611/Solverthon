// POST /api/ai/parse — 공고 원문 → 구조화 JSON (SSE 스트리밍) · §9
// 여기로 오는 사용자 입력은 "공고 원문"뿐이다. 기업 프로필은 절대 서버로 보내지 않는다 (§0.1-4).

import { MAX_INPUT_CHARS, getModel, hasAnthropicKey, parseAnnouncementStreaming } from "@/lib/ai/claude";
import { postprocess } from "@/lib/ai/postprocess";
import { clientIp, rateLimit } from "@/lib/ai/rateLimit";
import { loadCatalog } from "@/lib/data/repository";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RATE_PER_MIN = 10;

function errorResponse(code: string, message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: { code, message } }, { status, headers });
}

export async function POST(req: Request) {
  if (!hasAnthropicKey()) {
    return errorResponse("no_api_key", "서버에 Claude API 키가 설정되어 있지 않습니다.", 503);
  }

  const limit = rateLimit(clientIp(req), RATE_PER_MIN);
  if (!limit.ok) {
    return errorResponse("rate_limited", `잠시 후 다시 시도하세요 (분당 ${RATE_PER_MIN}회 제한)`, 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  let text: string;
  try {
    const body = (await req.json()) as { text?: unknown };
    if (typeof body.text !== "string" || body.text.trim().length === 0) {
      return errorResponse("bad_request", "공고 원문(text)이 필요합니다.", 400);
    }
    text = body.text;
  } catch {
    return errorResponse("bad_request", "요청 본문을 읽을 수 없습니다.", 400);
  }

  if (text.length > MAX_INPUT_CHARS) {
    return errorResponse("too_large", `공고 원문은 ${MAX_INPUT_CHARS.toLocaleString()}자를 넘을 수 없습니다.`, 413);
  }

  // 서버 로그에 원문을 남기지 않는다 — 길이만 (§13.4)
  console.log(`[ai/parse] ${text.length}자 · model=${getModel()}`);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      try {
        const { parsed, usage } = await parseAnnouncementStreaming(text, (delta) => {
          send({ type: "delta", text: delta });
        });

        const { documentTypes } = await loadCatalog(new Date());
        const post = postprocess(parsed, documentTypes);

        send({ type: "final", parsed, program: post, usage });
      } catch (e) {
        // 스택·키·내부 URL을 노출하지 않는다 (§9)
        const message = e instanceof Error ? e.message : "파싱에 실패했습니다.";
        send({ type: "error", message });
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
