// GET/PUT /api/sync — 로그인 계정의 데이터(프로필·할 일·설정·이력·초안)를 통째로 읽고 쓴다.
// 세션 쿠키가 없으면 401. 계정당 1행(app_profiles). 크기 1MB 제한.

import { z } from "zod";

import { readSession } from "@/lib/auth/session";
import { getSupabase } from "@/lib/data/supabase";

export const dynamic = "force-dynamic";

const MAX_BYTES = 1_000_000;
const SYNC_KEYS = ["profile", "tasks", "settings", "history", "drafts"] as const;
const DataZ = z.object(Object.fromEntries(SYNC_KEYS.map((k) => [k, z.unknown().optional()]))).strict();

const err = (code: string, message: string, status: number) => Response.json({ error: { code, message } }, { status });
const TABLE_MISSING = /app_profiles|PGRST205|42P01|schema cache/i;
const unavailable = () => err("sync_unavailable", "데이터 저장소(app_profiles)가 준비되지 않았습니다. supabase/migrations/0003_profiles.sql을 SQL Editor에서 실행하세요.", 503);

export async function GET(req: Request) {
  const s = readSession(req);
  if (!s) return err("unauthorized", "로그인이 필요합니다.", 401);
  const db = getSupabase();
  if (!db) return err("sync_unavailable", "DB가 설정되지 않았습니다.", 503);

  const { data, error } = await db.from("app_profiles").select("data,updated_at").eq("user_id", s.uid).maybeSingle();
  if (error) return TABLE_MISSING.test(error.message) ? unavailable() : err("sync_failed", "불러오지 못했습니다.", 500);
  const row = data as { data: Record<string, unknown>; updated_at: string } | null;
  return Response.json({ data: row?.data ?? null, updatedAt: row?.updated_at ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const s = readSession(req);
  if (!s) return err("unauthorized", "로그인이 필요합니다.", 401);
  const db = getSupabase();
  if (!db) return err("sync_unavailable", "DB가 설정되지 않았습니다.", 503);

  const raw = await req.text();
  if (raw.length > MAX_BYTES) return err("too_large", "저장할 데이터가 너무 큽니다 (1MB 제한).", 413);
  let body: { data?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return err("bad_request", "요청 본문을 읽을 수 없습니다.", 400);
  }
  const parsed = DataZ.safeParse(body.data);
  if (!parsed.success) return err("bad_request", "저장 형식이 올바르지 않습니다.", 400);

  const updatedAt = new Date().toISOString();
  const { error } = await db
    .from("app_profiles")
    .upsert({ user_id: s.uid, data: parsed.data, updated_at: updatedAt }, { onConflict: "user_id" });
  if (error) return TABLE_MISSING.test(error.message) ? unavailable() : err("sync_failed", "저장하지 못했습니다.", 500);
  return Response.json({ updatedAt });
}
