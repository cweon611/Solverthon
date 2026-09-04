// POST /api/auth/signup — 회원가입 (아이디·비밀번호·사업자번호)
// 비밀번호는 scrypt 해시로만 저장한다. 회사 프로필은 이 다음 단계(AI 대화)에서 브라우저에만 만든다.

import { z } from "zod";

import { normalizeBizNo } from "@/lib/auth/bizNo";
import { BizNoInputZ, LoginIdZ, PasswordZ, jsonError, mapAuthError, respondWithSession } from "@/lib/auth/http";
import { hashPassword } from "@/lib/auth/password";
import { createUser } from "@/lib/auth/repo";
import { clientIp, rateLimit } from "@/lib/ai/rateLimit";

export const dynamic = "force-dynamic";

const BodyZ = z.object({ loginId: LoginIdZ, password: PasswordZ, bizNo: BizNoInputZ });

export async function POST(req: Request) {
  const limit = rateLimit(`signup:${clientIp(req)}`, 5);
  if (!limit.ok) return jsonError("rate_limited", "잠시 후 다시 시도하세요.", 429, { "Retry-After": String(limit.retryAfter) });

  const parsed = BodyZ.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("bad_request", parsed.error.issues[0]?.message ?? "입력값을 확인하세요.", 400);

  const bizNo = normalizeBizNo(parsed.data.bizNo);
  if (!bizNo) return jsonError("bad_request", "사업자번호는 숫자 10자리(000-00-00000)여야 합니다.", 400);

  try {
    const user = await createUser({ loginId: parsed.data.loginId, passwordHash: await hashPassword(parsed.data.password), bizNo });
    console.log(`[auth/signup] ${user.login_id}`);
    return respondWithSession(req, user, 201);
  } catch (e) {
    return mapAuthError(e);
  }
}
