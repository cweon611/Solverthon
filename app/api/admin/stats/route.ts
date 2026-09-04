// GET /api/admin/stats — 관리자 전용 통계. 세션 + ADMIN_LOGIN_IDS 확인. 비밀번호 해시는 절대 읽지 않는다.

import { aggregate, type IngestRunLite, type ProfileLite, type ProgramLite, type UserLite } from "@/lib/admin/stats";
import { isAdmin } from "@/lib/auth/admin";
import { readSession } from "@/lib/auth/session";
import { getSupabase } from "@/lib/data/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const err = (code: string, message: string, status: number) => Response.json({ error: { code, message } }, { status });

export async function GET(req: Request) {
  const s = readSession(req);
  if (!s) return err("unauthorized", "로그인이 필요합니다.", 401);
  if (!isAdmin(s.lid)) return err("forbidden", "관리자만 볼 수 있습니다.", 403);
  const db = getSupabase();
  if (!db) return err("unavailable", "DB가 설정되지 않았습니다.", 503);

  const [users, profiles, programs, obligations, runs] = await Promise.all([
    db.from("app_users").select("id,login_id,biz_no,created_at,last_login_at").limit(5000),
    db.from("app_profiles").select("user_id,data,updated_at").limit(5000),
    db.from("programs").select("is_synthetic,parsed_at,apply_end,is_rolling,support_field,review_status,source,duplicate_of").limit(20000),
    db.from("obligations").select("legal_checked_at"),
    db.from("ingest_runs").select("*").order("started_at", { ascending: false }).limit(10),
  ]);
  for (const [name, r] of Object.entries({ users, profiles, programs, obligations, runs })) {
    if (r.error) return err("query_failed", `${name} 조회 실패: ${r.error.message.slice(0, 120)}`, 500);
  }

  const stats = aggregate({
    users: (users.data ?? []) as UserLite[],
    profiles: (profiles.data ?? []) as ProfileLite[],
    programs: (programs.data ?? []) as ProgramLite[],
    obligations: (obligations.data ?? []) as { legal_checked_at: string | null }[],
    runs: (runs.data ?? []) as IngestRunLite[],
    now: new Date(),
  });
  return Response.json(stats, { headers: { "Cache-Control": "no-store" } });
}
