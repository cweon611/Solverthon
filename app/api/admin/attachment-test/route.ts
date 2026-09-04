// GET /api/admin/attachment-test?url=… — 첨부파일 추출 진단 (관리자 세션 또는 CRON_SECRET)
// Claude를 부르지 않는다. Vercel 런타임에서 pdf/hwpx 추출이 되는지 단계별로 확인하는 용도.

import { isAdmin } from "@/lib/auth/admin";
import { readSession } from "@/lib/auth/session";
import { fetchAttachmentDetail } from "@/lib/ingest/attachment";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const s = readSession(req);
  const bearer = req.headers.get("authorization");
  const cronOk = Boolean(process.env.CRON_SECRET) && bearer === `Bearer ${process.env.CRON_SECRET}`;
  if (!cronOk && !(s && isAdmin(s.lid))) {
    return Response.json({ error: { code: "forbidden", message: "관리자만 사용할 수 있습니다." } }, { status: 403 });
  }
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !/^https:\/\/www\.bizinfo\.go\.kr\//.test(url)) {
    return Response.json({ error: { code: "bad_request", message: "bizinfo.go.kr 첨부파일 URL이 필요합니다." } }, { status: 400 });
  }
  const d = await fetchAttachmentDetail(url);
  return Response.json({ ...d, text: d.text ? `${d.text.slice(0, 300)}…(${d.text.length}자)` : null, runtime: { node: process.version, region: process.env.VERCEL_REGION ?? null } });
}
