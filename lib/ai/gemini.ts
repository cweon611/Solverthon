// lib/ai/gemini.ts — Gemini 클라이언트 (AI 보조 기능 4종: 요건 코치·신청서 뼈대·현금흐름 해설·대화형 온보딩)
// 판정은 여기서 하지 않는다 (§0.1-1). 이 모듈은 "설명·초안·해설·질문" 텍스트만 만든다.
// 키는 서버에서만 읽는다 (§0.1-3). 공고 파싱 파이프라인은 기존 claude.ts를 그대로 쓴다.

import { ApiError, GoogleGenAI, type Content, type ThinkingLevel } from "@google/genai";
import { z } from "zod";

export type ChatTurn = { role: "user" | "model"; text: string };

export interface GeminiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  ms: number;
}

// 실측(2026-09): 3.8/3.7 flash는 "high demand" 503이 잦고, 3.6 flash는 1~3초에 안정적으로 응답했다.
// gemini-2.5-flash는 신규 키에 404를 내므로 쓰지 않는다.
const DEFAULT_MODEL = "gemini-3.6-flash";
const FALLBACK_MODELS = ["gemini-3.7-flash", "gemini-3.8-flash", "gemini-3.5-flash"];
const RETRY_DELAYS_MS = [1200, 2500]; // 체인을 두 바퀴 돈다. 1바퀴째 사이 1.2초, 2바퀴째 사이 2.5초

function apiKey(): string | undefined {
  return process.env.GEMINI_API_KEY ?? process.env.GEMINI_API;
}

export function hasGeminiKey(): boolean {
  return Boolean(apiKey());
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
}

let cached: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  const key = apiKey();
  if (!key) throw new Error("GEMINI_API 키가 없습니다. .env.local을 확인하세요.");
  if (!cached) cached = new GoogleGenAI({ apiKey: key });
  return cached;
}

/** zod → JSON Schema. Gemini의 responseJsonSchema는 $schema 키를 받지 않는다 */
function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

function toContents(input: string | ChatTurn[]): string | Content[] {
  if (typeof input === "string") return input;
  return input.map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
}

function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : t;
}

function isTimeoutLike(e: unknown): boolean {
  const name = e instanceof Error ? e.name || e.constructor.name : "";
  return /Timeout|Abort|Connection/i.test(name);
}

function isRetryable(e: unknown): boolean {
  if (e instanceof ApiError) return e.status === 429 || e.status === 404 || e.status >= 500;
  if (isTimeoutLike(e)) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /"code":\s*(429|503)|UNAVAILABLE|RESOURCE_EXHAUSTED/.test(msg);
}

/** 사용자에게 보여줄 오류 문구. 스택·키·내부 URL은 노출하지 않는다 (§9) */
export function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 503) return "AI 모델이 혼잡합니다. 잠시 후 다시 시도해 주세요.";
    if (e.status === 429) return "AI 호출 한도에 걸렸습니다. 잠시 후 다시 시도해 주세요.";
    return `AI 요청이 실패했습니다 (${e.status}).`;
  }
  if (e instanceof z.ZodError || e instanceof SyntaxError) return "AI 응답 형식이 맞지 않습니다. 다시 시도해 주세요.";
  if (isTimeoutLike(e)) return "AI 응답이 너무 오래 걸려 중단했습니다. 잠시 후 다시 시도해 주세요.";
  const msg = e instanceof Error ? e.message : String(e);
  if (/"code":\s*503|UNAVAILABLE/.test(msg)) return "AI 모델이 혼잡합니다. 잠시 후 다시 시도해 주세요.";
  if (/"code":\s*429|RESOURCE_EXHAUSTED/.test(msg)) return "AI 호출 한도에 걸렸습니다. 잠시 후 다시 시도해 주세요.";
  return "AI 요청 중 오류가 났습니다. 다시 시도해 주세요.";
}

export type Thinking = "low" | "medium" | "high";

interface Opts<T> {
  system: string;
  input: string | ChatTurn[];
  schema: z.ZodType<T>;
  maxOutputTokens?: number;
  /** 사고 깊이. 기본 low — 실측에서 기본(자동) 사고는 3.7/3.8 flash에서 503(high demand)을 자주 냈고 low는 1~2초에 응답했다 */
  thinking?: Thinking;
}

