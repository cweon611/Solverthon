// lib/auth/http.ts — 인증 라우트 공통: 입력 검증·응답·쿠키

import { z } from "zod";

import { isAdmin } from "./admin";
import { AuthUnavailable, DuplicateLoginId } from "./repo";
import { SESSION_TTL_S, getAuthSecret, isSecureRequest, sessionCookie, signSession, type SessionPayload } from "./session";
import type { UserRow } from "./repo";

export const LoginIdZ = z
  .string()
  .trim()
  .toLowerCase()
  .min(4, "아이디는 4자 이상")
  .max(20, "아이디는 20자 이하")
  .regex(/^[a-z0-9_.-]+$/, "아이디는 영문 소문자·숫자·_ . - 만 사용");
export const PasswordZ = z.string().min(8, "비밀번호는 8자 이상").max(128);
export const BizNoInputZ = z.string().trim().min(10).max(14);

export function jsonError(code: string, message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: { code, message } }, { status, headers });
}

export function mapAuthError(e: unknown): Response {
  if (e instanceof AuthUnavailable) return jsonError("auth_unavailable", e.message, 503);
  if (e instanceof DuplicateLoginId) return jsonError("duplicate", e.message, 409);
  console.error("[auth]", e instanceof Error ? `${e.constructor.name}: ${e.message.slice(0, 200)}` : e);
  return jsonError("auth_failed", "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.", 500);
}

export function publicUser(u: UserRow) {
  return { id: u.id, loginId: u.login_id, bizNo: u.biz_no, isAdmin: isAdmin(u.login_id) };
}

/** 세션 쿠키를 실어 사용자 정보를 돌려준다 */
export function respondWithSession(req: Request, u: UserRow, status = 200): Response {
  const secret = getAuthSecret();
  if (!secret) return jsonError("no_secret", "서버에 AUTH_SECRET이 없습니다.", 503);
  const payload: SessionPayload = { uid: u.id, lid: u.login_id, bno: u.biz_no, exp: Date.now() + SESSION_TTL_S * 1000 };
  const token = signSession(payload, secret);
  return Response.json({ user: publicUser(u) }, { status, headers: { "Set-Cookie": sessionCookie(token, isSecureRequest(req)) } });
}
