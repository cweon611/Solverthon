// POST /api/auth/login — 아이디·비밀번호·사업자번호 세 가지가 모두 맞아야 한다.
// 어느 것이 틀렸는지는 알려주지 않는다.

import { z } from "zod";

import { normalizeBizNo } from "@/lib/auth/bizNo";
import { BizNoInputZ, LoginIdZ, jsonError, mapAuthError, respondWithSession } from "@/lib/auth/http";
import { verifyPassword } from "@/lib/auth/password";
import { findUserByLoginId, touchLastLogin } from "@/lib/auth/repo";
import { clientIp, rateLimit } from "@/lib/ai/rateLimit";

export const dynamic = "force-dynamic";

const BodyZ = z.object({ loginId: LoginIdZ, password: z.string().min(1).max(128), bizNo: BizNoInputZ });
const FAIL = "아이디, 비밀번호, 사업자번호가 맞지 않습니다.";

export async function POST(req: Request) {
  const limit = rateLimit(`login:${clientIp(req)}`, 10);
  if (!limit.ok) return jsonError("rate_limited", "시도가 너무 많습니다. 잠시 후 다시 시도하세요.", 429, { "Retry-After": String(limit.retryAfter) });

  const parsed = BodyZ.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("bad_request", FAIL, 400);
  const bizNo = normalizeBizNo(parsed.data.bizNo);
  if (!bizNo) return jsonError("unauthorized", FAIL, 401);

  try {
    const user = await findUserByLoginId(parsed.data.loginId);
    const ok = user !== null && user.biz_no === bizNo && (await verifyPassword(parsed.data.password, user.password_hash));
    if (!ok || !user) return jsonError("unauthorized", FAIL, 401);
    await touchLastLogin(user.id);
    console.log(`[auth/login] ${user.login_id}`);
    return respondWithSession(req, user);
  } catch (e) {
    return mapAuthError(e);
  }
}
