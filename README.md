# 브릿지 (Bridge)

초기 창업기업을 위한 푸시형 지원사업 · 법정의무 · 자격소멸 알리미

2026 전남광주 청년 AI 솔버톤 B트랙 · 팀 코스모스

---

## 무엇을 하는 서비스인가

사업자 정보 몇 가지만 입력하면 **받을 수 있는 지원사업**과 **지켜야 할 법정의무**, 그리고 **곧 사라질 자격**을 사용자가 묻기 전에 먼저 알려줍니다.

기존 서비스는 검색형입니다. 검색은 "무엇을 검색해야 하는지 아는 사람"만 쓸 수 있습니다. 임금명세서 교부 의무를 모르는 대표는 "임금명세서"를 검색하지 않습니다.

## AI를 어디에 두었는가

판정을 AI에게 맡기지 않았습니다. 자격을 잘못 판정하면 사용자는 과태료를 냅니다.

| 계층 | 담당 | 하는 일 |
|---|---|---|
| 비정형 → 정형 | Claude API | 공고 원문을 구조화 JSON으로 변환, 근거 문장 첨부 |
| 중복 판별 | Voyage 임베딩 | 두 기관에 중복 게시된 사업의 후보 추출 |
| 판정·계산 | `lib/engine` (순수 TS) | 자격 판정, 마감일, 자격 소멸, 인원 시뮬레이션, 서류 리드타임 |

엔진은 AI 없이 독립 동작하며 단위 테스트 116개가 붙어 있습니다. 엔진 코드에는 `react`·`next`·`@supabase` import가 없습니다.

## 화면

| 경로 | 내용 |
|---|---|
| `/onboarding` | 8단계 프로필 입력 · 데모 프로필 3종 |
| `/dashboard` | 가장 급한 항목 1건, 요약 숫자, 대상 사업, 곧 사라질 자격 |
| `/announcements` | 공고 목록 · 검색 · 정렬 · 필터 |
| `/grants` | 지원사업 판정함 (요건별 판정표 + 원문 근거) · 법정의무 탭 |
| `/grants/[id]/documents` | 준비서류 리드타임 역산 |
| `/tasks` · `/calendar` | 할 일 · 월간 캘린더 |
| `/expiring` | 곧 사라질 자격 (업력 · 대표자연령 · 직원수) |
| `/simulator` | 채용 시 생기는 의무와 사라지는 자격 |
| `/demo/parse` · `/demo/dedupe` | AI 파싱 스트리밍 · 중복 판별 |
| `/mypage` · `/about` | 프로필·알림·이력 · 데이터 출처·면책 |

## 시작하기

```bash
npm install
cp .env.example .env.local   # 키를 채운다
npm run dev                  # http://localhost:3000
```

`.env.local`이 비어 있어도 `DATA_MODE=seed`로 전체 화면이 동작합니다.

## 스크립트

| 명령 | 하는 일 |
|---|---|
| `npm run dev` · `build` · `start` | 개발 · 빌드 · 실행 |
| `npm test` | 엔진·후처리·시드 단위 테스트 |
| `npm run typecheck` · `lint` | 타입 검사 · 린트 |
| `npm run smoke` | 통합 스모크 (`-- --base <url>`로 배포본 검사) |
| `npm run seed:db` | 시드를 Supabase에 적재 (멱등) |
| `npm run seed:embed` | 시드 임베딩 생성 · 중복 임계값 검증 |
| `npm run db:check` | 스키마 점검 · 시드/Supabase 모드 판정 대조 |
| `npm run ingest` | 공고 수집 (`-- --maxFetch 30 --maxParse 5`) |
| `npm run law:verify` | 국가법령정보센터에서 조문 확인 후 시드 갱신 |
| `npm run licenses` | `public/licenses.json` 생성 |

## 데이터

| 저장 위치 | 무엇을 |
|---|---|
| Supabase (서버에서만 접근) | 지원사업 · 법정의무 · 서류 카탈로그, 임베딩, 중복 쌍, 수집 로그 |
| localStorage (`bridge:*:v1`) | 기업 프로필, 할 일, 알림 설정, 판정 이력 |

