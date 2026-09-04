// lib/data/supabase.ts — 서버 전용 Supabase 클라이언트 (§3.4)
// secret key는 RLS를 우회하므로 절대 클라이언트로 새어나가면 안 된다.
//
// 이 파일은 Next 서버 코드와 scripts/*(tsx)가 함께 쓴다. scripts는 번들러를 거치지 않아
// "server-only" 마커를 여기 두면 실행이 막히므로, 마커는 repository.ts·supabaseRepository.ts에 두고
// 여기에는 브라우저 실행을 막는 런타임 가드를 둔다.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** 환경변수가 없으면 null — 호출부는 seed 모드로 되돌아간다 */
export function getSupabase(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    throw new Error("Supabase 클라이언트는 서버에서만 만들 수 있습니다 (secret key는 RLS를 우회합니다).");
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/** 없으면 이유를 분명히 알려주고 멈춘다 (스크립트용) */
export function requireSupabase(): SupabaseClient {
  const client = getSupabase();
  if (!client) {
    throw new Error("SUPABASE_URL 또는 SUPABASE_SECRET_KEY가 없습니다. .env.local을 확인하세요.");
  }
  return client;
}
