// POST /api/ai/dedupe — 두 텍스트(또는 두 프로그램)의 중복 여부 판정 · §9
// 임베딩은 Voyage가 만들고, 중복 결정은 lib/engine/dedupe의 임계값이 한다 (§3.1).

import { clientIp, rateLimit } from "@/lib/ai/rateLimit";
import { EMBEDDING_DIMENSION, embed, getEmbedModel, hasVoyageKey } from "@/lib/ai/voyage";
import { loadCatalog } from "@/lib/data/repository";
import { buildEmbeddingText, cosineSimilarity, decideDuplicate, periodsOverlap } from "@/lib/engine/dedupe";
import type { Program } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RATE_PER_MIN = 20;
const MAX_CHARS = 12_000;

type Side = { text?: string; programId?: string };

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

/** 텍스트 또는 카탈로그의 프로그램에서 임베딩 입력 문자열과 기간 정보를 만든다 */
function resolveSide(side: Side, programs: Program[]): { text: string; period: Program | null; title: string } | null {
  if (side.programId) {
    const p = programs.find((x) => x.id === side.programId);
    if (!p) return null;
    return { text: buildEmbeddingText({ ...p, raw_text: null }), period: p, title: p.title };
  }
  if (typeof side.text === "string" && side.text.trim().length > 0) {
    return { text: side.text.slice(0, MAX_CHARS), period: null, title: side.text.slice(0, 30) };
  }
  return null;
}

export async function POST(req: Request) {
  if (!hasVoyageKey()) {
    return errorResponse("no_api_key", "서버에 Voyage API 키가 설정되어 있지 않습니다.", 503);
  }

  const limit = rateLimit(clientIp(req), RATE_PER_MIN);
  if (!limit.ok) return errorResponse("rate_limited", "잠시 후 다시 시도하세요.", 429);

  let body: { a?: Side; b?: Side };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorResponse("bad_request", "요청 본문을 읽을 수 없습니다.", 400);
  }

  const { programs } = await loadCatalog(new Date());
  const a = resolveSide(body.a ?? {}, programs);
  const b = resolveSide(body.b ?? {}, programs);
  if (!a || !b) {
    return errorResponse("bad_request", "비교할 두 대상(a, b)이 필요합니다.", 400);
  }

  const totalChars = a.text.length + b.text.length;
  if (totalChars > MAX_CHARS * 2) {
    return errorResponse("too_large", "입력이 너무 깁니다.", 413);
  }

  try {
    const { embeddings } = await embed([a.text, b.text]);
    const similarity = cosineSimilarity(embeddings[0], embeddings[1]);

    // 기간 정보가 없는 직접 입력은 보수적으로 겹친 것으로 본다 (§6.6)
    const overlap =
      a.period && b.period
        ? periodsOverlap(a.period, b.period)
        : true;

    return Response.json({
      similarity,
      overlap,
      decision: decideDuplicate(similarity, overlap),
      model: getEmbedModel(),
      dimension: EMBEDDING_DIMENSION,
      titles: { a: a.title, b: b.title },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "임베딩에 실패했습니다.";
    return errorResponse("embed_failed", message, 502);
  }
}