**기업 프로필은 서버로 전송되지 않습니다.** 판정은 브라우저에서 실행됩니다. 서버로 가는 사용자 입력은 AI 데모에 붙여넣은 공고 원문뿐입니다.

브라우저는 Supabase에 직접 접속하지 않으므로 `NEXT_PUBLIC_` 환경변수가 하나도 없습니다.

## 규정 준수

- 공고 수집은 공식 오픈 API만 사용합니다. 누리집 HTML을 긁지 않으며 `cheerio`·`puppeteer` 류 의존성이 없습니다.
- 2026-09-04부터 카탈로그는 **실수집 공고만** 노출합니다(사용자 결정). 합성 시드(`seed/programs.json`)는 `DATA_MODE=seed` 로컬 폴백과 테스트에만 쓰이며, Supabase에서는 삭제했습니다(백업은 스크래치에 보관). `PUBLIC_DEMO`는 더 이상 합성 필터로 동작하지 않습니다.
- 법정의무의 조문·시행일은 국가법령정보센터에서 확인한 값만 확정 표기하고, 미확인 항목에는 "확인 중" 배지를 답니다.
- 데이터 출처·면책·오픈소스 라이선스 고지는 `/about`에 있습니다.

## 스택

Next.js 16.3.4 (App Router, Turbopack) · React 19 · TypeScript 5 · Tailwind CSS v4 · Supabase (Postgres + pgvector) · Claude API · Voyage 임베딩 · Vitest

Node.js 20.9 이상이 필요합니다. 배포는 Node 24를 권장합니다.

## 문서

구현 명세는 `브릿지_PRD.md`에 있습니다. 디자인 원본은 `design/`에 참조용으로 보존되어 있으며 앱 코드에서 import하지 않습니다.

## AI 보조 기능 (Gemini)

판정은 여전히 `lib/engine`의 결정론적 코드가 한다. 아래 4가지는 그 결과를 **설명하고, 뼈대를 만들고, 숫자를 읽어주고, 질문하는** 보조 기능이다. 키는 `GEMINI_API`(서버 전용), 모델은 `GEMINI_MODEL`(기본 `gemini-3.6-flash`, 혼잡 시 3.7/3.8로 자동 폴백, 사고 깊이 기본 low).

| 기능 | 화면 | API | 서버로 가는 것 | 서버로 안 가는 것 |
|---|---|---|---|---|
| 요건 코치 | 판정함 → 조건부·제외 카드 펼침 | `POST /api/ai/coach` | 공고 id, 요건 행(라벨·기준·원문·상태) | 회사의 현재 값, 프로필 |
| 신청서 뼈대 | 판정함·공고 목록 → "신청서 초안" → `/grants/[id]/draft` | `POST /api/ai/draft` (SSE) | 공고 id | 프로필 — `{{키}}` 치환은 브라우저에서 |
| 현금흐름 해설 | 사이드바 → 현금흐름 분석 `/cashflow` | `POST /api/ai/cashflow` | 월별 합계·상위 항목 집계 숫자 | 엑셀 파일, 개별 거래, 회사명·거래처명 |
| 대화형 온보딩(회원가입) | `/login` → "회원가입" → `/onboarding/chat`. 신규 가입은 대화로만 받고, 폼(`/onboarding?edit=1`)은 수정 전용 | `POST /api/ai/interview` | 대화 기록(저장·로그 없음) | — 추출값 저장은 localStorage에만 |

- 프롬프트: `lib/ai/geminiPrompts.ts` · 출력 스키마: `lib/ai/geminiSchemas.ts` · 클라이언트: `lib/ai/gemini.ts`
- 신청서 템플릿의 `{{company_name}}` 같은 프리필 키는 `lib/ai/prefill.ts`가 브라우저에서 프로필로 채운다. `[[ ]]`는 사용자가 쓸 빈칸.
- 현금흐름 집계는 `lib/engine/cashflow.ts`(순수 TS, 테스트 있음). 지원 레이아웃: `[날짜, 구분, 항목, 금액]` · `[날짜, 항목, 수입, 지출]` · `[날짜, 항목, 금액(부호)]`.
- 인터뷰 추출값은 `lib/ai/interviewCoerce.ts`가 코드표·날짜·범위를 검증한다. LLM 출력을 그대로 믿지 않는다.
- 대화형 온보딩은 사용자가 말한 회사 정보가 AI 응답 생성을 위해 서버를 **경유**한다(저장·로그 없음). 명세 §0.1-4 "프로필은 브라우저를 떠나지 않는다"의 예외이며, 화면에 고지했다. 폼 입력은 그대로 남아 있다.

