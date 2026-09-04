// GET /api/ingest — 수집 파이프라인 1회 실행 (Vercel Cron) · §9
// Authorization: Bearer ${CRON_SECRET} 이 맞아야 실행한다.

import { runIngest } from "@/lib/ingest/run";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function error(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET(req: Request) {
  if (process.env.INGEST_ENABLED === "false") {
    return error("disabled", "수집이 비활성화되어 있습니다.", 503);
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) return error("not_configured", "CRON_SECRET이 설정되어 있지 않습니다.", 503);
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return error("unauthorized", "인증에 실패했습니다.", 401);
  }

  const url = new URL(req.url);
  const sources = url.searchParams.get("source")?.split(",") as ("kstartup" | "bizinfo")[] | undefined;
  const num = (k: string) => { const v = url.searchParams.get(k); return v === null ? undefined : Number(v); };

  try {
    // cron에서는 한 번에 적게 처리한다 (§7.5). 백로그는 다음 실행에서 이어진다.
    const run = await runIngest({
      sources,
      maxFetch: num("maxFetch") ?? 200,
      maxParse: num("maxParse") ?? 5,
      maxEmbed: num("maxEmbed") ?? 50,
    });
    return Response.json({ runs: [run] });
  } catch (e) {
    return error("ingest_failed", e instanceof Error ? e.message : "수집에 실패했습니다.", 500);
  }
}
