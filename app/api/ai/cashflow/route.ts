// POST /api/ai/cashflow — 월별 현금흐름 집계 → 대표용 해설.
// 엑셀 파싱·집계는 전부 브라우저(lib/engine/cashflow)에서 끝났다. 여기로 오는 것은 월별 합계·상위 항목 같은 집계 숫자뿐이다.
// 회사명·거래처명·개별 거래 행은 받지 않는다.

import { z } from "zod";

import { describeError, generateJson, hasGeminiKey } from "@/lib/ai/gemini";
import { CASHFLOW_SYSTEM, buildCashflowInput } from "@/lib/ai/geminiPrompts";
import { CashflowInsightZ } from "@/lib/ai/geminiSchemas";
import { clientIp, rateLimit } from "@/lib/ai/rateLimit";
import type { CashflowSummary } from "@/lib/engine/cashflow";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RATE_PER_MIN = 6;

const Top = z.array(z.object({ category: z.string().max(60), amount: z.number(), share: z.number() })).max(12);
const SummaryZ = z.object({
  months: z.array(z.object({ month: z.string().max(7), inflow: z.number(), outflow: z.number(), net: z.number(), cumulative: z.number() })).min(1).max(60),
  totalInflow: z.number(), totalOutflow: z.number(),
  avgMonthlyInflow: z.number(), avgMonthlyOutflow: z.number(), avgMonthlyNet: z.number(),
  latestNet: z.number(), momNetChange: z.number().nullable(),
  burnRate: z.number().nullable(), runwayMonths: z.number().nullable(), endingBalance: z.number(),
  topExpenses: Top, topIncomes: Top,
  rowCount: z.number(), span: z.object({ from: z.string().max(7), to: z.string().max(7) }),
  flags: z.array(z.string().max(120)).max(10),
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

  const limit = rateLimit(`cashflow:${clientIp(req)}`, RATE_PER_MIN);
  if (!limit.ok) return err("rate_limited", `잠시 후 다시 시도하세요 (분당 ${RATE_PER_MIN}회 제한)`, 429, { "Retry-After": String(limit.retryAfter) });

  const body = await req.json().catch(() => null) as { summary?: unknown } | null;
  const parsed = SummaryZ.safeParse(body?.summary);
  if (!parsed.success) return err("bad_request", "집계 형식이 올바르지 않습니다.", 400);

  try {
    const { data, usage } = await generateJson({
      system: CASHFLOW_SYSTEM,
      input: buildCashflowInput(parsed.data as CashflowSummary),
      schema: CashflowInsightZ,
    });
    console.log(`[ai/cashflow] ${parsed.data.months.length}개월 · ${usage.model} · ${usage.ms}ms`);
    return Response.json({ insight: data, usage });
  } catch (e) {
    logError("ai/cashflow", e);
    return err("ai_failed", describeError(e), 502);
  }
}