## 진입 흐름 · 계정

`/` → `/login`. 아이디·비밀번호·사업자번호 세 가지가 모두 맞아야 로그인된다. `/signup`에서 같은 세 가지로 가입하면 바로 AI 대화(`/onboarding/chat`)로 넘어가 회사 정보를 만든다. 폼(`/onboarding?edit=1`)은 수정 전용이다.

- 계정 테이블: `supabase/migrations/0002_auth.sql` (`app_users`: login_id · scrypt 해시 · biz_no). **SQL Editor에서 한 번 실행해야 한다.**
- 세션: HMAC 서명 HttpOnly 쿠키 30일 (`AUTH_SECRET`). `/api/auth/me`는 서명만 검증하고 DB를 읽지 않는다.
- **계정 데이터 동기화**: 프로필·할 일·설정·이력·신청서 초안을 계정당 JSON 1행(`app_profiles`, `supabase/migrations/0003_profiles.sql`)으로 저장한다. 로그인하면 서버가 원본이 되어 localStorage에 내려받고, 이후 변경은 1.5초 모아 `PUT /api/sync`로 올린다(프로필은 즉시). 다른 계정이 같은 기기에 로그인하면 이전 계정의 사본은 지운다. 구현: `lib/store/sync.ts`.
- 이는 명세 §0.1-4("프로필은 브라우저를 떠나지 않는다")를 의도적으로 바꾼 것이다(2026-09-03, 사용자 결정: 로그인하면 어느 기기에서든 같은 화면). 판정은 여전히 브라우저에서 코드가 한다.
- 사업자번호는 형식(10자리)과 검증 숫자만 확인한다. 국세청 조회는 하지 않는다.
- API: `POST /api/auth/signup` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`. 로그인 시도는 IP당 분당 10회.

## 기업마당(bizinfo) 어댑터 — 실측 확인 (2026-09-03)

- 키: `BIZINFO_API_KEY` (기업마당 지원사업정보 API 인증키). 없으면 어댑터 비활성.
- 응답 `{ jsonArray: [...] }`, 기간 `reqstBeginEndDe`는 `2026-09-01 ~ 2026-10-02` 형식. `searchCnt` 1000까지, `searchLclasId`(분야) 필터 동작. `hashtags` 필터는 서버에서 걸러주지 않아 공고명 접두 `[경기]`로 수집기에서 거른다.
- 공고명 시도 접두를 코드가 `region_code` 조건으로 만든다(AI 추측 아님). 업력·연령은 기업마당에 없어 AI 추출에 맡긴다.
- 상세 링크는 API의 `pblancUrl`(`selectSIIA200Detail.do?pblancId=`)을 그대로 쓴다. 정상 열림 확인.

## 첨부파일 본문 발췌 (2026-09-04)

기업마당 공고의 예산·지원한도는 대개 API 요약(`bsnsSumryCn`)이 아니라 첨부 hwpx·pdf 안에만 있다. 그래서 "지원 규모 미기재"가 많았다.

- **규정 해석**: §0.1-5는 기관 누리집 크롤링을 금지한다. 여기서 받는 파일 링크는 기업마당 **공식 오픈 API JSON의 `printFlpthNm` 필드**가 직접 준 것이다. HTML을 파싱하지 않고 API가 준 파일을 그대로 받아 텍스트만 뽑는다. (판단이 다르면 `lib/ingest/attachment.ts` 호출을 끄면 된다.)
- 지원 형식: **hwpx**(zip 안 `Contents/section*.xml`의 `<hp:t>`), **pdf**(`pdf-parse` v2). 옛 이진 `.hwp`는 신뢰할 파서가 없어 건너뛴다. 표본 200건 기준 pdf 58% · hwpx 27% · hwp 16%.
- 저장: `programs.attachment_url`(수집 때), `programs.attachment_text`(파싱 때 한 번 뽑아 캐싱, 최대 6,000자). `raw_text`와 별도 컬럼이라 재수집 해시 비교에 영향이 없다. 마이그레이션 `supabase/migrations/0004_attachments.sql`.
- 실측: 장성군 소상공인 지원사업 — 첨부 없이 `amount_text: null` → 첨부 포함 `"최대 5백만 원"` + 지역·업력 조건 추출. 표본 20건 재파싱에서 12건에 지원규모가 채워졌다(나머지는 포상·상담회 등 금액이 없는 공고).
- **Vercel 주의**: `pdf-parse`(pdfjs)는 모듈 평가 때 브라우저 전역(`DOMMatrix`)을 찾고, 텍스트 추출 때 `pdf.worker.mjs`를 동적 import한다. 그래서 (1) 지연 로딩 + 최소 폴리필, (2) `serverExternalPackages`, (3) `outputFileTracingIncludes`로 워커 파일을 번들에 포함했다. 셋 중 하나라도 빠지면 `/api/ingest`가 500이 나거나 pdf만 조용히 실패한다.
- 진단: `GET /api/admin/attachment-test?url=…` (관리자 세션 또는 `Authorization: Bearer CRON_SECRET`). Claude를 부르지 않고 단계별(fetch/ext/extract) 결과를 돌려준다.
- 현금흐름 분석의 형식 문제는 AI에 숫자를 읽히지 않고 **수동 열 지정**(`parseCashTableManual`)으로 풀었다. 실제 양식(비즈폼·예스폼 현금출납장, 월간 현금흐름표, 디캠프·삼정KPMG 스타트업 자료)을 참고해 역할을 정했다.
  - 세로표(행=거래): 날짜 · 항목(적요·계정과목) · 구분 · **수입(여러 열)** · **지출(여러 열)** · 잔액(기초 잔액 역산) · ±금액(한 열). 항목 열이 없으면 열 이름이 항목이 된다(가계부형).
  - 가로표(열=월): 항목 · 기간(월, 여러 열) · 구분. "현금유입/현금유출" 소제목 행으로 수입/지출을 나누고 합계·순현금·기초/기말 행은 이중 계산을 피해 건너뛴다. 구분을 알 수 없는 행은 추측하지 않고 건너뛰며 알려준다.
  - 열 추측(`guessColumnRoles`)은 셀 값 형태(날짜/숫자/문자 비율)와 열 이름 단어만 보는 순수 계산이다. 사용자가 확인·수정한 뒤에만 반영된다.

## 사고 기록 — 2026-09-04 판정함 "대상" 급감

- **현상**: 야간 크론(#19)이 400건을 재수집하면서 449건 중 444건의 `parsed_at`이 비워졩고, 엔진의 "파싱 전 → 확인 필요" 규칙 때문에 판정함 대상이 5건 → 1건으로 줄었다. 자격 판정 로직의 오류는 아니었다.
- **조치**: 이전 파싱 결과(summary)가 남아 있는 165건은 `parsed_at`을 되살렸다(사용자가 결정하지 않은 기업마당 재파싱 대기열 90건은 유지).
- **재발 방지 (코드)**:
  1. `evaluate.ts`: "AI 파싱 전 → 확인 필요"는 **한 번도 파싱되지 않은**(summary 없음) 공고에만 적용. 재파싱 대기 중인 공고는 이전 결과로 판정한다.
  2. `run.ts`: 기존 행 조회를 100개씩 나누고 오류를 확인한다. 조회에 실패하면 그 런에서는 `parsed_at`을 건드리지 않는다. 변경 감지 해시는 공백·줄바꿈을 무시한다. 재파싱 큐로 되돌린 기존 행 수를 `ingest_runs.notes`에 남긴다.
  3. `vercel.json`: 크론을 출처별(21:00 K-Startup · 21:30 기업마당, 각 150건·파싱 5건)로 나눠 60초 안에 파싱 단계까지 돈다.
- **미확정**: 444건이 왜 "변경"으로 판정됐는지는 크론이 raw_text를 덮어쓴 뒤라 사후 확정하지 못했다. 위 1번 덕분에 같은 일이 다시 나도 판정함은 그대로 유지된다.
