// POST /api/ai/draft — 데모 빌드: 사전 생성된 AI 신청서 초안을 스트리밍으로 재생한다 (SSE)
// 결과는 scripts/pregen-ai.ts가 실제 Gemini로 만든 것이다(lib/ai-cache/drafts.json). 데모 배포에는 AI 키가 없다.
// 응답 형식은 원본 라우트와 같다: delta* → final. 준비된 결과가 없으면 no_cache로 기본 양식을 안내한다.

import { z } from "zod";

import drafts from "@/lib/ai-cache/drafts.json";
import type { DraftOutput } from "@/lib/ai/geminiSchemas";

export const dynamic = "force-dynamic";

const BodyZ = z.object({ programId: z.string().min(1).max(100) });
const CACHE = drafts as unknown as Record<string, { draft: DraftOutput; model: string; generatedAt: string }>;

const err = (code: string, message: string, status: number) => Response.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const parsed = BodyZ.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("bad_request", "programId가 필요합니다.", 400);
  const hit = CACHE[parsed.data.programId];
  if (!hit) return err("no_cache", "시연 버전은 미리 생성해 둔 공고에만 AI 초안을 제공합니다. 기본 양식으로 바로 시작할 수 있습니다.", 503);

  const text = JSON.stringify(hit.draft);
  const steps = 45; // 약 5초에 걸쳐 흘려보낸다 — 실제 생성과 비슷한 체감
  const size = Math.ceil(text.length / steps);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      for (let i = 0; i < text.length; i += size) {
        send({ type: "delta", text: text.slice(i, i + size) });
        await new Promise((r) => setTimeout(r, 110));
      }
      send({ type: "final", draft: hit.draft, usage: { model: hit.model, cached: true, generatedAt: hit.generatedAt } });
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
