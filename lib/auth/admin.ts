// lib/auth/admin.ts — 관리자 계정 판별. ADMIN_LOGIN_IDS(쉼표 구분)에 든 아이디가 관리자다. 기본 "admin".
// 스키마를 바꾸지 않고 환경변수로만 정한다. 서버에서만 읽는다.

export function adminLoginIds(): string[] {
  return (process.env.ADMIN_LOGIN_IDS ?? "admin")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(loginId: string): boolean {
  return adminLoginIds().includes(loginId.trim().toLowerCase());
}
