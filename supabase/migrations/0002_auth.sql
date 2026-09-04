-- 0002_auth.sql — 회원 계정 (아이디 · 비밀번호 해시 · 사업자번호)
-- 비밀번호는 scrypt 해시만 저장한다. 회사 프로필은 여기 넣지 않는다 (§0.1-4: 프로필은 브라우저에만).
-- 서버(secret key)만 읽고 쓴다. anon/authenticated 역할에는 권한을 주지 않는다.

create table if not exists public.app_users (
  id             uuid primary key default gen_random_uuid(),
  login_id       text not null unique,
  password_hash  text not null,
  biz_no         text not null,                    -- 숫자 10자리 (하이픈 제거)
  created_at     timestamptz not null default now(),
  last_login_at  timestamptz
);

create index if not exists app_users_biz_no_idx on public.app_users (biz_no);

alter table public.app_users enable row level security;
revoke all on public.app_users from anon, authenticated;
-- RLS 정책을 하나도 만들지 않으므로 service role 외에는 어떤 행도 볼 수 없다.

comment on table public.app_users is '브릿지 회원 계정. 비밀번호는 scrypt 해시. 회사 프로필은 저장하지 않음.';
