// lib/auth/repo.ts — app_users 읽기·쓰기. secret key로만 접근한다.

import { getSupabase } from "@/lib/data/supabase";

export interface UserRow {
  id: string;
  login_id: string;
  password_hash: string;
  biz_no: string;
  created_at: string;
  last_login_at: string | null;
}

export class AuthUnavailable extends Error {}
export class DuplicateLoginId extends Error {}

const TABLE_MISSING = /app_users|PGRST205|42P01|schema cache/i;

function db() {
  const d = getSupabase();
  if (!d) throw new AuthUnavailable("SUPABASE_URL·SUPABASE_SECRET_KEY가 없어 회원 DB를 쓸 수 없습니다.");
  return d;
}

function wrap(err: { code?: string; message: string }): never {
  if (TABLE_MISSING.test(err.message)) {
    throw new AuthUnavailable("회원 DB(app_users)가 준비되지 않았습니다. supabase/migrations/0002_auth.sql을 SQL Editor에서 실행하세요.");
  }
  throw new Error(err.message);
}

export async function findUserByLoginId(loginId: string): Promise<UserRow | null> {
  const { data, error } = await db().from("app_users").select("*").eq("login_id", loginId).maybeSingle();
  if (error) wrap(error);
  return (data as UserRow | null) ?? null;
}

export async function createUser(input: { loginId: string; passwordHash: string; bizNo: string }): Promise<UserRow> {
  const { data, error } = await db()
    .from("app_users")
    .insert({ login_id: input.loginId, password_hash: input.passwordHash, biz_no: input.bizNo })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new DuplicateLoginId("이미 사용 중인 아이디입니다.");
    wrap(error);
  }
  return data as UserRow;
}

export async function touchLastLogin(id: string): Promise<void> {
  await db().from("app_users").update({ last_login_at: new Date().toISOString() }).eq("id", id);
}
