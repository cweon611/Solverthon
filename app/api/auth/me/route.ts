// GET /api/auth/me — 세션 쿠키 서명만 검증한다 (DB 조회 없음). 없거나 만료면 401.

import { isAdmin } from "@/lib/auth/admin";
import { getAuthSecret, readSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!getAuthSecret()) {
    return Response.json({ error: { code: "no_secret", message: "서버에 AUTH_SECRET이 없습니다." } }, { status: 503 });
  }
  const s = readSession(req);
  if (!s) return Response.json({ error: { code: "unauthorized", message: "로그인이 필요합니다." } }, { status: 401 });
  return Response.json({ user: { id: s.uid, loginId: s.lid, bizNo: s.bno, isAdmin: isAdmin(s.lid) } }, { headers: { "Cache-Control": "no-store" } });
}
