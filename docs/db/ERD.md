# 브릿지 DB — ERD

Supabase(PostgreSQL 17 + pgvector). 스키마 전체는 [`schema.sql`](./schema.sql), 원본 마이그레이션은 [`../../supabase/migrations/`](../../supabase/migrations/)에 있습니다.

```mermaid
erDiagram
    programs ||--o{ programs : "duplicate_of (중복 공고 → 대표 공고)"
    programs ||--o{ dedupe_pairs : "program_a / program_b"
    app_users ||--|| app_profiles : "user_id (계정당 1행)"

    programs {
        uuid   id PK
        text   source "kstartup|bizinfo|local|synthetic"
        text   source_id "API 원본 ID · (source,source_id) UNIQUE"
        text   title
        text   organization
        text   support_field "창업|R&D|수출|고용|금융|내수|경영|기타"
        text   amount_text
        date   apply_start
        date   apply_end
        bool   is_rolling "상시 접수"
        text   raw_text "파싱 입력 원문"
        text   attachment_url "첨부(hwpx·pdf) 링크"
        text   attachment_text "첨부 본문 발췌 캐시"
        jsonb  eligibility "AI 구조화 조건 트리 + 근거 문장"
        jsonb  unmapped_conditions "매핑 실패 조건 → 판정에 '확인 필요' 주입"
        jsonb  required_documents
        text   review_status "ai_draft|human_verified"
        bool   is_synthetic "공개 배포는 true만 노출"
        uuid   duplicate_of FK
        vector embedding "voyage-4 · 1024차원 · HNSW cosine"
        ts     parsed_at
    }

    obligations {
        text  id PK "OBL-LABOR-001 형식"
        text  category "labor|tax|permit|privacy|insurance"
        text  title
        text  penalty "미이행 시 과태료·가산세"
        text  authority "소관 기관"
        jsonb legal_basis "법령명 · 조문 · 조문코드"
        date  legal_checked_at "법령 확인 기준일 · null이면 UI '확인 중'"
        jsonb applies_if "이 프로필에 해당하는가"
        jsonb schedule "monthly|quarterly|semiannual|annual|event_relative"
        text  importance "high|normal"
    }

    document_types {
        text id PK "sme_confirmation 등"
        text name
        text issuer
        int  lead_time_days "발급 소요일 · 리드타임 역산의 근거"
        date verified_at "소요기간 확인일"
    }

    dedupe_pairs {
        bigint id PK
        uuid   program_a FK
        uuid   program_b FK
        real   similarity "코사인 유사도"
        bool   period_overlap "접수기간 겹침"
        text   decision "duplicate|distinct|review"
        text   decided_by "auto|human"
    }

    ingest_runs {
        bigint id PK
        text   source
        int    fetched
        int    upserted
        int    parsed
        int    embedded
        int    deduped
        int    failed
        ts     started_at
        ts     finished_at
    }

    app_users {
        uuid id PK
        text login_id UK
        text password_hash "scrypt"
        text biz_no
        ts   created_at
        ts   last_login_at
    }

    app_profiles {
        uuid  user_id PK "FK → app_users.id"
        jsonb data "프로필·할 일·설정·이력·초안"
        ts    updated_at
    }
```

## 설계 의도

**카탈로그(공개 데이터)와 사용자 데이터를 분리했습니다.** `programs`·`obligations`·`document_types`·`dedupe_pairs`는 모든 사용자가 공유하는 공개 카탈로그이고, `app_users`·`app_profiles`는 계정 데이터입니다. 판정 엔진은 카탈로그만 읽고, 판정 자체는 브라우저에서 실행됩니다.

**`programs.eligibility`가 이 DB의 핵심입니다.** 공고 원문을 Claude가 구조화한 조건 트리인데, 모든 조건에 근거가 된 원문 문장(`source_text`)이 함께 저장됩니다. 화면에서 요건을 클릭하면 그 문장이 그대로 펼쳐지고, AI가 필드에 매핑하지 못한 조건은 `unmapped_conditions`로 따로 남겨 판정 결과에 '확인 필요'를 강제 주입합니다 — AI가 확신 없이 판정하지 않게 만드는 장치입니다.

**`embedding`은 중복 판별용입니다.** 같은 사업이 K-Startup과 기업마당에 각각 올라오는 일이 잦아서, Voyage 임베딩(1024차원)을 HNSW 코사인 인덱스로 검색해 후보를 찾습니다. 다만 병합 여부는 임베딩이 정하지 않고 `유사도 ≥ 0.92 AND 접수기간 겹침`이라는 규칙이 정하며, 그 근거를 `dedupe_pairs`에 남깁니다.

**RLS는 기본 차단입니다.** `app_users`·`app_profiles`는 anon·authenticated 권한을 모두 회수해 정책이 하나도 없고, service role로만 접근합니다. 카탈로그 테이블은 읽기 정책만 두되 `programs`는 `is_synthetic = true`인 행만 익명 조회를 허용해, 공개 배포본에서 합성 데이터만 노출되도록 DB 계층에서 한 번 더 막았습니다.
