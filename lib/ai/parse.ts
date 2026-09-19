// lib/ai/parse.ts — 공고 원문 → ParsedAnnouncement, 공급자 선택 (§7.1)
// ANTHROPIC_API_KEY가 있으면 Claude(원래 설계), 없고 Gemini 키가 있으면 Gemini로 같은 스키마·같은 프롬프트를 쓴다.
// 어느 쪽이든 LLM의 역할은 "원문 → 구조화 JSON"까지다. 판정은 lib/engine이 한다 (§0.1-1).

import { getModel as getClaudeModel, hasAnthropicKey, parseAnnouncement as parseWithClaude, type ParseResult } from "./claude";
import { generateJson, getGeminiModel, hasGeminiKey } from "./gemini";
import { PARSE_SYSTEM_PROMPT, buildParseUserMessage } from "./prompts";
import { ParsedAnnouncementZ } from "./schema";

export type ParseProvider = "claude" | "gemini" | null;

export function parseProvider(): ParseProvider {
  if (hasAnthropicKey()) return "claude";
  if (hasGeminiKey()) return "gemini";
  return null;
}

export function hasParseKey(): boolean {
  return parseProvider() !== null;
}

export function parseModelName(): string | null {
  const p = parseProvider();
  return p === "claude" ? getClaudeModel() : p === "gemini" ? getGeminiModel() : null;
}

export async function parseAnnouncement(text: string): Promise<ParseResult> {
  const provider = parseProvider();
  if (provider === "claude") return parseWithClaude(text);
  if (provider === "gemini") {
    const { data, usage } = await generateJson({
      system: PARSE_SYSTEM_PROMPT,
      input: buildParseUserMessage(text),
      schema: ParsedAnnouncementZ,
      maxOutputTokens: 8192,
      thinking: "low",
    });
    return { parsed: data, usage };
  }
  throw new Error("공고 파싱에 쓸 AI 키가 없습니다. ANTHROPIC_API_KEY 또는 GEMINI_API를 .env.local에 넣으세요.");
}
