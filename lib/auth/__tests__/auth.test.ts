import { describe, expect, it } from "vitest";

import { bizNoChecksumOk, formatBizNo, normalizeBizNo } from "@/lib/auth/bizNo";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { sessionCookie, signSession, verifySession } from "@/lib/auth/session";

describe("bizNo", () => {
  it("하이픈·공백을 제거해 10자리만 받는다", () => {
    expect(normalizeBizNo("123-45-67890")).toBe("1234567890");
    expect(normalizeBizNo(" 123 45 67890 ")).toBe("1234567890");
    expect(normalizeBizNo("12345")).toBeNull();
    expect(normalizeBizNo("123-45-678901")).toBeNull();
  });
  it("000-00-00000 형식으로 표기한다", () => {
    expect(formatBizNo("1234567890")).toBe("123-45-67890");
    expect(formatBizNo("123-45-67890")).toBe("123-45-67890");
  });
  it("검증 숫자를 확인한다", () => {
    // 공개된 유효 번호 예시 (국세청 검증식). 마지막 자리를 바꾸면 실패해야 한다
    expect(bizNoChecksumOk("2208162517")).toBe(true);
    expect(bizNoChecksumOk("2208162518")).toBe(false);
    expect(bizNoChecksumOk("123")).toBe(false);
  });
});

describe("password", () => {
  it("해시하고 검증한다. 다른 비밀번호는 거절한다", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
  it("같은 비밀번호도 솔트가 달라 해시가 다르다", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });
});

describe("session", () => {
  const secret = "test-secret";
  const payload = { uid: "u1", lid: "kim", bno: "1234567890", exp: Date.now() + 60_000 };

  it("서명하고 검증한다", () => {
    const t = signSession(payload, secret);
    expect(verifySession(t, secret)).toEqual(payload);
  });
  it("변조·다른 비밀키·만료는 null", () => {
    const t = signSession(payload, secret);
    expect(verifySession(t + "x", secret)).toBeNull();
    expect(verifySession(t, "other")).toBeNull();
    expect(verifySession(signSession({ ...payload, exp: Date.now() - 1 }, secret), secret)).toBeNull();
    expect(verifySession("nodot", secret)).toBeNull();
  });
  it("쿠키 문자열", () => {
    expect(sessionCookie("abc", true)).toBe("bridge_session=abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure");
    expect(sessionCookie(null, false)).toBe("bridge_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  });
});
