// lib/auth/session.ts — 서명된 세션 쿠키. DB를 거치지 않고 서명만으로 검증한다.
// 쿠키에는 계정 식별자·아이디·사업자번호·만료만 들어간다. 비밀번호·프로필은 넣지 않는다.

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "bridge_session";
export const SESSION_TTL_S = 60 * 60 * 24 * 30; // 30일

export interface SessionPayload {
  uid: string; // app_users.id
  lid: string; // login_id
  bno: string; // biz_no (숫자 10자리)
  exp: number; // epoch ms
}

export function getAuthSecret(): string | null {
  return process.env.AUTH_SECRET ?? process.env.CRON_SECRET ?? null;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");
const sign = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url");

export function signSession(payload: SessionPayload, secret: string): string {
  const body = b64(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

export function verifySession(token: string, secret: string, now = Date.now()): SessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(unb64(body)) as SessionPayload;
    if (typeof p.uid !== "string" || typeof p.lid !== "string" || typeof p.bno !== "string" || typeof p.exp !== "number") return null;
    if (p.exp <= now) return null;
    return p;
  } catch {
    return null;
  }
}

/** Set-Cookie 헤더 값. token이 null이면 즉시 만료 */
export function sessionCookie(token: string | null, secure: boolean): string {
  const base = `${SESSION_COOKIE}=${token ?? ""}; Path=/; HttpOnly; SameSite=Lax`;
  const age = token ? `Max-Age=${SESSION_TTL_S}` : "Max-Age=0";
  return `${base}; ${age}${secure ? "; Secure" : ""}`;
}

export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

export function readSession(req: Request): SessionPayload | null {
  const secret = getAuthSecret();
  const token = readCookie(req, SESSION_COOKIE);
  if (!secret || !token) return null;
  return verifySession(token, secret);
}

export function isSecureRequest(req: Request): boolean {
  if (req.headers.get("x-forwarded-proto") === "https") return true;
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}
