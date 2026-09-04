# 브릿지 — 클라우드 DB 산출물

2026 전남광주 청년 AI 솔버톤 · B트랙 · 팀 코스모스 · 「브릿지(Bridge)」

이 폴더는 브릿지가 실제로 운영 중인 클라우드 DB의 **스키마·구조·적재 데이터**를 심사에서 바로 확인하실 수 있게 정리한 것입니다.

| 항목 | 내용 |
|---|---|
| DBMS | **Supabase (PostgreSQL 17)** + `pgvector` 확장 |
| 리전 | Supabase 클라우드 (프로젝트 `bridge` / `main`) |
| 접근 | 애플리케이션 **서버에서만** service role 키로 접근. 브라우저는 DB에 직접 접속하지 않습니다 |
| 테이블 | 카탈로그 5 (`programs`, `obligations`, `document_types`, `dedupe_pairs`, `ingest_runs`) + 계정 2 (`app_users`, `app_profiles`) |

## 폴더 구성

| 파일 | 설명 |
|---|---|
| [`ERD.md`](./ERD.md) | 테이블 관계도(Mermaid)와 설계 의도 |
| [`schema.sql`](./schema.sql) | 전체 스키마 합본 — 테이블·인덱스·RLS 정책·RPC 함수 |
| [`data/programs.csv`](./data/programs.csv) | 지원사업 공고 23건 (AI 구조화 조건 + 근거 문장 포함) |
| [`data/obligations.csv`](./data/obligations.csv) | 법정의무 22건 (법령 조문·과태료·주기) |
| [`data/document_types.csv`](./data/document_types.csv) | 제출서류 카탈로그 12건 (발급 소요일 — 리드타임 역산 근거) |
| [`data/dedupe_pairs.csv`](./data/dedupe_pairs.csv) | 중복 판별 결과 |
| [`data/demo_profiles.csv`](./data/demo_profiles.csv) | 데모 기업 프로필 3종 |

원본 마이그레이션은 [`supabase/migrations/`](../../supabase/migrations/)에 있고, `0001` → `0004` 순서로 적용됩니다.

## 데이터 성격 — 합성 데이터입니다

CSV의 모든 행은 **시연용으로 생성한 합성 데이터**이며 실제 공고·기업과 무관합니다. 대회 규정("공개 배포 URL에는 더미·합성데이터만 게시")에 따른 것으로, DB 계층에서도 `programs` 테이블의 익명 조회 정책을 `is_synthetic = true`로 제한해 두 겹으로 막았습니다.

실제 수집 파이프라인은 동작합니다. `npm run ingest`를 실행하면 K-Startup(공공데이터포털)·기업마당 공식 오픈 API에서 실제 공고를 가져와 같은 테이블에 `is_synthetic = false`로 적재하고, 파싱·임베딩·중복 판별까지 수행한 뒤 `ingest_runs`에 실행 기록을 남깁니다. 이렇게 적재된 실공고는 공개 배포본 화면에는 노출되지 않습니다.

## DB 접속 정보를 제출하지 않은 이유

`app_users`에는 가입자의 아이디·비밀번호 해시·사업자번호가, `app_profiles`에는 기업 프로필이 들어 있습니다. 접속 정보를 제출물에 적으면 이 데이터가 그대로 열리므로, **스키마와 공개 가능한 카탈로그 데이터만** 이 폴더에 담았습니다. 라이브 DB 확인이 필요하시면 심사 중 화면 공유로 Supabase 대시보드를 열어 보여 드리겠습니다.

## 재현 방법

```bash
# 1) Supabase 프로젝트를 만들고 SQL Editor에서 schema.sql 실행
#    (또는 supabase/migrations/0001~0004를 순서대로 실행)

# 2) 환경변수 설정
SUPABASE_URL=...            # 서버 전용
SUPABASE_SECRET_KEY=...     # 서버 전용 (브라우저에 노출되는 NEXT_PUBLIC_ 키 없음)

# 3) 합성 시드 적재 (상대 날짜가 실행 시점 기준으로 확정됩니다)
npm run seed:db

# 4) (선택) 실제 공고 수집 — 공식 오픈 API만 호출합니다
npm run ingest -- --source kstartup --maxFetch 30
```

## 관련 문서

- 전체 구현 명세: [`브릿지_PRD.md`](../../브릿지_PRD.md) — §5.5에 스키마 설계 근거, §7에 AI 파이프라인 명세
- 데이터 출처·면책 고지: 서비스 내 `/about`
