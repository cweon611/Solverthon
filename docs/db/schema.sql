-- ═══ 0001_init.sql ═══
-- 브릿지 카탈로그 스키마 (PRD §5.5)
-- 적용: Supabase 대시보드 → SQL Editor에 붙여넣고 실행. 여러 번 실행해도 안전하다.
--
-- 접근 모델: 앱 서버만 secret key(service_role)로 접근한다. 브라우저는 Supabase에 직접 붙지 않는다(§3.4).
-- RLS는 키가 유출됐을 때를 대비한 방어선으로, anon에는 합성 데이터 읽기만 허용한다.

create extension if not exists vector with schema extensions;

-- ─── 지원사업 ────────────────────────────────────────────────────────────────
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('kstartup','bizinfo','local','synthetic')),
  source_id text,
  title text not null,
  organization text not null,
  executing_org text,
  support_field text not null default '기타'
    check (support_field in ('창업','R&D','수출','고용','금융','내수','경영','기타')),
  support_type text,
  amount_text text,
  summary text,
  apply_start date,
  apply_end date,
  is_rolling boolean not null default false,
  original_url text,
  apply_url text,
  raw_text text,                                   -- 파싱 입력 원문
  eligibility jsonb not null default '{"operator":"AND","conditions":[]}'::jsonb,
  unmapped_conditions jsonb not null default '[]'::jsonb,
  required_documents jsonb not null default '[]'::jsonb,
  review_status text not null default 'ai_draft' check (review_status in ('ai_draft','human_verified')),
  is_synthetic boolean not null default false,
  duplicate_of uuid references public.programs(id),
  embedding vector(1024),                          -- voyage-4, 1024차원
  parse_model text,
  parse_error text,
  parsed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);

create index if not exists programs_embedding_hnsw on public.programs using hnsw (embedding vector_cosine_ops);
create index if not exists programs_apply_end_idx on public.programs (apply_end);
create index if not exists programs_canonical_idx on public.programs (duplicate_of) where duplicate_of is null;

-- ─── 서류 카탈로그 ───────────────────────────────────────────────────────────
create table if not exists public.document_types (
  id text primary key,
  name text not null,
  issuer text not null,
  lead_time_days int,
  issue_url text,
  verified_at date
);

-- ─── 법정의무 ────────────────────────────────────────────────────────────────
create table if not exists public.obligations (
  id text primary key,
  category text not null,
  title text not null,
  what text not null,
  penalty text not null,
  authority text not null,
  legal_basis jsonb,
  legal_text_excerpt text,
  legal_checked_at date,
  how_to_url text,
  applies_if jsonb not null,
  schedule jsonb not null,
  importance text not null default 'normal' check (importance in ('high','normal'))
);

-- ─── 중복 판정 기록 ──────────────────────────────────────────────────────────
create table if not exists public.dedupe_pairs (
  id bigint generated always as identity primary key,
  program_a uuid not null references public.programs(id),
  program_b uuid not null references public.programs(id),
  similarity real not null,
  period_overlap boolean not null,
  decision text not null check (decision in ('duplicate','distinct','review')),
  decided_by text not null default 'auto' check (decided_by in ('auto','human')),
  created_at timestamptz not null default now(),
  unique (program_a, program_b)
);

-- ─── 수집 실행 로그 ──────────────────────────────────────────────────────────
create table if not exists public.ingest_runs (
  id bigint generated always as identity primary key,
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fetched int default 0,
  upserted int default 0,
  parsed int default 0,
  embedded int default 0,
  deduped int default 0,
  failed int default 0,
  notes text
);

-- ─── 유사도 검색 RPC (코사인 거리 <=>; 유사도 = 1 - 거리) ─────────────────────
create or replace function public.match_programs(
  query_embedding vector(1024), match_threshold float, match_count int, exclude_id uuid default null
) returns table (id uuid, title text, organization text, apply_start date, apply_end date, is_rolling boolean, similarity float)
language sql stable as $$
  select p.id, p.title, p.organization, p.apply_start, p.apply_end, p.is_rolling,
         1 - (p.embedding <=> query_embedding) as similarity
  from public.programs p
  where p.embedding is not null and p.duplicate_of is null
    and (exclude_id is null or p.id <> exclude_id)
    and 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding asc
  limit match_count;
$$;

-- ─── 권한 ────────────────────────────────────────────────────────────────────
-- Supabase가 새 테이블 자동 노출을 없애는 중이라, 서버가 쓰는 service_role 권한을 명시한다.
-- 이렇게 두면 프로젝트 설정이 어느 쪽이든 동일하게 동작한다.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- anon은 읽기만, 그것도 RLS가 허용하는 행만.
grant usage on schema public to anon;
grant select on public.programs, public.document_types, public.obligations, public.dedupe_pairs to anon;
grant execute on function public.match_programs(vector, float, int, uuid) to anon;

-- ─── RLS: 키가 유출됐을 때의 방어선 ──────────────────────────────────────────
alter table public.programs enable row level security;
alter table public.document_types enable row level security;
alter table public.obligations enable row level security;
alter table public.dedupe_pairs enable row level security;
alter table public.ingest_runs enable row level security;

drop policy if exists "anon read synthetic programs" on public.programs;
create policy "anon read synthetic programs" on public.programs for select to anon using (is_synthetic = true);

drop policy if exists "anon read document_types" on public.document_types;
create policy "anon read document_types" on public.document_types for select to anon using (true);

drop policy if exists "anon read obligations" on public.obligations;
create policy "anon read obligations" on public.obligations for select to anon using (true);

drop policy if exists "anon read dedupe_pairs" on public.dedupe_pairs;
create policy "anon read dedupe_pairs" on public.dedupe_pairs for select to anon using (true);

-- ingest_runs는 서버 전용이라 anon 정책을 만들지 않는다 (RLS만 켜 두면 anon은 0행)

-- ═══ 0002_auth.sql ═══
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

-- ═══ 0003_profiles.sql ═══
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

-- ═══ 0004_attachments.sql ═══
-- 0004_attachments.sql — 첨부파일(hwpx·pdf) 본문 발췌
-- attachment_url: 공식 API JSON이 준 파일 링크(hwpx·pdf만). 수집 때마다 채운다.
-- attachment_text: AI 파싱 시 한 번 뽑아 캐싱한 발췌(최대 6000자). raw_text와 별개 컬럼이라
--   공고 내용이 바뀌어 재파싱되어도 첨부파일이 그대로면 다시 내려받지 않는다.

alter table public.programs add column if not exists attachment_url text;
alter table public.programs add column if not exists attachment_text text;

comment on column public.programs.attachment_url is '기업마당 API가 JSON으로 준 첨부파일(hwpx·pdf) 링크. 옛 hwp 등 미지원 형식은 null.';
comment on column public.programs.attachment_text is 'hwpx·pdf에서 뽑은 본문 발췌(최대 6000자). 파싱 시 한 번 캐싱해 재사용한다.';

