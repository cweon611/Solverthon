-- 0003_profiles.sql — 계정별 데이터 원본 (프로필·할 일·설정·이력·신청서 초안) JSON 한 덩어리
-- 로그인하면 어느 기기에서든 같은 화면이 나오도록 서버가 원본을 가진다.
-- 서버(secret key)만 읽고 쓴다.

create table if not exists public.app_profiles (
  user_id     uuid primary key references public.app_users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.app_profiles enable row level security;
revoke all on public.app_profiles from anon, authenticated;

comment on table public.app_profiles is '브릿지 계정 데이터(프로필·할 일·설정·이력·초안). 계정당 1행.';
