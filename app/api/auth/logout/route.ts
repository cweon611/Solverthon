// POST /api/auth/logout — 세션 쿠키를 지운다. 브라우저의 회사 프로필은 건드리지 않는다.

import { isSecureRequest, sessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(null, isSecureRequest(req)) } });
}
