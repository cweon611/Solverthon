// lib/ai/voyage.ts — Voyage 임베딩 (§7.2)
// npm 패키지 대신 fetch를 직접 쓴다(의존성 최소화). 저장용·질의용 모두 input_type: "document".

const ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const DIMENSION = 1024;
const MAX_BATCH = 128;

export function getEmbedModel(): string {
  return process.env.VOYAGE_MODEL ?? "voyage-4";
}

export function hasVoyageKey(): boolean {
  return Boolean(process.env.VOYAGE_API_KEY);
}

export const EMBEDDING_DIMENSION = DIMENSION;

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
  usage?: { total_tokens?: number };
}

export interface EmbedResult {
  embeddings: number[][];
  model: string;
  dimension: number;
  totalTokens: number;
}

/** 텍스트 배열 → 임베딩 배열. 128건씩 나눠 보낸다 */
export async function embed(inputs: string[]): Promise<EmbedResult> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY가 없습니다. .env.local을 확인하세요.");
  if (inputs.length === 0) return { embeddings: [], model: getEmbedModel(), dimension: DIMENSION, totalTokens: 0 };

  const model = getEmbedModel();
  const out: number[][] = [];
  let totalTokens = 0;

  for (let i = 0; i < inputs.length; i += MAX_BATCH) {
    const batch = inputs.slice(i, i + MAX_BATCH);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: batch,
        model,
        input_type: "document",
        output_dimension: DIMENSION,
        truncation: true,
      }),
    });

    if (!res.ok) {
      // 응답 본문에 키가 실리지 않도록 상태코드와 짧은 메시지만 남긴다
      const detail = await res.text().catch(() => "");
      throw new Error(`Voyage 임베딩 실패 (${res.status}): ${detail.slice(0, 200)}`);
    }

    const json = (await res.json()) as VoyageResponse;
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    out.push(...sorted.map((d) => d.embedding));
    totalTokens += json.usage?.total_tokens ?? 0;
  }

  return { embeddings: out, model, dimension: DIMENSION, totalTokens };
}

export async function embedOne(input: string): Promise<number[]> {
  const { embeddings } = await embed([input]);
  return embeddings[0];
}