const THINKING_LEVEL: Record<Thinking, "LOW" | "MEDIUM" | "HIGH"> = { low: "LOW", medium: "MEDIUM", high: "HIGH" };

function baseConfig<T>(opts: Opts<T>, thinking: Thinking, defaultMaxTokens: number) {
  return {
    systemInstruction: opts.system,
    responseMimeType: "application/json",
    responseJsonSchema: toJsonSchema(opts.schema),
    maxOutputTokens: opts.maxOutputTokens ?? defaultMaxTokens,
    thinkingConfig: { thinkingLevel: THINKING_LEVEL[thinking] as unknown as ThinkingLevel },
    // 한 시도가 오래 매달리면 폴백으로 넘어가도록 시도별 시간 제한 (ms)
    httpOptions: { timeout: defaultMaxTokens >= 8192 ? 50_000 : 25_000 },
  };
}

type UsageMeta = { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } | undefined;

function usageOf(model: string, u: UsageMeta, started: number): GeminiUsage {
  return {
    model,
    inputTokens: u?.promptTokenCount ?? 0,
    outputTokens: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
    ms: Date.now() - started,
  };
}

/**
 * 모델 체인(기본 → 폴백들)을 최대 두 바퀴 돈다. 429/5xx/타임아웃/모델 없음(404)은 다음 시도로 넘어간다.
 * 첫 시도만 요청된 사고 깊이를 쓰고, 이후는 low로 낮춘다 — 혼잡 503은 사고가 깊을 때 잦다 (실측).
 */
async function withRetry<R>(fn: (model: string, thinking: Thinking) => Promise<R>, thinking: Thinking, onRetry?: () => void): Promise<R> {
  const chain = [...new Set([getGeminiModel(), ...FALLBACK_MODELS])];
  const attempts = [...chain, ...chain];
  let lastError: unknown;
  for (let i = 0; i < attempts.length; i += 1) {
    try {
      return await fn(attempts[i], i === 0 ? thinking : "low");
    } catch (e) {
      lastError = e;
      if (!isRetryable(e)) throw e;
      if (i === attempts.length - 1) break;
      const delay = RETRY_DELAYS_MS[Math.min(Math.floor(i / chain.length), RETRY_DELAYS_MS.length - 1)];
      await new Promise((r) => setTimeout(r, delay));
      onRetry?.();
    }
  }
  throw lastError;
}

/** 구조화 JSON 1회 생성 */
export async function generateJson<T>(opts: Opts<T>): Promise<{ data: T; usage: GeminiUsage }> {
  const started = Date.now();
  return withRetry(async (model, thinking) => {
    const res = await client().models.generateContent({
      model,
      contents: toContents(opts.input),
      config: baseConfig(opts, thinking, 4096),
    });
    const data = opts.schema.parse(JSON.parse(stripFences(res.text ?? "")));
    return { data, usage: usageOf(model, res.usageMetadata, started) };
  }, opts.thinking ?? "low");
}

/** 구조화 JSON 스트리밍. onDelta로 생성 중인 조각을 흘리고, 끝나면 전체를 검증해 돌려준다 */
export async function streamJson<T>(
  opts: Opts<T> & { onDelta: (chunk: string) => void; onReset?: () => void },
): Promise<{ data: T; usage: GeminiUsage }> {
  const started = Date.now();
  return withRetry(async (model, thinking) => {
    const stream = await client().models.generateContentStream({
      model,
      contents: toContents(opts.input),
      config: baseConfig(opts, thinking, 8192),
    });
    let acc = "";
    let usage: UsageMeta;
    for await (const chunk of stream) {
      const t = chunk.text ?? "";
      if (t) {
        acc += t;
        opts.onDelta(t);
      }
      if (chunk.usageMetadata) usage = chunk.usageMetadata;
    }
    const data = opts.schema.parse(JSON.parse(stripFences(acc)));
    return { data, usage: usageOf(model, usage, started) };
  }, opts.thinking ?? "low", opts.onReset);
}
