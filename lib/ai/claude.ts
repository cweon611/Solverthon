// lib/ai/claude.ts — 공고 원문 → ParsedAnnouncement (§7.1)
// LLM의 역할은 여기까지다. 판정은 lib/engine의 결정론적 코드가 한다 (§0.1-1).

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { PARSE_SYSTEM_PROMPT, buildParseUserMessage } from "./prompts";
import { ParsedAnnouncementZ, type ParsedAnnouncement } from "./schema";

export const MAX_INPUT_CHARS = 12_000;

/**
 * §7.1은 max_tokens 4096을 적었지만, Sonnet 5는 사고(thinking)가 기본 활성이고
 * 그 토큰도 max_tokens에서 나간다. 4096이면 긴 공고에서 응답이 잘린다.
 * 잘린 응답은 JSON 파싱 자체가 실패하므로 여유를 둔다.
 */
const MAX_TOKENS = 16_000;

export function getModel(): string {
  return process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY가 없습니다. .env.local을 확인하세요.");
  }
  if (!cached) cached = new Anthropic();
  return cached;
}

export interface ParseUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  ms: number;
}

export interface ParseResult {
  parsed: ParsedAnnouncement;
  usage: ParseUsage;
}

// temperature·top_p·top_k는 이 세대 모델에서 400을 낸다. 설정하지 않는다 (§7.1).
function request(text: string) {
  return {
    model: getModel(),
    max_tokens: MAX_TOKENS,
    system: PARSE_SYSTEM_PROMPT,
    messages: [{ role: "user" as const, content: buildParseUserMessage(text) }],
    output_config: { format: zodOutputFormat(ParsedAnnouncementZ) },
  };
}

/** 스트리밍 파싱 (S10 데모). onDelta로 생성 중인 JSON 조각을 흘려보낸다 */
export async function parseAnnouncementStreaming(
  text: string,
  onDelta: (chunk: string) => void,
): Promise<ParseResult> {
  const started = Date.now();
  const stream = client().messages.stream(request(text));
  stream.on("text", (delta) => onDelta(delta));

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new Error("모델이 이 요청을 거절했습니다. 다른 공고문으로 시도해 주세요.");
  }
  const parsed = ParsedAnnouncementZ.parse(message.parsed_output);
  return {
    parsed,
    usage: {
      model: message.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      ms: Date.now() - started,
    },
  };
}

/** 배치 파싱 (수집 파이프라인). 429·5xx는 지수 백오프로 1회 재시도 (§7.1) */
export async function parseAnnouncement(text: string): Promise<ParseResult> {
  const started = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const message = await client().messages.parse(request(text));
      if (message.stop_reason === "refusal") {
        throw new Error("모델이 이 요청을 거절했습니다.");
      }
      const parsed = ParsedAnnouncementZ.parse(message.parsed_output);
      return {
        parsed,
        usage: {
          model: message.model,
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          ms: Date.now() - started,
        },
      };
    } catch (e) {
      lastError = e;
      // SyntaxError: 모델이 아주 가끔 JSON 이스케이프를 잘못 만든다(예: 깨진 유니코드 이스케이프) —
      // 같은 입력을 다시 보내면 대개 정상 출력이 온다. 실측(2026-09-04): 재시도 1회로 해결됨.
      const retryable =
        e instanceof Anthropic.RateLimitError ||
        (e instanceof Anthropic.APIError && e.status >= 500) ||
        e instanceof SyntaxError;
      if (!retryable || attempt === 1) break;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastError;
}
