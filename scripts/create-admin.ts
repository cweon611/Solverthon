// scripts/create-admin.ts — 관리자 계정 생성. 비밀번호를 만들어 한 번만 출력한다.
//   npm run admin:create -- --id admin --biz 000-00-00000 [--password '...'] [--reset]
// 관리자 여부는 ADMIN_LOGIN_IDS 환경변수(기본 "admin")로 정한다. 이 스크립트는 계정만 만든다.

import { config } from "dotenv";
config({ path: ".env.local" });
import { randomBytes } from "node:crypto";

import { normalizeBizNo } from "../lib/auth/bizNo";
import { hashPassword } from "../lib/auth/password";
import { requireSupabase } from "../lib/data/supabase";

async function main(): Promise<void> {
  const arg = (name: string): string | undefined => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const loginId = (arg("id") ?? "admin").toLowerCase();
  const bizNo = normalizeBizNo(arg("biz") ?? "000-00-00000");
  if (!bizNo) throw new Error("사업자번호는 숫자 10자리여야 합니다.");
  const password = arg("password") ?? randomBytes(9).toString("base64url"); // 12자
  const reset = process.argv.includes("--reset");

  const db = requireSupabase();
  const existing = await db.from("app_users").select("id").eq("login_id", loginId).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  const password_hash = await hashPassword(password);
  if (existing.data) {
    if (!reset) {
      console.log(`이미 있는 계정입니다: ${loginId}. 비밀번호를 새로 만들려면 --reset 을 붙이세요.`);
      process.exit(0);
    }
    const r = await db.from("app_users").update({ password_hash, biz_no: bizNo }).eq("id", existing.data.id);
    if (r.error) throw new Error(r.error.message);
    console.log(`비밀번호를 재설정했습니다: ${loginId}`);
  } else {
    const r = await db.from("app_users").insert({ login_id: loginId, password_hash, biz_no: bizNo });
    if (r.error) throw new Error(r.error.message);
    console.log(`관리자 계정을 만들었습니다: ${loginId}`);
  }
  console.log(`  아이디      : ${loginId}`);
  console.log(`  비밀번호    : ${password}`);
  console.log(`  사업자번호  : ${bizNo.slice(0, 3)}-${bizNo.slice(3, 5)}-${bizNo.slice(5)}`);
  console.log(`  ※ 비밀번호는 여기 한 번만 표시됩니다. 서버에는 해시만 저장됩니다.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
