# 「브릿지(Bridge)」 PRD v2.0 — AI 코딩 에이전트용 구현 명세

**초기 창업기업을 위한 푸시형 지원사업 · 법정의무 · 자격소멸 알리미**

| 항목 | 내용 |
|---|---|
| 문서 버전 | **v2.0** (2026-09-03) — v1.0 기획안을 전면 대체 (v1.0은 `docs/archive/브릿지_PRD_v1.0.md`에 보존) |
| 대회 | 2026 전남광주 청년 AI 솔버톤 / **B트랙 (기업 실무 현안)** |
| 연관 세부주제 | B-08 정부지원사업 공고 자동 분석 (확장·재해석: 법정의무 + 자격 소멸 예측 + 인원 시뮬레이션) |
| 팀 / 참가자 | 코스모스 / 이승민 |
| 저장소 | 로컬 폴더 `bridge/` — Next.js **16.3.4** · React 19.2.8 · Tailwind CSS **v4** · TypeScript 5 (create-next-app 스캐폴드 상태) |
| 산출물 | 웹 서비스 (Vercel 공개 URL, **합성 더미데이터만 게시**) |
| 이 문서의 독자 | 이 저장소에서 코드를 작성하는 **AI 코딩 에이전트**(Claude Code 등). 사람이 읽어도 되지만 문장은 에이전트 기준으로 씀 |

---

## 0. 이 문서를 읽는 AI에게 (READ FIRST)

### 0.1 절대 규칙 — 위반 시 작업을 멈추고 사람에게 보고

1. **LLM은 판단하지 않는다.** 자격 판정·마감일 계산·인원 임계값 판단·법령 해석은 `lib/engine/*`의 **결정론적 코드**만 수행한다. LLM(Claude)의 역할은 §7의 "비정형 공고문 → 정형 JSON 변환" 하나로 한정한다.
2. **디자인은 확정됐다.** `design/BridgePage.tsx`와 `design/globals.css`가 시각 디자인의 원본이다. 색·간격·타이포·컴포넌트 구조·문구 톤을 바꾸지 않는다. 바꾸는 것은 (a) 하드코딩 데이터 → 실제 데이터 소스, (b) 상태 관리·라우팅, (c) §4.5에 열거된 버그 수정, (d) §8에서 명시적으로 허용한 추가 화면·요소만이다.
3. **API 키는 서버에서만.** Route Handler · 서버 컴포넌트 · `scripts/*`에서만 읽는다. `NEXT_PUBLIC_` 접두어가 없는 환경변수를 클라이언트 컴포넌트에서 참조하지 않는다. `.env.local`의 값을 로그·응답·커밋에 절대 노출하지 않는다.
4. **기업 프로필은 브라우저 밖으로 나가지 않는다.** 사용자가 입력한 프로필·할 일·설정·판정 이력은 `localStorage`에만 저장하고, 판정 엔진은 클라이언트에서 실행한다. 서버로 가는 사용자 입력은 `/api/ai/parse`에 붙여넣은 **공고 원문**(프로필 아님)과 `/api/ai/dedupe`의 비교 대상 텍스트뿐이다.
5. **수집은 공식 오픈 API만.** K-Startup(공공데이터포털)·기업마당 API 외에 기관 누리집 HTML을 스크래핑하는 코드를 작성하지 않는다(대회 규정). `cheerio`·`puppeteer` 류를 공고 수집 목적으로 설치하지 않는다.
6. **공개 배포는 합성 데이터만.** `PUBLIC_DEMO=true`이면 `is_synthetic = true`인 카탈로그만 노출한다. 실 수집(라이브) 데이터는 로컬/개발 환경 전용이다.
7. **판정은 항상 3-state.** `eligible | ineligible | needs_check`. 프로필 값이 `null`이거나 조건의 `field`가 매핑되지 않으면 `needs_check`다. 절대 `ineligible`로 떨어뜨리지 않는다.
8. **법령 수치는 확인된 것만 확정 표기.** 시드의 조문·기한·과태료는 `legal_checked_at`이 기록된 항목만 확정으로 보이고, 미확인 항목은 "확인 중" 배지를 단다. 빈칸을 AI가 추정으로 채우지 않는다.
9. **Next.js 16은 학습 데이터와 다르다.** 코드 작성 전 `AGENTS.md`와 `node_modules/next/dist/docs/01-app/`을 읽는다. §2.1의 요약만 믿지 말고 원문을 확인한다.
10. **범위를 넓히지 않는다.** 막히면 §13.3 비범위를 확인한다. Phase N의 완료 기준(§11)을 충족하기 전에 Phase N+1을 시작하지 않는다.

### 0.2 작업 시작 체크리스트

```bash
# 1) 프레임워크 사실 확인
cat AGENTS.md
ls node_modules/next/dist/docs/01-app/

# 2) 환경변수는 "키 이름만" 확인 (값 출력 금지)
grep -vE '^\s*(#|$)' .env.local | cut -d= -f1

# 3) 스캐폴드가 도는지 확인
npm install && npm run dev   # http://localhost:3000

# 4) 디자인 원본 전체 읽기 (1,708행) → §4.2 분해 계획과 대조
#    design/BridgePage.tsx, design/globals.css

# 5) §11 Phase 0부터 시작. Phase별 완료 기준을 체크한 뒤 다음 Phase로.
```

### 0.3 v1.0 → v2.0 핵심 변경 요약 (상세: 부록 D)

| 영역 | v1.0 | v2.0 |
|---|---|---|
| 화면 | 온보딩 / 통합 타임라인 / 사업 상세 / 의무 상세 (4 P0) | **실제 디자인의 사이드바 8화면** + 신규 4화면(온보딩 · 서류 리드타임 · AI 파싱 데모 · 중복제거 데모) + `/about` |
| 스택 | Next.js 14 | **Next.js 16.3.4** (Turbopack 기본, `params` await, `proxy.ts`, `next lint` 제거) |
| 저장 | Supabase에 모든 것 | **카탈로그 = Supabase(pgvector)** / **사용자 상태 = localStorage**로 분리. `DATA_MODE=seed`면 Supabase 없이도 P0 동작 |
| AI 파싱 | 프롬프트 + JSON.parse 재시도 | Claude **structured outputs**(JSON Schema 강제) + zod 검증 |
| 임베딩 | "임베딩 모델" 미정, 1536차원 | **Voyage `voyage-4`, 1024차원**, pgvector HNSW cosine |
| 엔진 | evaluate + nextDueDate | + **expiry**(자격 소멸 D-day) + **simulate**(인원 변화 diff) + **leadTime**(서류 역산) + near-miss(조건부) 판정 |
| 환경변수 | 미정 | 실제 `.env.local` 현황 반영. 기업마당 키 미발급 → 어댑터 비활성이 기본값 |

---

## 1. 제품 개요

### 1.1 한 줄 정의

> 사업자 정보 몇 가지만 입력하면, **받을 수 있는 지원사업**과 **지켜야 할 법정의무**, 그리고 **곧 사라질 자격**을 사용자가 묻기 전에 먼저 밀어주는(push) 웹 서비스.

### 1.2 문제 정의 (심사 "문제 정의 적절성" 25점의 근거)

- 기업마당·K-Startup 등 기존 서비스는 **검색형(pull)**이다. 검색은 "무엇을 검색해야 하는지 아는 사람"만 쓸 수 있다.
- 초기 창업자의 진짜 문제는 **"모르는 것을 모른다"**는 것이다. 임금명세서 교부 의무를 모르는 대표는 "임금명세서"를 검색하지 않는다.
- **비용 비대칭**: 지원사업을 놓치면 기회손실(인지도 높음), 법정의무를 놓치면 과태료·가산세라는 **실손실**(인지도 낮음). 기존 서비스는 전자만 다룬다.
- **자격은 시간이 지나면 사라진다.** 업력 3년, 대표자 만 39세, 상시근로자 5인 미만 같은 조건은 달력과 채용 한 번으로 소멸한다. 이를 미리 알려주는 서비스는 없다.
- **채용 한 번에 두 축이 동시에 바뀐다.** 5인·10인·30인 구간을 넘으면 새 법정의무가 생기고 일부 지원 자격이 사라진다. 뽑기 전에 알아야 한다.

### 1.3 타깃 사용자

| 축 | 조건 |
|---|---|
| 업력 | 약 3년 내외 (최대 7년까지 유효한 판정) |
| 규모 | 상시근로자 10인 미만 |
| 지역 | 광주·전남 우선, 데이터 구조는 전국 확장 가능 |
| 특징 | 대표가 영업·회계·인사를 겸업, 전담 경영지원 인력 없음 |

### 1.4 데모 시나리오 (발표 동선 5분 — 이 흐름이 끊기지 않는 것이 P0의 정의)

| # | 화면 | 보여주는 것 | 심사 항목 |
|---|---|---|---|
| 1 | S0 온보딩 | "데모 프로필 불러오기 → ② 광주 제조업 1인 (첫 채용 예정)" 선택 → 8단계 입력 없이 대시보드 진입. 또는 직접 입력 2분 | 발표·공감도 |
| 2 | S1 대시보드 | 상단 배너에 **가장 급한 항목 1건**(두 축 통합 계산), 요약 숫자 3개, 받을 수 있는 지원사업 / 곧 사라질 자격 / 오늘 할 일 | 문제 정의 |
| 3 | S3 판정함 | "대상" 카드의 **요건별 판정표** 펼침 → 각 행에 공고 **원문 근거 문장**. "조건부" 항목 → "상시근로자 5인 이상 조건 — 현재 0인. 5명 충원 시 자격 충족" | AI 활용도·구현성 |
| 4 | S7 직원 시뮬레이터 | 슬라이더 0 → 5인: **새로 생기는 법정의무**와 **사라지는 지원 자격**이 한 화면에 동시에 나타남 (하이라이트) | 창의성 |
| 5 | S9 준비서류 리드타임 | 마감 D-9인데 중소기업확인서 발급 최대 20일 → "지금 신청해도 마감 초과" 경고와 다음 회차 안내 | 실무 적용성 |
| 6 | S10 AI 파싱 데모 | 공고 원문 붙여넣기 → Claude 스트리밍 → 구조화 JSON → `unmapped_conditions`("AI가 확신하지 못한 항목")까지 그대로 노출 → 즉시 내 프로필과 판정 | AI 활용도·구현성 |
| 7 | S11 중복제거 데모 | 기업마당 공고 ↔ K-Startup 공고 나란히, 유사도 ≥ 0.92, 기간 겹침 → 중복 병합 근거 | AI 활용도·구현성 |
| 8 | S8 마이페이지 → `/about` | 판정 이력, 알림 설정, 데이터 출처·면책·라이선스 고지 | 실무 적용성 |

---

## 2. 현재 상태 (As-Is) — 저장소 스냅샷 2026-09-03

### 2.1 저장소 구조와 스택

```
bridge/
├─ app/
│  ├─ globals.css      # create-next-app 기본 (Geist 폰트 토큰, dark 모드) → §4.4에서 교체
│  ├─ layout.tsx       # Geist/Geist_Mono, lang="en", LayoutProps<"/"> 사용 → §4.4에서 교체
│  ├─ page.tsx         # 스캐폴드 랜딩 → §4.3에서 리다이렉트 페이지로 교체
│  └─ favicon.ico
├─ public/             # next.svg 등 스캐폴드 아이콘 (삭제 가능)
├─ AGENTS.md           # `next dev`가 생성한 Next.js 16 경고 블록 (수정 금지, 자동 재생성됨)
├─ CLAUDE.md           # "@AGENTS.md" 한 줄
├─ .env.local          # §2.3 (gitignored)
├─ .gitignore          # ".env*" 포함 → .env.example 커밋을 위해 "!.env.example" 추가 필요
├─ eslint.config.mjs · next.config.ts(빈 설정) · postcss.config.mjs · tsconfig.json (paths "@/*" → "./*")
├─ package.json        # scripts: dev/build/start/lint("eslint")
└─ 브릿지_PRD.md       # 이 문서
```

**Next.js 16 핵심 차이 (에이전트가 자주 틀리는 것 — 원문은 `node_modules/next/dist/docs/`)**

| 항목 | Next.js 16.3.4에서의 사실 |
|---|---|
| 런타임 | Node.js **≥ 20.9** 필요. Vercel 배포는 Node **24.x** 지정 권장(Node 20은 2026-10-01 deprecated) |
| 빌드 | **Turbopack 기본**. `webpack` 커스텀 설정이 있으면 빌드 실패 |
| 동적 API | `params`, `searchParams`, `cookies()`, `headers()` 모두 **Promise → `await` 필수** (page/layout/route 전부) |
| Route Handler | `export async function GET(req: Request, ctx: RouteContext<'/api/programs/[id]'>) { const { id } = await ctx.params; }` — `RouteContext`·`PageProps`·`LayoutProps`는 **자동 생성 전역 타입**(import 불필요) |
| 미들웨어 | `middleware.ts` → **`proxy.ts`** (함수명 `proxy`, Node 런타임). 이 프로젝트는 필요 없음 |
| 린트 | **`next lint` 제거**. `npm run lint` = `eslint .`. `next build`는 린트를 실행하지 않음. `@next/next/no-img-element`는 **warn**(빌드 실패 아님) |
| 캐시 | `fetch`는 기본 비캐시. `cacheComponents`는 옵트인이며 이 프로젝트는 **켜지 않는다**. 세그먼트 `export const revalidate = 300` 사용 |
| 폰트 | `next/font/google` + Tailwind v4는 **`@theme inline { --font-sans: var(--font-xxx) }`** 패턴 (§4.4) |
| 문서 | `node_modules/next/dist/docs/01-app/{01-getting-started,02-guides,03-api-reference}` |

### 2.2 제공된 디자인 파일 (저장소에 `design/`으로 커밋)

| 파일 | 내용 |
|---|---|
| `design/BridgePage.tsx` | 1,708행 단일 클라이언트 컴포넌트. 사이드바 상태(`page`)로 8화면 전환. 모든 데이터 하드코딩(`grants` 8건, `allAnnouncements` 12건, `tasks` 6건, `expiringItems` 3건, `employeeRules` 5/10/30, `DEFAULT_COMPANY`) |
| `design/globals.css` | Tailwind v4 `@theme`: 폰트 3종(Noto Sans KR / Outfit / JetBrains Mono), brand 50~900(`#6e62c2` 계열), surface/card/ink/border 토큰, 스크롤바 |

**디자인의 8화면**

| Page id | 사이드바 라벨 | 컴포넌트 | 핵심 요소 |
|---|---|---|---|
| `dashboard` | 대시보드 | `Dashboard` | 인사말, "판정 완료" 배지, 경고 배너 1건, 숫자 카드 3(받을 수 있음/미완료 할 일/곧 소멸), 지원사업 3건, 곧 사라짐 목록, 오늘 할 일 3건 |
| `announcements` | 공고 목록 | `AnnouncementsPage` | 검색, 정렬(마감임박/적합도/최신), 상태 필터(접수중/마감임박/마감), 분야 필터(창업/R&D/수출/고용/금융), "우리 기업 대상만" 토글, 카드 목록 |
| `grants` | 지원사업 판정함 | `GrantsPage` | 탭(지원사업/법정의무). 대상 카드(상세·요건표 토글·정보 그리드·신청/원문 버튼), 기타(조건부/제외) 접이식 리스트, 법정의무 리스트 |
| `tasks` | 오늘 할 일 | `TasksPage` | 필터(전체/날짜형/이벤트형), 항목 추가·수정·삭제·완료 토글, 과태료 뱃지 |
| `expiring` | 곧 사라짐 | `ExpiringPage` | D-day 카드(60/90일 색 구분), 축(업력/대표자연령/직원수), 소멸 사유, "지금 신청하기" |
| `calendar` | 캘린더 | `CalendarPage` | 월간 그리드, 날짜 선택 사이드 패널(추가/수정/삭제), 중요 법정의무 목록, 월 통계 |
| `simulator` | 직원 시뮬레이터 | `SimulatorPage` | 현재/시뮬레이션 인원, 슬라이더(1~50), 5/10/30 버튼, 새 의무 / 사라지는 자격 2열 |
| `mypage` | 마이페이지 | `MyPage` | 프로필 보기/수정(업종·지역·개업일·사업자번호·직원수·대표자연령), 알림 채널·항목 토글, 판정 이력, 계정 관리 |

### 2.3 환경변수 현황 (`.env.local`, 키 이름만 — 값은 절대 출력·커밋하지 않는다)

| 키 | 용도 | 상태 | 비고 |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Claude 공고 파싱 (§7.1) | ✅ 있음 | 서버 전용 |
| `VOYAGE_API_KEY` | Voyage 임베딩 → 중복제거 (§7.2) | ✅ 있음 | 서버 전용 |
| `DATA_GO_KR_SERVICE_KEY` | 공공데이터포털 **Decoding** 키 → K-Startup API (§7.3) | ✅ 있음 | `URLSearchParams`로 붙일 때 사용 (자동 인코딩) |
| `DATA_GO_KR_SERVICE_KEY_ENCODED` | 같은 키의 **Encoding** 버전 | ✅ 있음 | URL 문자열에 직접 이어붙일 때만. **둘 중 하나만 쓴다** — 이중 인코딩 시 `SERVICE_KEY_IS_NOT_REGISTERED_ERROR`(코드 30) |
| `LAW_GO_KR_OC` | 국가법령정보센터 Open API 인증값(OC) → 법령 확인 **스크립트** (§7.4) | ✅ 있음 | 런타임 미사용. 호출 서버의 IP/도메인이 open.law.go.kr에 등록돼 있어야 함 |
| `BIZINFO_API_KEY` | 기업마당 지원사업정보 API `crtfcKey` (§7.3) | ❌ **미발급** | 비어 있으면 기업마당 어댑터는 자동 비활성. 발급 후 키만 넣으면 동작 |
| `SUPABASE_URL` / `SUPABASE_SECRET_KEY` | Supabase 카탈로그 (§3.4, §5.5). **브라우저는 Supabase에 직접 접속하지 않으므로 `NEXT_PUBLIC_` 변수가 없다** | ❌ 없음 | Phase 3에서 프로젝트 생성 후 추가. 없으면 `DATA_MODE=seed`로 동작 |
| `CRON_SECRET` | `/api/ingest` 보호 | ❌ 없음 | `openssl rand -hex 32`로 생성 |
| `ANTHROPIC_MODEL`, `VOYAGE_MODEL`, `DATA_MODE`, `PUBLIC_DEMO`, `INGEST_ENABLED`, `AI_MOCK` | 선택 (부록 A 기본값) | — | |

### 2.4 아직 없는 것 (이 PRD가 만들 것)

라우팅·앱 셸, 디자인 컴포넌트의 파일 분해, 도메인 타입, 룰/스케줄/소멸/시뮬레이션/리드타임 엔진과 테스트, Supabase 스키마·시드·RPC, K-Startup/기업마당 수집 어댑터, Claude 파싱·Voyage 임베딩 모듈, 신규 화면 4개 + `/about`, `.env.example`, 시드 데이터(프로그램 23/의무 22/서류 12/프로필 3/원문 3), Vercel 배포 설정.

---
## 3. 아키텍처

### 3.1 AI 역할 경계 — 3계층 분리 (★ 심사 발표의 핵심 논리)

| 계층 | 담당 | 무엇을 하나 | 왜 여기에 두나 |
|---|---|---|---|
| ① 비정형 → 정형 | **Claude API** (structured outputs) | 공고 원문 텍스트를 `ParsedAnnouncement` JSON으로 변환. 각 조건에 **근거 원문 문장(`source_text`)** 첨부. 매핑 불가 조건은 `unmapped_conditions`로 분리 | "사람이 읽어야 했던 문서를 기계가 읽게 바꾸는 일" — LLM의 본령 |
| ② 중복 판별 | **Voyage 임베딩 + pgvector** | 기업마당·K-Startup에 중복 게시된 동일 사업을 코사인 유사도로 후보 추출 | 의미 기반 비교가 필요. 단, 최종 병합 결정은 결정론(임계값 + 기간 겹침) |
| ③ 판정·계산 | **결정론적 엔진** (`lib/engine`) | 자격 판정(3-state), 마감일·D-day, 자격 소멸 예측, 인원 시뮬레이션, 서류 리드타임 역산 | 오판이 곧 사용자 손실(기회 상실·과태료). 검증 가능·테스트 가능해야 함 |

> **발표 문장:** "AI가 자격을 잘못 판정하면 사용자는 과태료를 냅니다. 그래서 브릿지는 AI를 '읽는 역할'에만 배치하고, '판단하는 역할'은 단위 테스트가 있는 코드에 맡깁니다. 룰 엔진은 AI 없이도 독립 동작합니다."

### 3.2 시스템 구성

```
┌────────────────────── 브라우저 (클라이언트) ──────────────────────┐
│  localStorage: profile · tasks(done/custom) · settings · history  │
│  ┌──────────────┐   ┌──────────────────────────────────────────┐  │
│  │ 8 + 4 화면    │◀──│ lib/engine (evaluate·schedule·expiry·    │  │
│  │ (design 기반) │   │  simulate·leadTime) — 순수 TS, 클라이언트 │  │
│  └──────┬───────┘   └───────────────▲──────────────────────────┘  │
│         │ 카탈로그(props/context)     │ 프로필(local)                │
└─────────┼─────────────────────────────┼───────────────────────────┘
          │ RSC 렌더 시 주입                │ 서버로 전송 안 함
┌─────────▼──────────── Next.js 16 (Vercel, Node 24) ───────────────┐
│  app/(app)/layout.tsx ── getRepository().loadCatalog()             │
│  /api/ai/parse (POST, SSE)  → Claude structured outputs            │
│  /api/ai/dedupe (POST)      → Voyage embed + cosine (+ pgvector)   │
│  /api/ingest (GET, Bearer CRON_SECRET) → 수집 파이프라인 1회 실행    │
│  lib/data/repository.ts ── DATA_MODE=seed | supabase               │
└──────┬───────────────┬───────────────┬────────────────────────────┘
       │               │               │
  seed/*.json     Supabase Postgres   외부 API (서버에서만 호출)
  (합성 데이터)    + pgvector(1024)     · apis.data.go.kr  K-Startup 공고
                  programs·obligations · bizinfo.go.kr    기업마당 (키 미발급→off)
                  document_types·      · api.anthropic.com Claude
                  dedupe_pairs·        · api.voyageai.com  Voyage
                  ingest_runs          · law.go.kr        (scripts/verify-law.ts 전용)
```

### 3.3 데이터 흐름

1. **수집** (`scripts/ingest.ts` 또는 `/api/ingest`): K-Startup API(및 키 발급 시 기업마당) → `RawAnnouncement` 정규화 → `programs`에 `(source, source_id)` 기준 upsert (`raw_text` 저장, `review_status='ai_draft'`).
2. **파싱**: `parsed_at IS NULL`인 행 → Claude structured outputs → `eligibility`(ConditionGroup) · `unmapped_conditions` · `required_documents` 저장.
3. **임베딩·중복제거**: `title + organization + amount_text + summary` → Voyage(`voyage-4`, 1024) → `embedding` 저장 → `match_programs` RPC top-5 → 유사도 ≥ 0.92 **AND** 접수기간 겹침 → 늦게 수집된 쪽에 `duplicate_of` 설정, `dedupe_pairs` 기록.
4. **서빙**: `(app)/layout.tsx`(서버 컴포넌트)가 카탈로그(`programs` canonical만 + `obligations` + `document_types`)를 로드해 `CatalogProvider`로 주입. `revalidate = 300`.
5. **판정** (클라이언트): `useProfile()`의 프로필 + 카탈로그 → `lib/engine` → 화면 뷰모델(§5.4). 프로필 저장 시 `history`에 판정 이력 추가.

### 3.4 저장 전략 (결정 사항 — 흔들지 말 것)

| 데이터 | 저장 위치 | 이유 |
|---|---|---|
| 지원사업·법정의무·서류 카탈로그, 임베딩, 중복 쌍, 수집 로그 | **Supabase** (Postgres + pgvector). 접근은 **서버에서만** `SUPABASE_SECRET_KEY`로(브라우저 직접 접속 없음 → `NEXT_PUBLIC_` 키 없음). RLS는 방어선으로 anon에 합성 데이터 읽기만 허용 | 공유·누적되는 공개 데이터. pgvector로 중복제거 |
| 기업 프로필, 할 일 완료/커스텀 항목, 알림 설정, 판정 이력 | **localStorage** (`bridge:*:v1`) | 사용자 개인 데이터를 서버에 남기지 않음(회원가입 없음 · "실제 기업 데이터 미게시" 규정 부합 · 발표 시 신뢰 논거) |
| `DATA_MODE=seed` | `seed/*.json`을 서버에서 직접 읽음 | Supabase 준비 전에도 P0 전체가 동작해야 함. `SUPABASE_URL`이 없으면 자동 seed |
| P2 (선택) | Supabase 익명 인증으로 프로필 동기화 | 이번 산출물 범위 밖 |

### 3.5 목표 디렉터리 구조

```
bridge/
├─ app/
│  ├─ layout.tsx                 # 폰트·lang="ko"·메타데이터 (§4.4)
│  ├─ globals.css                # design/globals.css 기반 (§4.4)
│  ├─ page.tsx                   # "/" → 프로필 있으면 /dashboard, 없으면 /onboarding (클라이언트 리다이렉트)
│  ├─ onboarding/page.tsx        # S0 (앱 셸 없음)
│  ├─ about/page.tsx             # S12 컴플라이언스 (앱 셸 없음, 정적)
│  ├─ (app)/
│  │  ├─ layout.tsx              # 서버: 카탈로그 로드 → <AppShell> (사이드바 + main)
│  │  ├─ dashboard/page.tsx      # S1  … 각 page.tsx는 해당 Screen 컴포넌트를 렌더할 뿐
│  │  ├─ announcements/page.tsx  # S2
│  │  ├─ grants/page.tsx         # S3
│  │  ├─ grants/[id]/documents/page.tsx  # S9 (신규)
│  │  ├─ tasks/page.tsx          # S4
│  │  ├─ expiring/page.tsx       # S5
│  │  ├─ calendar/page.tsx       # S6
│  │  ├─ simulator/page.tsx      # S7
│  │  ├─ mypage/page.tsx         # S8
│  │  └─ demo/parse/page.tsx · demo/dedupe/page.tsx   # S10 · S11 (신규)
│  └─ api/
│     ├─ ai/parse/route.ts       # POST, SSE 스트리밍
│     ├─ ai/dedupe/route.ts      # POST
│     ├─ programs/route.ts · programs/[id]/route.ts   # GET (외부 연동·디버그용)
│     ├─ ingest/route.ts         # GET (Vercel Cron, Bearer CRON_SECRET)
│     └─ health/route.ts
├─ components/
│  ├─ shell/  AppShell.tsx · Sidebar.tsx · Icons.tsx
│  ├─ ui/     Img.tsx · CutoutFrame.tsx · TaskForm.tsx · MiniForm.tsx · Disclaimer.tsx
│  └─ screens/ DashboardScreen.tsx · AnnouncementsScreen.tsx · GrantsScreen.tsx · TasksScreen.tsx
│               ExpiringScreen.tsx · CalendarScreen.tsx · SimulatorScreen.tsx · MyPageScreen.tsx
│               OnboardingScreen.tsx · DocumentsScreen.tsx · ParseDemoScreen.tsx · DedupeDemoScreen.tsx
├─ lib/
│  ├─ types.ts                   # §5 도메인 타입 (단일 출처)
│  ├─ constants.ts               # 지역·업종·분야 코드표, 색 임계값
│  ├─ engine/  evaluate.ts · schedule.ts · expiry.ts · simulate.ts · leadTime.ts · dedupe.ts · alerts.ts · format.ts
│  │           __tests__/*.test.ts
│  ├─ ai/      claude.ts · voyage.ts · prompts.ts · schema.ts (JSON Schema + zod) · postprocess.ts · __tests__/
│  ├─ ingest/  kstartup.ts · bizinfo.ts · normalize.ts · run.ts
│  ├─ data/    repository.ts · seedRepository.ts · supabaseRepository.ts · supabase.ts
│  ├─ store/   ProfileProvider.tsx · TasksProvider.tsx · SettingsProvider.tsx · HistoryProvider.tsx · CatalogProvider.tsx · storage.ts
│  │           hooks.ts  # useProfile · useCompany · useCatalog · useVerdicts · useExpiring · useTasks · useCalendarTasks · useSettings · useHistory
│  ├─ view/    toGrant.ts · toAnnouncement.ts · toTasks.ts · toExpiring.ts · toCompany.ts   # 엔진 결과 → 디자인 뷰모델
│  └─ fixtures/ design.ts   # Phase 0 임시(디자인 상수) — Phase 2에서 삭제
├─ seed/       programs.json · obligations.json · document_types.json · profiles.json · dedupe_pairs.json · announcements/*.txt · parsed/*.json(AI_MOCK용) · embeddings.json(생성물)
├─ scripts/    ingest.ts · seed-db.ts · embed-seed.ts · verify-law.ts · licenses.ts · smoke.ts
├─ supabase/   migrations/0001_init.sql
├─ design/     BridgePage.tsx · globals.css   # 원본 보존 (import 금지, 참조용)
├─ docs/       archive/브릿지_PRD_v1.0.md
├─ .env.example · vercel.json · vitest.config.ts
```

---

## 4. 프론트 디자인 통합 지시 (Phase 0)

### 4.1 원칙

- `design/BridgePage.tsx`는 **참조용 원본**이다. 앱 코드에서 import하지 않는다. 컴포넌트를 `components/`로 **복사·분해**하고, 이후 원본은 건드리지 않는다.
- 분해 시 **JSX와 className을 그대로 옮긴다.** 허용되는 변경: 데이터 소스(props/hook), 이벤트 핸들러 연결, 라우팅(`<button onClick={() => setPage(..)}>` → `<Link href>` 또는 `router.push`), §4.5 버그 수정, §8에서 명시한 추가 요소.
- 새로 만드는 화면(S0·S9·S10·S11·S12)은 디자인 토큰만 사용한다: 배경 `bg-white`/`bg-[#F5F6F8]`, 테두리 `border-[#E4E6EA]`, 브랜드 `#6E62C2`(hover `#5a50a8`, 연한 배경 `#f0eef9`, 테두리 `#dddaf4`), 텍스트 `#111111`/`#444444`/`#888888`, 성공 `#EEF4F0`/`#B2D1BF`/`#2A5A46`/`#3D7260`, 경고 `amber-*`, 위험 `rose-*`, 카드 `rounded-2xl`, 헤더 `text-2xl font-display font-bold`, 본문 `text-sm`, 보조 `text-xs text-[#888888]`, 숫자·날짜 `font-mono`.
- 다크 모드는 지원하지 않는다(스캐폴드의 `prefers-color-scheme` 블록 삭제).

### 4.2 파일 분해 매핑

| 원본 (design/BridgePage.tsx) | 행 범위(대략) | 목적지 | 비고 |
|---|---|---|---|
| 타입 `Page, GrantStatus, EligibilityCriteria, Grant, Task, ExpiringItem, Announcement*` | 5–47, 117–130 | `lib/types.ts` (§5.4 뷰모델로 확장) | 디자인 타입은 유지하되 필드 추가만 |
| `DEFAULT_COMPANY`, `grants`, `tasks`, `allAnnouncements`, `expiringItems`, `employeeRules` | 51–151, 1178–1191 | **삭제** → `seed/*.json` + 엔진 계산 | 디자인의 값은 시드 프로필 ①의 기대 결과로 재사용(§10) |
| `PHOTOS` | 156–165 | `lib/constants.ts` | Unsplash URL 유지. P2: `/public/photos/`로 내려받기 |
| 아이콘 8종 | 169–176 | `components/shell/Icons.tsx` | + `SparklesIcon`(AI 파싱), `LayersIcon`(중복 판별), `FileCheckIcon`(서류) 동일 스타일(16×16, stroke 1.5)로 추가 |
| `Img`, `CutoutFrame` | 180–202 | `components/ui/` | `Img`에 `// eslint-disable-next-line @next/next/no-img-element` |
| `Sidebar` | 206–278 | `components/shell/Sidebar.tsx` | `page/setPage` → `usePathname()` + `<Link>`. 배지는 `useCatalog()/useVerdicts()/useTasks()/useExpiring()`에서 계산. 푸터 문구 §4.5-3 + `/about` 링크(허용된 추가) |
| `Dashboard` | 282–395 | `components/screens/DashboardScreen.tsx` | 배너·숫자·목록 전부 엔진 결과 |
| `GrantsPage` + `statusLabel/statusStyle` | 399–641 | `components/screens/GrantsScreen.tsx` | 법정의무 탭은 공유 `useTasks()` 사용(§4.5-4) |
| `TasksPage` + `EMPTY_DRAFT` | 645–824 | `components/screens/TasksScreen.tsx` | `FormRow`·`TaskForm`을 **모듈 최상위**로 호이스팅(§4.5-2) → `components/ui/TaskForm.tsx` |
| `parseDate/fmtDate/DAYS`, `CalendarPage` | 828–1103 | `lib/engine/format.ts`, `components/screens/CalendarScreen.tsx` | `MiniForm` 호이스팅 → `components/ui/MiniForm.tsx` |
| `ExpiringPage` | 1107–1174 | `components/screens/ExpiringScreen.tsx` | 하단 "판정 기준" 문구는 유지 |
| `SimulatorPage` | 1193–1317 | `components/screens/SimulatorScreen.tsx` | `employeeRules` → `simulateEmployees()` 결과 |
| `AnnouncementsPage` + 라벨/색 맵 | 1321–1464 | `components/screens/AnnouncementsScreen.tsx` | 정렬 로직 §4.5-7 |
| `MyPage` | 1470–1683 | `components/screens/MyPageScreen.tsx` | 계정 관리 블록 → 데이터 관리(§8 S8) |
| `BridgePage` 루트 | 1687–1707 | `components/shell/AppShell.tsx` + `app/(app)/layout.tsx` | `main`의 overflow 클래스는 `pathname === '/calendar'` 조건 유지 |

### 4.3 라우팅

| 디자인 `Page` id | 경로 | 사이드바 |
|---|---|---|
| `dashboard` | `/dashboard` | 대시보드 |
| `announcements` | `/announcements` | 공고 목록 (배지: 카탈로그 건수) |
| `grants` | `/grants` | 지원사업 판정함 (배지: `pass` 건수) |
| `tasks` | `/tasks` | 오늘 할 일 (배지: 미완료) |
| `expiring` | `/expiring` | 곧 사라짐 (배지: `expiresIn ≤ 90`) |
| `calendar` | `/calendar` | 캘린더 |
| `simulator` | `/simulator` | 직원 시뮬레이터 |
| (신규) | `/demo/parse` | **공고 AI 파싱** — "AI 데모" 소제목 아래 |
| (신규) | `/demo/dedupe` | **중복 공고 판별** — "AI 데모" 소제목 아래 |
| `mypage` | `/mypage` | 마이페이지 |
| (신규) | `/onboarding` | 사이드바 없음 |
| (신규) | `/grants/[id]/documents` | 사이드바 있음, 메뉴 항목 없음 (판정함 카드의 "준비서류 확인" 버튼으로 진입) |
| (신규) | `/about` | 사이드바 푸터의 "데이터 출처·면책" 링크 |
| `/` | 클라이언트 리다이렉트 | 프로필 있음 → `/dashboard`, 없음 → `/onboarding` |

- 사이드바 nav 배열에 "AI 데모" 그룹을 `simulator` 뒤, `mypage` 앞에 넣는다. 그룹 소제목은 `text-[10px] font-semibold text-[#888888] uppercase tracking-wide px-3 pt-3 pb-1`.
- 활성 판정: `pathname === href || pathname.startsWith(href + '/')`.
- `(app)` 레이아웃은 프로필이 없으면 클라이언트에서 `/onboarding`으로 보낸다(`ProfileProvider`의 `isLoaded && !profile`). 로딩 중에는 디자인 톤의 스켈레톤(회색 `bg-[#F5F6F8]` 블록)만 표시하고 잘못된 리다이렉트를 하지 않는다.

### 4.4 폰트 · 글로벌 CSS · 루트 레이아웃

`app/layout.tsx`
- `next/font/google`에서 `Noto_Sans_KR`(variable, `subsets: ['latin']` — **`korean` 서브셋은 존재하지 않음**, 한글 글리프는 unicode-range로 자동 로드), `Outfit`(`subsets: ['latin']`), `JetBrains_Mono`(`subsets: ['latin']`)를 각각 `variable: '--font-noto-sans-kr' | '--font-outfit' | '--font-jetbrains-mono'`로 로드.
- `<html lang="ko" className={\`${notoSansKr.variable} ${outfit.variable} ${jetbrainsMono.variable} h-full antialiased\`}>`, `<body className="h-full font-sans text-ink bg-surface">`.
- `metadata`: title `브릿지 — 초기 창업기업 지원사업·법정의무 알리미`, description 1줄.
- 시그니처는 스캐폴드대로 `RootLayout({ children }: LayoutProps<"/">)` 유지.

`app/globals.css` — `design/globals.css`를 기반으로 다음만 수정
```css
@import "tailwindcss";

html, body { height: 100%; }

@theme {
  /* design/globals.css의 색 토큰 전부 그대로 (brand-50~900, surface, card, ink, ink-2, ink-3, border, border-2) */
}

@theme inline {
  /* 폰트는 next/font 변수 참조 → 반드시 inline */
  --font-sans: var(--font-noto-sans-kr), "Noto Sans KR", sans-serif;
  --font-display: var(--font-outfit), var(--font-noto-sans-kr), sans-serif;
  --font-mono: var(--font-jetbrains-mono), "JetBrains Mono", monospace;
}

/* 스크롤바 규칙은 design/globals.css 그대로 */
```
- 스캐폴드의 `:root { --background … }`, `@media (prefers-color-scheme: dark)`, `body { font-family: Arial … }`는 **삭제**한다(Arial 규칙이 남으면 Tailwind 폰트가 무시됨).
- `#__next` 선택자는 App Router에 없으므로 제거.

### 4.5 디자인 파일의 알려진 이슈 — 분해 시 반드시 수정

| # | 위치 | 문제 | 수정 |
|---|---|---|---|
| 1 | 298, 449, 519행 `bg-[#EEF4F0]0` | 잘못된 클래스(치환 실수). 점·체크 원이 투명하게 렌더됨 | `bg-[#3D7260]`로 교체 (성공 색 계열) |
| 2 | 681–735행 `FormRow`·`TaskForm`(TasksPage 내부), 895–915행 `MiniForm`(CalendarPage 내부) | 렌더마다 새 컴포넌트 타입이 생겨 **입력마다 리마운트 → 포커스 손실** | 모듈 최상위 컴포넌트로 호이스팅. `inputCls`/`selectCls`는 두 폼이 다르므로(`TaskForm`: `flex-1 … text-sm`, `MiniForm`: `w-full … text-xs`) 각 파일에 별도 상수로 이동 |
| 3 | 272–273행 사이드바 푸터 "판정 기준일 2026.09.03 / 공고 동기화 2시간 전", 295행 "2026.09.03 기준" | 하드코딩 날짜 | `today`(클라이언트 `new Date()`)와 카탈로그 메타(`syncedAt`)로 계산. seed 모드: "시드 데이터 기준 YYYY.MM.DD" |
| 4 | 410행 `const localTasks = tasks` (GrantsPage), 283–286행 Dashboard의 `tasks/grants/expiringItems` 직접 참조 | 공유 상태가 아니라 토글·추가가 반영되지 않음 | `useTasks()`, `useVerdicts()`, `useExpiring()` 훅 사용 |
| 5 | 307–308행 경고 배너 문구 | 하드코딩("초기창업패키지 자격이 55일 후 소멸됩니다") | `pickTopAlert()`(§6.7) 결과로 렌더. 없으면 배너 미표시 |
| 6 | 423, 612행 "테크스타트 주식회사 프로필 기준" | 하드코딩 회사명·"직원 4인, 업력 1년" | `company.name`, `company.employees`, `yearsOld` 보간 |
| 7 | 1363–1366행 정렬 | `deadline`이 상태 순서로만 정렬, `latest`가 id 순 | `deadline`: `apply_end` 오름차순(`is_rolling`은 뒤), `latest`: `created_at` 내림차순, `eligible`: pass > conditional > fail 후 `apply_end` |
| 8 | 546–551, 595(`<span>`), 1157, 1457행 버튼 | `신청 바로가기`·`공고 원문`·`원문 보기`·`지금 신청하기`에 핸들러 없음(595행은 `span`) | 모두 `apply_url ?? original_url`을 여는 `<a target="_blank" rel="noopener noreferrer">`로. URL 없으면 `aria-disabled` + 회색 처리 + `title="원문 링크 없음"` |
| 9 | 1178–1191행 `employeeRules` | 하드코딩 + **법적 사실 오류 포함**(취업규칙은 10인↑, 장애인고용부담금은 100인↑, 고용형태공시는 300인↑) | 삭제. `simulateEmployees()`가 카탈로그에서 계산(§6.4). 시드 임계값은 §10.5 참조표 기준 |
| 10 | 1498–1502행 `historyRows` | 하드코딩 | `useHistory()` (localStorage). 비어 있으면 "아직 이력이 없습니다" |
| 11 | 1667–1679행 계정 관리(비밀번호·이메일 변경·로그아웃) | 로그인 기능 없음(비범위) | 블록 제목을 **"데이터 관리"**로, 항목을 `데모 프로필 전환(3종)` · `내 데이터 내보내기(JSON)` · `프로필 초기화(rose)`로 교체. 스타일 동일 |
| 12 | 1652행 "엑셀 내보내기" | 미구현 | P1: 판정 이력 CSV 다운로드(`text/csv;charset=utf-8` + BOM). P0에서는 `disabled` |
| 13 | 175–176, 207, 647, 681, 840행 `React.ReactElement`·`React.ReactNode`·`React.Dispatch`·`React.SetStateAction` | `React` 네임스페이스 import 없이 사용(타입 위치라 컴파일은 되나 불명확) | `import type { ReactNode, ReactElement, Dispatch, SetStateAction } from "react"` |
| 14 | 1585–1596행 대표자 연령 `number` 입력 | 만 나이는 매년 변하고 "곧 사라짐" D-day 계산에 생년월일이 필요 | 저장 필드는 `ceo_birth_date`(YYYY-MM-DD). 편집 UI는 동일 스타일의 `<input type="date">`, 표시는 `만 {age}세` |
| 15 | 57행 `foundedDate: "2023.06.15"`, 59행 `yearsOld: 1` | 파생값 저장 + 값 불일치(2023.06 창업인데 업력 1년) | 저장은 `founded_at`(YYYY-MM-DD)만, `yearsOld`·`business_age_months`는 계산 |
| 16 | 전체 | 날짜 문자열 `YYYY.MM.DD`(표시)와 `YYYY-MM-DD`(저장) 혼용 위험 | 저장·비교·정렬은 ISO(`Task.dueDateIso`, `Program.apply_end` 등), 표시만 `fmtDate()`로 점 표기. 디자인이 그대로 렌더하는 `Task.dueDate`는 **표시 문자열**(날짜형은 점 표기, 이벤트형은 문구)로 유지하고 캘린더 매칭은 `dueDateIso`로 한다 |
| 17 | 953, 872, 1068–1076행 캘린더 "중요" 판정 | `t.penalty` 유무로 판정 — 시드는 모든 의무에 penalty가 있어 전부 "중요"가 됨 | `t.importance === 'high'`로 교체 (`Task.importance`, §5.4) |
| 18 | 타입 변경 파급 | 뷰모델 확장으로 `id: number → string`, `ExpiringItem.expiresIn: number → number \| null`, `Company.ceoAge: number → number \| null` | `key`·비교식을 문자열 id로. `expiresIn` 비교는 전부 `item.expiresIn !== null && item.expiresIn <= 60` 형태로; `null`이면 테두리 기본색·버튼 없음·D-day 자리에 `채용 시`(S1 대시보드 행 포함). `ceoAge === null` → `미입력` |
| 19 | 1433행 마감 카드 | `className`에 `border`만 있고 색이 없음(`closed`일 때 `border-[#E4E6EA]`가 빠짐) → Tailwind v4 기본 `currentColor` 테두리 | `border-[#E4E6EA]`를 조건과 무관하게 항상 포함 |
| 20 | 1327–1334행 `fieldColors` | `'기타'` 키 없음 → 카드 뱃지에 `undefined` 클래스 | `"기타": "bg-[#F5F6F8] text-[#444444] border-[#E4E6EA]"` 추가 |
| 21 | 284행 `conditionalCount` 등 미사용 변수, 라우팅 전환 후 남는 `page/setPage` props | `eslint-config-next`의 `no-unused-vars`로 §4.6 린트 게이트 실패 | 미사용 선언 제거 |
| 22 | 713, 906행 placeholder `"예: 2026.10.25"` | 연도 하드코딩 | `예: ${fmtDate(addDays(today, 30))}`로 생성 |
| 23 | 1228, 1235행·사이드바 241행 `업력 {yearsOld}년` | 업력 1년 미만이면 "업력 0년" | `yearsOld < 1`이면 `업력 {months}개월`로 표기(허용된 문구 변경) |

### 4.6 Phase 0 완료 기준

- `npm run dev`에서 `/dashboard` `/announcements` `/grants` `/tasks` `/expiring` `/calendar` `/simulator` `/mypage`가 **디자인과 픽셀 수준으로 동일**하게 렌더된다(데이터는 아직 `seed/*.json`을 직접 읽어도 됨).
- 사이드바 이동이 URL을 바꾸고 새로고침해도 같은 화면이 유지된다.
- 할 일 폼 입력 중 포커스가 유지된다(§4.5-2 검증).
- `npx tsc --noEmit`, `npm run lint` 통과(`no-img-element` warn만 허용).
- Noto Sans KR / Outfit / JetBrains Mono가 실제로 적용된다(개발자도구 computed font-family 확인).

---
## 5. 도메인 모델 (`lib/types.ts` — 타입의 단일 출처)

### 5.1 기업 프로필

```ts
export type Certification = 'venture' | 'innobiz' | 'mainbiz' | 'research_institute' | 'social_enterprise' | 'women_enterprise' | 'disabled_enterprise';

// 사용자가 입력·저장하는 값 (localStorage "bridge:profile:v1")
export interface CompanyProfile {
  id: string;                         // crypto.randomUUID()
  name: string;                       // "테크스타트 주식회사" (선택 입력, 없으면 "내 회사")
  biz_no: string | null;              // "234-86-01827" (선택, 표시용. 검증·조회 안 함)
  business_type: 'individual' | 'corporation';
  industry_code: string;              // KSIC 대분류+중분류, 예 "J62" (컴퓨터 프로그래밍·시스템 통합)
  industry_label: string;             // "소프트웨어 개발업"
  region_code: string;                // 시도 코드: "11" 서울 · "29" 광주 · "46" 전남 … (lib/constants.ts REGIONS)
  region_label: string;               // "광주광역시"
  founded_at: string;                 // "YYYY-MM-DD" (개업일. 미래 날짜 입력 차단)
  employee_count: number;             // 상시근로자 수 (대표 제외), 0 이상
  ceo_birth_date: string | null;      // "YYYY-MM-DD" (null → 연령 조건은 needs_check)
  ceo_gender: 'male' | 'female' | null;
  annual_revenue_krw: number | null;  // null = "모름" (needs_check)
  export_revenue_usd_prev_year: number | null;
  is_vat_exempt: boolean;
  certifications: Certification[];    // 'venture' | 'innobiz' | 'mainbiz' | 'research_institute' | 'social_enterprise' | 'women_enterprise' | 'disabled_enterprise'
  flags: {
    hiring_planned: boolean;          // 채용 예정 → 이벤트형 노무 의무 노출
    has_online_sales: boolean;        // 통신판매업 신고 축
    handles_personal_data: boolean;   // 개인정보처리방침 축
    is_food_business: boolean;        // 식품 영업신고 축
  };
  created_at: string;
  updated_at: string;
}

// 엔진이 조건과 대조하는 평탄화 뷰 — 파생값은 저장하지 않고 매번 계산
export interface FlatProfile {
  business_type: 'individual' | 'corporation';
  industry_code: string;              // "J62" — 조건은 대분류("J") 또는 중분류("J62")로 매칭 (prefix)
  region_code: string;
  founded_at: string;                 // 원본 날짜 (near-miss·소멸 날짜 메시지 계산용, 조건 필드로는 쓰지 않음)
  ceo_birth_date: string | null;      // 원본 날짜 (같은 용도)
  business_age_months: number;        // today - founded_at (월, 내림)
  employee_count: number;
  ceo_age: number | null;             // 만 나이 (오늘 기준)
  ceo_gender: 'male' | 'female' | null;
  annual_revenue_krw: number | null;
  export_revenue_usd_prev_year: number | null;
  is_vat_exempt: boolean;
  certifications: Certification[];
  hiring_planned: boolean;
  has_online_sales: boolean;
  handles_personal_data: boolean;
  is_food_business: boolean;
}

// 조건 필드별 메타 — near-miss 판정과 "곧 사라짐" 축 계산에 사용. 타입은 여기, 값은 lib/constants.ts
export type FieldMeta = Record<ConditionField, {
  label: string;                                   // "업력" | "직원 수" | "대표자 연령" …
  mutability: 'fixed' | 'mutable' | 'time' | 'acquirable';
  axis?: '업력' | '대표자연령' | '직원수';           // 소멸 축 (time/mutable 필드만)
}>;
export type ConditionField = Exclude<keyof FlatProfile, 'founded_at' | 'ceo_birth_date'>;   // Condition.field에 허용되는 키
// lib/constants.ts의 FIELD_META 값: business_age_months: time/업력 · ceo_age: time/대표자연령 · employee_count: mutable/직원수
// certifications: acquirable · 그 외(business_type, industry_code, region_code, ceo_gender, annual_revenue_krw,
// export_revenue_usd_prev_year, is_vat_exempt, hiring_planned, has_online_sales, handles_personal_data, is_food_business): fixed
```

### 5.2 지원사업(Program)과 조건 스키마

```ts
export type Operator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq' | 'in' | 'not_in' | 'includes';

export interface Condition {
  field: ConditionField;
  op: Operator;
  value: number | string | boolean | string[];
  label: string;         // 사용자에게 보여줄 요건 문구: "업력 3년 이상 7년 이하" (AI가 생성)
  source_text: string;   // 공고 원문에서 근거가 된 문장 그대로 ← 투명성의 핵심
}
export interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: (Condition | ConditionGroup)[];
}
export interface UnmappedCondition { text: string; reason: string; }   // AI가 필드에 매핑하지 못한 원문 조건

export type SupportField = '창업' | 'R&D' | '수출' | '고용' | '금융' | '내수' | '경영' | '기타';
// UI 필터는 디자인의 5개(창업/R&D/수출/고용/금융)를 그대로 두고, 나머지 3개는 "기타"로 묶어 6번째 필터 칩으로 노출

export interface Program {
  id: string;                          // uuid
  source: 'kstartup' | 'bizinfo' | 'local' | 'synthetic';
  source_id: string | null;            // K-Startup pbanc_sn · 기업마당 pblancId
  title: string;
  organization: string;                // 공고기관 (K-Startup pbanc_ntrp_nm · 기업마당 jrsdInsttNm)
  executing_org: string | null;
  support_field: SupportField;
  support_type: string | null;         // "사업화 자금 + 멘토링"
  amount_text: string | null;          // "최대 3억원"
  summary: string | null;              // ≤ 200자 (AI 요약)
  apply_start: string | null;          // YYYY-MM-DD
  apply_end: string | null;            // YYYY-MM-DD (is_rolling이면 null)
  is_rolling: boolean;                 // 상시 접수
  original_url: string | null;
  apply_url: string | null;
  eligibility: ConditionGroup;         // AI 생성 → 사람 검수
  unmapped_conditions: UnmappedCondition[];
  required_documents: ProgramDocument[];
  review_status: 'ai_draft' | 'human_verified';
  is_synthetic: boolean;               // 시드(합성) 여부 — 공개 배포는 true만 노출
  duplicate_of: string | null;         // canonical program id
  parsed_at: string | null;
  created_at: string;
  updated_at: string;
}

// 서버 전용 행 타입 — 클라이언트/뷰모델로 절대 내려보내지 않는다
export interface ProgramRow extends Program {
  raw_text: string | null; embedding: number[] | null; parse_model: string | null; parse_error: string | null;
}

export interface DocumentType {        // 서류 카탈로그 (사람이 확인해 입력, AI 추정 금지)
  id: string;                          // "sme_confirmation"
  name: string;                        // "중소기업확인서"
  issuer: string;                      // "중소기업현황정보시스템(sminfo)"
  lead_time_days: number | null;       // 20 · null = "소요기간 확인 필요"
  issue_url: string | null;
  verified_at: string | null;          // 소요기간 확인일
}
export interface ProgramDocument {
  document_type_id: string | null;     // 카탈로그 매칭 실패 시 null → leadTime 'unknown'
  name: string;                        // 공고 원문 표기
  source_text: string;
  is_required: boolean;
}
```

### 5.3 법정의무(Obligation)와 스케줄

```ts
export type ObligationCategory = 'labor' | 'tax' | 'permit' | 'privacy' | 'insurance';

export type ScheduleRule =
  | { type: 'monthly'; day: number }                                   // 원천세: 매월 10일
  | { type: 'quarterly'; months: number[]; day: number }               // 법인 부가세: [1,4,7,10] 25일
  | { type: 'semiannual'; months: number[]; day: number }              // 개인 일반과세 부가세: [1,7] 25일
  | { type: 'annual'; month: number; day: number }                     // 종합소득세: 5월 31일
  | { type: 'event_relative'; event: 'hire' | 'wage_payment' | 'business_start' | 'employee_leave' | 'threshold_reached';
      offset_days: number | null; label: string }                      // 4대보험 취득신고: hire +14일 · 근로계약서: hire +0 "채용 즉시"
  | { type: 'once'; date: string };

export interface Obligation {
  id: string;                          // "OBL-LABOR-001"
  category: ObligationCategory;
  title: string;                       // "원천세 신고·납부"
  what: string;                        // 무엇을 해야 하는가 (1문장)
  penalty: string;                     // "미신고 시 가산세 20%" (디자인 뱃지 문구)
  authority: string;                   // "국세청"
  legal_basis: { law_name: string; article: string; jo_code: string } | null;  // { "소득세법", "제128조", "012800" }
  legal_text_excerpt: string | null;   // verify-law.ts가 채움
  legal_checked_at: string | null;     // 확인일 — null이면 UI "확인 중" 배지
  how_to_url: string | null;
  applies_if: ConditionGroup;          // 이 프로필에 해당하는가 (예: employee_count gte 1)
  schedule: ScheduleRule;
  importance: 'high' | 'normal';       // high = 캘린더 "중요 법정의무" (penalty 있는 항목)
}
```

### 5.4 UI 뷰모델 — 디자인 타입을 유지하며 확장 (`lib/view/*`가 생성)

디자인의 `Grant · Announcement · Task · ExpiringItem · Company` 인터페이스는 **그대로 두고 필드만 추가**한다. 화면 컴포넌트는 이 뷰모델만 받는다.

```ts
export type GrantStatus = 'pass' | 'fail' | 'conditional';            // 디자인 유지
export interface EligibilityCriteria {                                 // 디자인 + 확장
  label: string; required: string; current: string; pass: boolean;
  state: 'pass' | 'fail' | 'check';                                    // check = needs_check (pass=false)
  sourceText: string;                                                  // 행 클릭 시 펼침
}
export interface Grant {                                               // 디자인 + 확장
  id: string; name: string; agency: string; amount: string; deadline: string; status: GrantStatus;
  failReason?: string; nearMissReason?: string; eligibility?: EligibilityCriteria[]; supportType?: string; description?: string;
  subStatus?: 'near_miss' | 'needs_check';                             // conditional의 사유 구분
  checkReasons?: string[];                                             // needs_check 목록 (unmapped 포함)
  originalUrl?: string; applyUrl?: string; reviewStatus: 'ai_draft' | 'human_verified'; hasDocuments: boolean;
}
export interface Announcement {                                        // 디자인 + 확장
  id: string; title: string; agency: string; field: SupportField | '기타'; amount: string;
  startDate: string; endDate: string;                                  // 표시용 "YYYY.MM.DD" | "상시"
  status: 'open' | 'closing' | 'closed'; eligible: boolean;
  verdict: GrantStatus; originalUrl?: string; createdAt: string; sortEnd: string | null;   // 정렬용 ISO
  dualListed?: boolean;                                                // 중복 병합된 canonical ("기업마당·K-Startup 동시 게시" 뱃지)
}
export interface Task {                                                // 디자인 + 확장
  id: string;                                                          // "OBL-TAX-001:2026-09-10" | "custom:<uuid>"
  title: string; type: 'date' | 'event'; dueDate: string; authority: string; penalty: string; done: boolean;
  obligationId?: string; dueDateIso?: string; legalCheckedAt?: string | null; howToUrl?: string | null;
  overdue?: boolean; importance?: 'high' | 'normal';                  // 캘린더 "중요 법정의무"는 importance === 'high' (디자인의 penalty 유무 대신 — §4.5-17)
}
export interface ExpiringItem {                                        // 디자인 + 확장
  id: string; grantName: string; expiresIn: number | null;             // null = 이벤트형(채용 시) 소멸
  reason: string; axis: '업력' | '대표자연령' | '직원수';
  programId: string; expiresOn: string | null; applyDeadline: string | null;
}
export interface Company {                                             // 디자인 유지 (toCompany(profile)가 생성)
  name: string; bizNo: string; sector: string; region: string; employees: number; foundedDate: string; ceoAge: number | null; yearsOld: number;
}
```

**매핑 규칙 (엔진 결과 → 뷰모델)**

| 엔진 결과 | `Grant.status` | 부가 필드 |
|---|---|---|
| `overall = eligible` | `pass` | `eligibility[]` 전 행 `state='pass'` |
| `overall = needs_check` (ineligible 없음) | `conditional` | `subStatus='needs_check'`, `checkReasons[] = check 행마다 "{label}: {source_text 앞 60자}"`, `nearMissReason = checkReasons.join(' · ')` (S3는 이 한 문자열만 렌더) |
| `overall = ineligible` **AND** near-miss(§6.1) | `conditional` | `subStatus='near_miss'`, `nearMissReason` 템플릿(§6.1) |
| `overall = ineligible` 그 외 | `fail` | `failReason = "{label} 조건 미충족 ({required} — 현재 {current})"` 첫 실패 항목 |

- `Announcement.status`: `apply_end < today` → `closed`; `apply_end − today ≤ 7일` → `closing`; 그 외·`is_rolling` → `open`. `apply_start > today`(접수 예정)도 `open`으로 두되 기간 텍스트가 이를 보여준다(별도 상태는 P2). `eligible = (verdict === 'pass')`.
- `Announcement.field`: `SupportField`가 `내수|경영|기타`면 `'기타'`.
- 디자인의 `grants`(판정함)와 `allAnnouncements`(공고 목록)는 **같은 카탈로그**의 두 뷰다. 판정함은 `closed`가 아닌 프로그램만, 공고 목록은 전부(마감 포함) 보여준다.

### 5.5 Supabase 스키마 (`supabase/migrations/0001_init.sql`)

```sql
create extension if not exists vector with schema extensions;

create table public.programs (
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
  raw_text text,                                   -- 파싱 입력 원문 (K-Startup 필드 결합 / 기업마당 bsnsSumryCn 태그 제거)
  eligibility jsonb not null default '{"operator":"AND","conditions":[]}'::jsonb,
  unmapped_conditions jsonb not null default '[]'::jsonb,
  required_documents jsonb not null default '[]'::jsonb,   -- ProgramDocument[]
  review_status text not null default 'ai_draft' check (review_status in ('ai_draft','human_verified')),
  is_synthetic boolean not null default false,
  duplicate_of uuid references public.programs(id),
  embedding vector(1024),                          -- voyage-4, 1024차원 (HNSW 인덱스 한도 2000 이내)
  parse_model text, parse_error text, parsed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);
create index programs_embedding_hnsw on public.programs using hnsw (embedding vector_cosine_ops);
create index programs_apply_end_idx on public.programs (apply_end);
create index programs_canonical_idx on public.programs (duplicate_of) where duplicate_of is null;

create table public.document_types (
  id text primary key, name text not null, issuer text not null,
  lead_time_days int, issue_url text, verified_at date
);

create table public.obligations (
  id text primary key, category text not null, title text not null, what text not null,
  penalty text not null, authority text not null,
  legal_basis jsonb, legal_text_excerpt text, legal_checked_at date, how_to_url text,
  applies_if jsonb not null, schedule jsonb not null,
  importance text not null default 'normal' check (importance in ('high','normal'))
);

create table public.dedupe_pairs (
  id bigint generated always as identity primary key,
  program_a uuid not null references public.programs(id),
  program_b uuid not null references public.programs(id),
  similarity real not null, period_overlap boolean not null,
  decision text not null check (decision in ('duplicate','distinct','review')),
  decided_by text not null default 'auto' check (decided_by in ('auto','human')),
  created_at timestamptz not null default now(),
  unique (program_a, program_b)
);

create table public.ingest_runs (
  id bigint generated always as identity primary key,
  source text not null, started_at timestamptz not null default now(), finished_at timestamptz,
  fetched int default 0, upserted int default 0, parsed int default 0, embedded int default 0, deduped int default 0,
  failed int default 0, notes text
);

-- 유사도 검색 RPC (코사인 거리 <=>; 유사도 = 1 - 거리)
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

-- RLS: 앱 서버는 secret key(RLS 우회)만 사용한다. anon 정책은 키 유출 시 방어선 — 합성 데이터 읽기만 허용.
alter table public.programs enable row level security;
alter table public.document_types enable row level security;
alter table public.obligations enable row level security;
alter table public.dedupe_pairs enable row level security;
alter table public.ingest_runs enable row level security;
create policy "anon read synthetic programs" on public.programs for select to anon using (is_synthetic = true);
create policy "anon read document_types" on public.document_types for select to anon using (true);
create policy "anon read obligations" on public.obligations for select to anon using (true);
create policy "anon read dedupe_pairs" on public.dedupe_pairs for select to anon using (true);
-- ingest_runs는 서버 전용 (정책 없음)
```

- `embedding` 컬럼을 `select`할 때는 **명시적으로 제외**한다(1024 float가 카탈로그 응답에 실리면 페이로드 폭증). `loadCatalog()`는 `select('id,title,…')`로 컬럼을 열거한다.
- `PUBLIC_DEMO=true`면 `loadCatalog()`에 `.eq('is_synthetic', true)`를 추가한다. 로컬(`false`)에서는 전체.
- 카탈로그 조회는 항상 `duplicate_of is null`(canonical만). `dualListed`는 `dedupe_pairs`에서 canonical이 등장하는지로 계산.

---
## 6. 결정론 엔진 명세 (`lib/engine/*` — 순수 TS, 브라우저·서버 양쪽에서 동작, React·DB 의존 금지)

모든 함수는 `today: Date`를 인자로 받는다(테스트 가능성). `new Date()`를 엔진 안에서 호출하지 않는다.

### 6.1 `evaluate.ts` — 자격 판정 (3-state + near-miss)

```ts
export type Verdict = 'eligible' | 'ineligible' | 'needs_check';
export interface CriterionResult {
  field: ConditionField | null;      // null = unmapped · OR 그룹 행은 첫 리프의 field
  label: string;                     // FIELD_META[field].label ("업력") · unmapped면 원문 앞 30자
  required: string;                  // Condition.label ("3년 이상 7년 이하")
  current: string;                   // format.ts로 포맷한 내 값 ("약 3년 2개월 (2023.06 창업)")
  state: 'pass' | 'fail' | 'check';
  sourceText: string;
}
export interface NearMiss { field: ConditionField; message: string; }
export interface ProgramVerdict {
  programId: string; overall: Verdict; criteria: CriterionResult[]; nearMiss: NearMiss | null;
}
export function evaluateCondition(c: Condition, p: FlatProfile): 'pass' | 'fail' | 'check';
export function evaluateGroup(g: ConditionGroup, p: FlatProfile): 'pass' | 'fail' | 'check';
export function evaluateProgram(program: Program, p: FlatProfile, today: Date): ProgramVerdict;
export function evaluateObligation(ob: Obligation, p: FlatProfile): 'pass' | 'fail' | 'check';  // applies_if
```

**조건 평가 규칙**

| 상황 | 결과 |
|---|---|
| `p[field]`가 `null`/`undefined` (boolean 제외) | `check` |
| `field`가 `ConditionField`가 아님 | `check` (파서 후처리에서 이미 unmapped로 이동했어야 함 — 방어) |
| `lt/lte/gt/gte` | 숫자 비교. 비숫자면 `check` |
| `eq/neq` | 스칼라 비교. `industry_code`는 **prefix 매칭**("J"는 "J62"에 매칭, "J62"는 정확히) |
| `in/not_in` | `value: string[]`에 포함 여부. `region_code`에서 `value`가 `["ALL"]`이면 전국 → `pass`. `industry_code`는 원소별 prefix |
| `includes` | 배열 필드(`certifications`)가 `value`를 포함 |
| 그룹 `AND` | 하나라도 `fail` → `fail`; 아니면 하나라도 `check` → `check`; 아니면 `pass` |
| 그룹 `OR` | 하나라도 `pass` → `pass`; 아니면 하나라도 `check` → `check`; 아니면 `fail` |
| `unmapped_conditions` 비어있지 않음 | 각 항목을 `state:'check'` 행으로 `criteria`에 추가 → 종합에 `needs_check` 강제 주입 |
| 빈 조건(`conditions: []`, unmapped도 없음) | `check` 1행("자격 요건 정보 없음 — 원문 확인") — **자동 pass 금지** |

**종합**: `overall = evaluateGroup(program.eligibility)`의 결과(`pass→eligible`, `fail→ineligible`, `check→needs_check`)에 unmapped·빈 조건 주입을 적용한다. **리프를 세어 종합을 내지 않는다** — 충족된 OR 그룹 안의 실패 리프는 종합을 바꾸지 않는다(테스트 5).

**`criteria[]` 행 생성 규칙**: 루트 AND의 리프 조건 → 행 1개씩. 루트 안의 **OR 그룹 → 행 1개**로 합친다: `label`은 각 리프의 `FIELD_META.label`을 " 또는 "으로 연결, `required`는 각 리프의 `label`을 " 또는 "으로 연결, `state`는 그룹 결과, `current`는 pass한 리프(없으면 첫 리프)의 값, `sourceText`는 첫 리프의 것. 뷰모델 `EligibilityCriteria`는 이 행을 그대로 받는다.

**near-miss(조건부) 판정** — `overall === 'ineligible'`이고 아래를 모두 만족할 때만:

1. `criteria[]` 행 중 `state === 'fail'`이 **정확히 1개** (`check` 행은 있어도 됨). 그 행이 OR 그룹이면 그룹 안의 리프 중 아래 2·3을 만족하는 리프가 있어야 하며, 여러 개면 충족까지의 차이가 가장 작은 리프로 메시지를 만든다
2. 그 조건의 `FIELD_META[field].mutability`가 `mutable`(직원 수) 또는 `acquirable`(인증), 또는 `time`이면서 **하한 조건**(`gte/gt` — 시간이 지나면 충족)이고 **충족 시점이 12개월 이내**일 때. 하한 임계값은 `threshold = op === 'gt' ? N + 1 : N`(개월·세 단위)
3. boolean 플래그(`hiring_planned`, `has_online_sales`, `is_food_business`, `handles_personal_data`, `is_vat_exempt`)와 `business_type`·`region_code`·`industry_code`·`ceo_gender`·`annual_revenue_krw`·`export_revenue_usd_prev_year`는 `fixed`로 취급한다(현 상황을 기술하는 값이므로 "바꾸면 된다"고 안내하지 않는다)

| 케이스 | `nearMiss.message` 템플릿 |
|---|---|
| `employee_count gte N` | `상시근로자 {N}인 이상 조건 — 현재 {cur}인. {N−cur}명 충원 시 자격 충족` |
| `business_age_months gte N` (`gt N`이면 `N+1`) | `업력 {fmtMonths(N)} 이상 조건 — 현재 {fmtMonths(cur)}. {fmtDate(founded_at + N개월)}부터 자격 발생` |
| `ceo_age gte N` | `대표자 만 {N}세 이상 조건 — 현재 만 {cur}세. {fmtDate(생일 기준)}부터 자격 발생` |
| `certifications includes X` | `{CERT_LABEL[X]} 보유 조건 — 미보유. 인증 취득 시 자격 충족` |

그 외 `fail`(업종·지역·성별·업력/연령 상한 초과 등 `fixed`이거나 상한)은 near-miss가 아니다 → `Grant.status = 'fail'`.

### 6.2 `expiry.ts` — 자격 소멸 예측 ("곧 사라짐")

```ts
export function computeExpiry(program: Program, verdict: ProgramVerdict, flat: FlatProfile, today: Date): ExpiringItem | null;
export function computeExpiringList(catalog: Program[], verdicts: ProgramVerdict[], flat: FlatProfile, today: Date): ExpiringItem[];
```

- 대상: `verdict.overall === 'eligible'`인 프로그램만.
- 리프 조건 중 **상한 조건**(`lt/lte`)이면서 `FIELD_META.mutability`가 `time`|`mutable`인 것을 후보로 잡고, 후보마다 **반사실 평가**를 한다: 해당 필드를 소멸 직후 값(예 `business_age_months = N+1`, `employee_count = N`)으로 바꾼 `FlatProfile`로 `evaluateGroup(root)`를 다시 실행해 결과가 `fail`이 될 때만 항목을 만든다. (충족된 OR 그룹 안의 리프 — 예 #14의 `ceo_age ≤39 ∨ hiring_planned` — 는 뒤집혀도 루트가 유지되므로 항목이 생기지 않는다.)
- 소멸 시점(flip)은 **엔진의 내림(floor) 계산과 같은 날**이어야 한다. `business_age_months`는 개월 내림이므로 `lte N`은 `founded_at + (N+1)개월`이 되는 날 처음 위반되고, `ceo_age`(만 나이)는 `lte N`이 `birth + (N+1)년`에 처음 위반된다:

| 필드·연산 | 소멸일(flip) | `axis` | `reason` 템플릿 |
|---|---|---|---|
| `business_age_months lte N` | `founded_at + (N+1)개월` (`lt N`이면 `+N개월`) | 업력 | `업력 {fmtMonths(N)} 이내 조건 — {fmtDate(flip)} 이후 자격 소멸` |
| `ceo_age lte N` | `ceo_birth_date + (N+1)년` (`lt N`이면 `+N년`); 생년월일 `null`이면 항목 생성 안 함 | 대표자연령 | `대표자 만 {N}세 이하 조건 — {fmtDate(flip)} 이후 자격 소멸` |
| `employee_count lt/lte N` | 날짜 없음(이벤트형). 임계 `T = (op === 'lt' ? N : N + 1)`. **한 명 차이**(`T − employee_count ≤ 1`)이거나 `hiring_planned === true`이면서 `T − employee_count ≤ 2`일 때만 생성(그 외는 노이즈) | 직원수 | `상시근로자 {T}인 미만 조건 — 채용으로 {T}인 도달 시 자격 소멸` |

- 프로그램당 1건: 시간형 중 **가장 이른 flip** 우선, 없으면 직원수형. `expiresIn = 일수(flip − today)`, 직원수형은 `null`.
- 포함 범위: `expiresIn ≤ 365` 또는 `null`. 정렬: `expiresIn` 오름차순, `null` 마지막.
- 색 임계값(디자인 유지): `≤ 60` rose, `≤ 90` amber, 그 외 기본. 사이드바 배지·대시보드 "곧 소멸(3개월)" 카드는 `expiresIn !== null && expiresIn ≤ 90` 건수.
- `applyDeadline = program.apply_end` — 대시보드 배너 부제 "자격 만료 전 신청 마감일 {fmtDate}"에 사용.

### 6.3 `schedule.ts` — 마감일·D-day·할 일 생성

```ts
export function nextDueDate(rule: ScheduleRule, today: Date): Date | null;        // event_relative → null, once(과거) → null
export function occurrencesBetween(rule: ScheduleRule, from: Date, to: Date): Date[];  // 캘린더 월 표시·할 일 생성
export function dDay(target: Date, today: Date): number;                          // 자정 기준 일수 차 (음수 = 지남)
export function shiftToBusinessDay(d: Date): Date;                                // 토·일 → 다음 월요일 (P1). 공휴일 테이블은 P2
export function generateTasks(obligations: Obligation[], flat: FlatProfile, today: Date, doneIds: Set<string>, custom: Task[]): Task[];
```

- `monthly {day}`: 이번 달 `day`가 오늘 이후(포함)면 이번 달, 아니면 다음 달. `day`가 월 길이를 넘으면 말일로 클램프.
- `quarterly/semiannual {months, day}` · `annual {month, day}`: 지정 월 중 오늘 이후 가장 가까운 것, 없으면 다음 해.
- `event_relative`: `Task.type='event'`, `dueDate = rule.label`("채용 즉시" · "채용 후 14일 이내" · "임금 지급 시마다"). 정렬 시 날짜형 뒤.
- `generateTasks(obligations, flat, today, state: TaskState)` — `TaskState = { doneIds: string[]; hiddenIds: string[]; overrides: Record<string, Partial<Task>>; custom: Task[]; profileCreatedAt: string }`. `evaluateObligation(ob) === 'pass'`인 의무만. 날짜형은 `[max(today−30일, profileCreatedAt), today+60일]` 구간의 발생일마다 Task 1건(**온보딩 이전에 지난 기한은 만들지 않는다** — 새 프로필이 즉시 '기한 지남'으로 뒤덮이는 것을 막는다), `id = "${ob.id}:${iso}"`; 이벤트형은 `id = "${ob.id}:event"` 1건. `done`은 `doneIds` 포함 여부, `hiddenIds`에 있으면 제외, `overrides[id]`를 얕게 병합, `custom[]`을 뒤에 병합. 지난 기한(`dDay < 0`)이고 미완료면 `overdue = true` → 날짜 텍스트 `text-rose-600`(허용된 최소 추가).
- `evaluateObligation === 'check'`인 의무는 할 일에 넣지 않고 판정함 "법정의무" 탭에서 "확인 필요" 뱃지로만 노출(P1).

### 6.4 `simulate.ts` — 직원 수 변화 시뮬레이션

```ts
export interface SimulationDiff {
  from: number; to: number; crossedThresholds: number[];
  newObligations: Obligation[]; removedObligations: Obligation[];
  lostPrograms: Program[]; gainedPrograms: Program[];
}
export function simulateEmployees(programs: Program[], obligations: Obligation[], profile: CompanyProfile, to: number, today: Date): SimulationDiff;
export function employeeThresholds(programs: Program[], obligations: Obligation[]): number[];  // 카탈로그의 employee_count 조건값 집합(정렬)
```

- `flat(from)`과 `flat(to)`(employee_count만 바꿈)로 각각 의무 적용 집합·프로그램 `eligible` 집합을 계산해 차집합.
- 디자인의 `employeeRules` 하드코딩은 삭제. 하단 3개 안내 카드(5인/10인/30인)는 `obligations` 중 `employee_count gte N`을 가진 항목 제목을 최대 3개 이어붙여 생성. 카탈로그에 해당 임계값이 없으면 "이 구간에서 추가되는 의무 없음".
- 슬라이더 범위·버튼(1~50, 5/10/30)은 디자인 유지. `crossedThresholds`에 50·100이 있어도 버튼은 추가하지 않는다.

### 6.5 `leadTime.ts` — 준비서류 리드타임 역산

```ts
export interface LeadTimeItem { name: string; issuer: string | null; leadTimeDays: number | null; latestStart: string | null; status: 'ok' | 'tight' | 'late' | 'unknown'; issueUrl: string | null; }
export interface LeadTimePlan { deadline: string | null; isRolling: boolean; items: LeadTimeItem[]; overall: 'ok' | 'tight' | 'late' | 'unknown' | 'rolling'; }
export function computeLeadTime(program: Program, docTypes: DocumentType[], today: Date): LeadTimePlan;
```

- `latestStart = apply_end − lead_time_days`. `late`: `latestStart < today`; `tight`: `0 ≤ latestStart − today ≤ 3`; `ok`: 그 외; `unknown`: `lead_time_days === null` 또는 카탈로그 매칭 실패.
- `overall` = 최악값(`late > tight > unknown > ok`). `is_rolling`이면 `rolling`(경고 없음, "상시 접수 — 서류 준비 후 신청").
- 리드타임 값은 `document_types`(사람이 확인·입력)에서만 온다. AI가 추정한 값은 사용하지 않는다.

### 6.6 `dedupe.ts` — 중복 판정의 결정론 부분

```ts
export function cosineSimilarity(a: number[], b: number[]): number;
export function periodsOverlap(a: Pick<Program,'apply_start'|'apply_end'|'is_rolling'>, b: typeof a): boolean;  // 어느 쪽이든 rolling → true; 날짜 null → true(보수적)
export function decideDuplicate(similarity: number, overlap: boolean): 'duplicate' | 'review' | 'distinct';
// similarity ≥ 0.92 && overlap → 'duplicate' · similarity ≥ 0.85 → 'review' · 그 외 'distinct'
export function buildEmbeddingText(p: Pick<ProgramRow,'title'|'organization'|'amount_text'|'summary'|'raw_text'>): string;
// `${title}\n기관: ${organization}\n지원: ${amount_text ?? ''}\n${summary ?? (raw_text ?? '').slice(0, 1500)}`
```

### 6.7 `alerts.ts` — 대시보드 배너 1건 선택

후보를 모아 **우선순위 값이 가장 작은 1건**만 배너로 표시. 후보가 없으면 배너를 렌더하지 않는다. `SettingsProvider`의 알림 항목 토글(`expiring/deadline/task`)이 꺼진 유형은 후보에서 제외.

| 유형 | 조건 | 우선순위 | 제목 / 부제 |
|---|---|---|---|
| 기한 지난 의무 | 미완료 `overdue` Task | `−1000 + dDay` | `{title} 기한이 {|dDay|}일 지났습니다` / `{authority} · {penalty}` |
| 임박 의무 | 날짜형 Task `0 ≤ dDay ≤ 3` | `dDay` | `{title} 마감 D-{dDay}` / `{authority} · {penalty}` |
| 자격 소멸 | `expiresIn ≤ 90` | `expiresIn + 10` | `{grantName} 자격이 {expiresIn}일 후 소멸됩니다` / `{axis} 조건 만료 전 신청 마감일 {applyDeadline}` |
| 공고 마감 | `pass` 프로그램 `apply_end` D-7 이내 | `dDay + 20` | `{title} 접수 마감 D-{dDay}` / `{organization} · {amount_text}` |

의도된 순서: 기한 지난 의무 > 3일 내 의무 > (자격 소멸·공고 마감은 값 비교 — 예: 소멸 D-56 → 66, 마감 D-7 → 27이므로 **마감이 먼저**). 동률이면 자격 소멸 우선. 시드 프로필 ①의 첫 배너는 #6 "중소기업 기술개발 R&D(창업성장) 접수 마감 D-7"이다.

---

## 7. AI 파이프라인 (`lib/ai/*`, `lib/ingest/*`, `scripts/*` — 서버 전용)

### 7.1 Claude 파싱 (공고 원문 → `ParsedAnnouncement`)

**설정**

| 항목 | 값 |
|---|---|
| SDK | `@anthropic-ai/sdk` (Node 20+). `import Anthropic from "@anthropic-ai/sdk"` |
| 모델 | `process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5"`. 저비용 대안 `claude-haiku-4-5`. (2026-09 기준 현행 ID. `claude-3-5-*`, `claude-3-7-*`, `claude-sonnet-4-2025*`는 퇴역 — 사용 금지) |
| 파라미터 | `max_tokens: 4096`. **`temperature`/`top_p`/`top_k`를 설정하지 않는다**(Claude 4.7 이상 모델은 비기본값이면 400 에러) |
| 출력 강제 | **Structured outputs**: `output_config: { format: { type: "json_schema", schema: PARSED_ANNOUNCEMENT_SCHEMA } }`. 스키마에 `minimum/maximum/maxLength/pattern/format`을 쓰지 않는다(미지원 → `description`에 서술). `additionalProperties:false`는 자동 |
| 검증 | 응답 JSON을 zod(`ParsedAnnouncementZ`)로 재검증. 스키마와 zod는 `lib/ai/schema.ts`에서 함께 정의·수출 |
| 스트리밍(데모) | `client.messages.stream({...})` → `stream.on("text", delta => …)` → SSE로 전달, 종료 시 `await stream.finalMessage()` |
| 배치(수집) | `client.messages.create({...})` 비스트리밍. 동시성 3. 429/5xx는 지수 백오프 1회 재시도 |
| 비용 감각 | 공고 1건 ≈ 입력 6k + 출력 1.5k 토큰 → Sonnet 5 기준 약 $0.03. 100건 ≈ $3 |

**출력 스키마(재귀 없음 — structured outputs 호환을 위해 그룹은 1단계만)**

```ts
// lib/ai/schema.ts (JSON Schema 형태로도 동일하게 export)
ParsedAnnouncement = {
  title: string; organization: string; executing_org: string | null;
  support_field: '창업'|'R&D'|'수출'|'고용'|'금융'|'내수'|'경영'|'기타';
  support_type: string | null;                 // "사업화 자금 + 멘토링"
  amount_text: string | null;                  // "최대 3억원"
  summary: string;                             // 200자 이내 요약 (description에 명시)
  apply_start: string | null;                  // "YYYY-MM-DD" (description에 명시)
  apply_end: string | null;
  is_rolling: boolean;                         // "상시", "예산 소진 시까지"
  conditions: Condition[];                     // 모두 AND (field는 FlatProfile 키 enum, op는 Operator enum, value는 string — 후처리에서 타입 변환)
  alternatives: { label: string; conditions: Condition[] }[];   // 원소 1개 = "다음 중 하나에 해당" 블록 1개. 블록 안의 conditions는 서로 OR, 블록끼리·위 conditions와는 AND
  unmapped_conditions: { text: string; reason: string }[];
  required_documents: { name: string; source_text: string; is_required: boolean }[];
  confidence: number;                          // 0~1 (description에 범위)
}
```

**시스템 프롬프트 (`lib/ai/prompts.ts` — 원문 그대로 사용)**

```
당신은 대한민국 정부·지자체·공공기관의 창업·중소기업 지원사업 공고문을 구조화하는 파서입니다.
공고문에서 정보를 추출해 주어진 JSON 스키마로만 응답합니다.

규칙:
1. 원문에 명시되지 않은 조건은 절대 만들어내지 마세요. 추론·일반 상식으로 조건을 추가하지 않습니다.
2. 각 조건(conditions, alternatives)의 source_text에는 근거가 된 원문 문장을 그대로 담으세요. 요약하거나 고치지 않습니다.
3. 조건은 아래 field 목록에만 매핑합니다. 매핑할 수 없는 조건은 unmapped_conditions에 원문 그대로 넣고 reason에 이유를 씁니다.
   field 목록과 단위:
   - business_age_months (업력, 개월 — "3년 이내"는 op=lte value="36", "3년 이상 7년 이하"는 gte "36" + lte "84" 두 조건)
   - employee_count (상시근로자 수, 명)
   - ceo_age (대표자 만 나이, 세 — "만 39세 이하"는 lte "39")
   - ceo_gender ("male" | "female")
   - region_code (시도 코드: 11 서울, 26 부산, 27 대구, 28 인천, 29 광주, 30 대전, 31 울산, 36 세종, 41 경기, 51 강원, 43 충북, 44 충남, 52 전북, 46 전남, 47 경북, 48 경남, 50 제주. 전국이면 조건을 만들지 않습니다)
   - industry_code (한국표준산업분류 대분류 A~U 또는 중분류 예 "J62". 업종 제한이 명시된 경우만)
   - business_type ("individual" 개인사업자 | "corporation" 법인)
   - annual_revenue_krw (연매출, 원 — "매출 10억 이하"는 lte "1000000000")
   - export_revenue_usd_prev_year (전년도 수출액, 달러)
   - is_vat_exempt, has_online_sales, handles_personal_data, is_food_business, hiring_planned (true/false)
   - certifications (includes "venture" | "innobiz" | "mainbiz" | "research_institute" | "social_enterprise" | "women_enterprise" | "disabled_enterprise")
4. "다음 중 하나에 해당" 같은 선택 조건 묶음은 alternatives의 원소 하나로 넣고, 그 안의 conditions에 선택지들을 나열합니다(선택지끼리 OR). 묶음이 여러 개면 원소를 여러 개 만듭니다(묶음끼리 AND). 그 외 모든 조건은 conditions(AND)입니다.
   "이상"은 gte, "초과"는 gt, "이하"는 lte, "미만"은 lt로 씁니다.
5. 우대·가점 사항은 조건이 아닙니다. 넣지 마세요.
6. 날짜는 YYYY-MM-DD로 정규화합니다. 연도가 없으면 공고문의 다른 날짜에서 추론하되, 추론이 불확실하면 null로 두고 unmapped_conditions에 원문을 남깁니다.
7. 접수가 "상시", "예산 소진 시까지"이면 is_rolling=true, apply_end=null.
8. required_documents에는 제출 서류를 원문 표기 그대로 넣습니다. 발급 소요기간을 추정하지 않습니다.
9. 확실하지 않으면 조건을 만들지 말고 unmapped_conditions로 보내세요. confidence는 전체 추출의 확신도(0~1)입니다.
```

사용자 메시지: `공고문:\n---\n{{text}}\n---`

**후처리 (`lib/ai/postprocess.ts`)** — 파서 출력을 `Program` 필드로 변환

1. `field`가 `ConditionField`가 아니면 해당 조건을 `unmapped_conditions`로 이동.
2. `value` 문자열 → 필드 타입으로 변환(숫자 필드는 `Number`, boolean 필드는 `"true"/"false"`, `in/not_in`은 쉼표 분리 배열). 변환 실패 → unmapped.
3. `eligibility = { operator:'AND', conditions: [...conditions, ...alternatives.map(a => ({ operator:'OR', conditions: a.conditions }))] }` — alternatives 원소 하나가 OR 그룹 하나가 된다. 원소의 `conditions`가 1개뿐이면 그룹으로 감싸지 않고 루트 AND에 직접 넣는다.
4. `required_documents` 각 항목을 `document_types`와 **정규화 이름 매칭**(공백·괄호 제거, 동의어 표 `DOC_ALIASES`: "중소기업확인서"≈"중소기업(소상공인)확인서", "사업자등록증명"≈"사업자등록증명원") → `document_type_id`. 실패 시 `null`.
5. `support_field` 그대로, `summary` 200자 초과 시 잘라냄.
6. `confidence < 0.5`이면 `unmapped_conditions`에 `{ text: "(파서 확신도 낮음)", reason: "confidence " + n }` 추가 → 자동 `needs_check`.

**`/api/ai/parse` 가드레일**: 입력 12,000자 초과 → 413. IP당 분당 10회(인메모리 Map — 인스턴스 로컬, 데모 수준). `export const maxDuration = 60`. 응답은 `text/event-stream`; 이벤트 `{"type":"delta","text"}` → `{"type":"final","parsed":ParsedAnnouncement,"program":Program(초안),"usage"}` 또는 `{"type":"error","message"}`.

### 7.2 Voyage 임베딩

| 항목 | 값 |
|---|---|
| 엔드포인트 | `POST https://api.voyageai.com/v1/embeddings`, 헤더 `Authorization: Bearer ${VOYAGE_API_KEY}`, `Content-Type: application/json`. npm 패키지 대신 `fetch` 직접 호출(의존성 최소화) |
| 모델 | `process.env.VOYAGE_MODEL ?? "voyage-4"` (계정당 무료 2억 토큰, $0.06/MTok). 한국어 품질 문제 시 `voyage-multilingual-2`(한국어 명시 지원, 1024 고정)로 교체 — **차원이 같아 스키마 변경 없음** |
| 요청 | `{ input: string[], model, input_type: "document", output_dimension: 1024, truncation: true }`. 배치 ≤ 128건. 저장용·질의용 **모두 `document`**(대칭 비교이므로 동일 프리픽스) |
| 응답 | `data[i].embedding` (index 순), `usage.total_tokens` 로그 |
| 텍스트 | `buildEmbeddingText()` (§6.6) — 저장 시와 질의 시 **같은 템플릿** |
| 시드 | `scripts/embed-seed.ts` → `seed/embeddings.json` (`{ [programId]: number[] }`) 생성·커밋. seed 모드의 중복제거 데모는 이 파일 + 붙여넣은 텍스트의 실시간 임베딩으로 동작 |

### 7.3 공고 수집 어댑터 (`lib/ingest/*`)

공통 정규화 타입:

```ts
export interface RawAnnouncement {
  source: 'kstartup' | 'bizinfo'; source_id: string; title: string; organization: string; executing_org: string | null;
  support_field_hint: SupportField; apply_start: string | null; apply_end: string | null; is_rolling: boolean;
  original_url: string | null; apply_url: string | null; raw_text: string; region_hint: string | null; published_at: string | null;
}
```

**K-Startup (공공데이터포털 15125364) — `kstartup.ts`**

| 항목 | 값 |
|---|---|
| URL | `https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01` (GET) |
| 인증 | `serviceKey` = `DATA_GO_KR_SERVICE_KEY`(Decoding 키)를 `URLSearchParams`에 넣는다(자동 인코딩). `_ENCODED` 키를 함께 쓰면 이중 인코딩 → 403 코드 30 |
| 파라미터 | `page`(1~), `perPage=100`, `returnType=json`, `cond[rcrt_prgs_yn::EQ]=Y`(모집중). 선택: `cond[supt_regin::LIKE]=광주`, `cond[pbanc_rcpt_end_dt::GTE]=yyyyMMdd` |
| 응답 | `{ currentCount, matchCount, page, perPage, totalCount, data: [...] }` |
| 필드 매핑 | `pbanc_sn`→`source_id` · `biz_pbanc_nm`→`title` · `pbanc_ntrp_nm`→`organization` · `executing_org`는 `null`(`sprv_inst`는 기관 **유형**이므로 raw_text의 `[주관기관 유형]`에만 넣는다) · `supt_biz_clsfc`→`support_field_hint`(아래 표) · `pbanc_rcpt_bgng_dt`/`pbanc_rcpt_end_dt`(**yyyyMMdd**)→ISO · `detl_pg_url`→`original_url` · `biz_aply_url`→`apply_url` · `supt_regin`→`region_hint` · `raw_text` = `[공고명] {biz_pbanc_nm}\n[공고기관] {pbanc_ntrp_nm} / [주관기관 유형] {sprv_inst}\n[지원분야] {supt_biz_clsfc}\n[지역] {supt_regin}\n[신청대상] {aply_trgt}\n[대상 상세] {aply_trgt_ctnt}\n[제외 대상] {aply_excl_trgt_ctnt}\n[업력] {biz_enyy}\n[대표자 연령] {biz_trgt_age}\n[접수기간] {bgng} ~ {end}\n[내용]\n{pbanc_ctnt}` |
| 분야 매핑 | `supt_biz_clsfc`에 "기술개발"·"R&D" 포함 → `R&D`; "판로"·"해외"·"수출"·"글로벌" → `수출`; "인력"·"고용"·"채용" → `고용`; "융자"·"보증"·"투자"·"금융" → `금융`; "사업화"·"창업"·"교육"·"멘토링"·"시설"·"공간" → `창업`; 그 외 `기타`. **첫 수집 후 실제 값 분포를 로그로 확인해 표를 보완한다** |
| 한도 | 개발계정 일 10,000건, 초당 제한 있음(코드 23) → 페이지 간 300ms 대기. CORS 없음(서버 호출만). `cond[supt_regin::LIKE]`가 서버에서 적용되지 않는 경우가 관찰되므로 `supt_regin`으로 **클라이언트(수집기) 측 재필터**를 한다 |

**기업마당 (bizinfo.go.kr) — `bizinfo.ts`** (`BIZINFO_API_KEY`가 비어 있으면 `enabled=false`, 로그 1줄 남기고 skip)

| 항목 | 값 |
|---|---|
| URL | `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do` (GET) |
| 인증 | `crtfcKey=${BIZINFO_API_KEY}`. 발급: API 상세페이지 "사용신청"에서 기관명·신청자·이메일·연락처·시스템명·**시스템 IP 또는 URL** 입력 → 즉시 발급(화면·이메일). 배포 URL이 정해진 뒤 신청 권장 |
| 파라미터 | `dataType=json`, `searchCnt`(0=전체 → `100`으로 제한), `pageUnit`, `pageIndex`, 선택 `searchLclasId`(01 금융·02 기술·03 인력·04 수출·05 내수·06 창업·07 경영·09 기타), `hashtags`(예 `전남광주`) |
| 응답 | `jsonArray[] → item[]`. **문서의 JSON 예시가 비표준 표기**이므로 `JSON.parse` 실패 시 `dataType=rss`(XML)로 재요청해 `fast-xml-parser`로 파싱하는 폴백을 둔다 |
| 필드 매핑 | `pblancId`→`source_id` · `pblancNm`→`title` · `jrsdInsttNm`→`organization` · `excInsttNm`→`executing_org` · `reqstBeginEndDe`("20220727 ~ 20220930", 정규식 `(\d{8})\s*~\s*(\d{8})`; 매칭 실패·"예산 소진"·"상시" → `is_rolling`)→날짜 · `pblancUrl`→`original_url` · `rceptEngnHmpgUrl`→`apply_url` · `pldirSportRealmLclasCodeNm`(금융/기술/인력/수출/내수/창업/경영/기타)→`support_field_hint`(기술→`R&D`, 인력→`고용`) · `creatPnttm`→`published_at` · `raw_text` = `[공고명]\n[소관기관] {jrsdInsttNm} / [수행기관] {excInsttNm}\n[지원대상] {trgetNm}\n[신청기간] {reqstBeginEndDe}\n[신청방법] {reqstMthPapersCn}\n[사업개요]\n{stripHtml(bsnsSumryCn)}` |

**저장 규칙**: `programs`에 `(source, source_id)` upsert. 이미 `parsed_at`이 있고 `raw_text`가 같으면 재파싱하지 않는다(해시 비교). `raw_text`가 바뀐 경우만 `parsed_at=null`로 되돌려 재파싱 큐에 넣는다.

### 7.4 법령 확인 스크립트 (`scripts/verify-law.ts`) — 런타임 의존 금지

- 국가법령정보센터 Open API는 **호출 서버의 IP/도메인을 사전 등록**해야 하고 트래픽 정책이 비공개다. 따라서 앱 런타임에서 호출하지 않고, 개발자가 로컬에서 스크립트로 실행해 결과를 **시드에 기록**한다.
- 흐름: `seed/obligations.json`의 각 `legal_basis {law_name, article, jo_code}` →
  1. `GET https://www.law.go.kr/DRF/lawSearch.do?OC=${LAW_GO_KR_OC}&target=law&type=JSON&query=${law_name}` → `LawSearch.law[]`에서 `법령명한글 === law_name`인 항목의 `법령일련번호(MST)`·`시행일자`
  2. `GET https://www.law.go.kr/DRF/lawService.do?OC=${OC}&target=law&type=JSON&MST=${MST}&JO=${jo_code}` → `법령.조문.조문단위`(단건 객체/다건 배열 모두 처리)의 `조문내용`·`항[]`
  3. `legal_text_excerpt`(300자), `law_mst`, `effective_date`, `legal_source_url`, `legal_checked_at = 오늘` 기록
- `jo_code`: 조 4자리 + 가지번호 2자리. 제17조 → `001700`, 제10조의2 → `001002`, 제128조 → `012800`.
- 응답이 `"사용자 정보 검증에 실패하였습니다"`면 IP 미등록 → 안내 문구 출력 후 종료(시드 미수정, exit 1).
- API가 막힌 경우의 대안: 사람이 law.go.kr 화면에서 확인 → `legal_checked_at`과 `legal_source_url`을 수동 기록, `verified_by: "manual"`. 어느 경우든 **확인되지 않은 항목은 `legal_checked_at: null`로 둔다**.

### 7.5 수집 잡 (`lib/ingest/run.ts`, `scripts/ingest.ts`, `/api/ingest`)

```
runIngest({ sources: ['kstartup','bizinfo'], maxFetch: 200, maxParse: 20, maxEmbed: 100 })   // cron(/api/ingest)에서는 maxParse 5, maxEmbed 50
  1. 각 어댑터 fetch → normalize → programs upsert            (ingest_runs.fetched/upserted)
  2. parsed_at IS NULL 인 행 ≤ maxParse → Claude 파싱 → 저장    (parsed / failed + parse_error)
  3. embedding IS NULL 이고 parsed_at 있음 ≤ maxEmbed → Voyage   (embedded)
  4. 이번 런에서 임베딩된 행마다 match_programs(top 5, threshold 0.85, exclude 자기 자신)
     → decideDuplicate → 'duplicate'면 created_at이 늦은 쪽에 duplicate_of 설정, dedupe_pairs insert  (deduped)
  5. ingest_runs finished_at 기록  (각 단계가 끝날 때마다 카운터를 즉시 update — 함수가 중간에 종료돼도 진행 상황이 남도록)
```

- **멱등**: 같은 입력으로 몇 번 돌려도 결과가 같다. 파싱·임베딩은 미처리분만 진행하므로 백로그는 다음 런에서 이어진다.
- `/api/ingest` (GET): `Authorization: Bearer ${CRON_SECRET}` 불일치 → 401. `export const maxDuration = 60`. 응답 = `ingest_runs` 요약 JSON.
- `vercel.json`: `{ "crons": [{ "path": "/api/ingest", "schedule": "0 21 * * *" }] }` (UTC 21:00 = KST 06:00. Hobby 플랜은 **하루 1회·±59분 정밀도**, 프로덕션 배포에서만 실행, 재시도 없음).
- 로컬: `npm run ingest -- --source kstartup --region 광주 --maxFetch 50`. 모든 `scripts/*.ts`는 첫 줄에서 `import { config } from 'dotenv'; config({ path: '.env.local' });`로 환경변수를 읽는다(tsx는 `.env.local`을 자동 로드하지 않음). 대회 데모 준비는 로컬 실행을 권장.
- `PUBLIC_DEMO=true` 환경에서도 수집은 돌 수 있지만(`is_synthetic=false`로 저장) 화면에는 나오지 않는다. 사이드바 푸터 "공고 동기화"는 seed 모드면 `시드 데이터 기준 {날짜}`, supabase 모드면 마지막 `ingest_runs.finished_at`의 상대시간.

---
## 8. 화면 명세

표기: **P0** = 데모 시나리오(§1.4)가 성립하는 최소 범위 · **P1** = 차별화 · **P2** = 시간이 남으면. 각 화면의 "허용된 추가"에 없는 시각 요소는 추가하지 않는다. 화면 하단 공통: `<Disclaimer />` 한 줄(`text-[10px] text-[#888888]`) — `본 정보는 참고용이며 법적 자문이 아닙니다 · 판정 기준일 {YYYY.MM.DD} · 데이터 출처·면책 보기(/about)` — S1·S3·S4·S5·S6·S7·S9에 표시.

### S0. 온보딩 — `/onboarding` · **P0** · 신규

| 항목 | 내용 |
|---|---|
| 레이아웃 | 앱 셸 없음. 중앙 카드 `max-w-xl bg-white border border-[#E4E6EA] rounded-3xl shadow-sm`, 상단에 로고(사이드바의 "B" 아이콘 + "브릿지" 타이포 재사용)와 진행률 바(`h-1 bg-[#E4E6EA]` 위 `bg-[#6E62C2]`) |
| 구조 | **한 화면에 한 질문**, 8단계, 이전/다음 버튼. 필수 미입력 시 다음 비활성 |
| 1 | 회사명(선택) · 사업자번호(선택, `000-00-00000` 형식만 검사, 표시용) · 사업자 형태(개인/법인 카드 2개 중 선택) |
| 2 | 업종 — `lib/constants.ts`의 `INDUSTRIES`(KSIC 대분류 21 + 자주 쓰는 중분류: `J62` 소프트웨어 개발, `J63` 정보서비스, `C26` 전자부품, `C10` 식료품 제조, `G47` 소매(온라인 포함), `I56` 음식점, `M70` 전문서비스, `M71` 광고·시장조사, `M72` 디자인·연구개발, `N75` 사업지원, `P85` 교육, `R90` 창작·예술) 검색 가능한 리스트 → `industry_code`·`industry_label` |
| 3 | 지역 — 17개 시도 칩. 광주·전남을 첫 줄에 배치 |
| 4 | 개업일 — `<input type="date">`, 오늘 이후 차단. 입력 즉시 "업력 약 N년 M개월" 표시 |
| 5 | 상시근로자 수(대표 제외) 스테퍼 0~999 · "채용 예정" 토글(`flags.hiring_planned`) |
| 6 | 대표자 생년월일(선택 · "답하지 않음") · 성별(남/여/답하지 않음). 안내문: "미입력 항목은 관련 요건이 '확인 필요'로 표시됩니다" |
| 7 | 연매출(억원 단위 입력 → 원 변환) · **"모름" 버튼 필수** · 전년도 수출액(달러, 선택/모름) · 면세사업자 체크 |
| 8 | 해당사항 — 온라인 판매 / 개인정보 처리 / 식품 영업 / 보유 인증(멀티) |
| 데모 진입 | 카드 우상단 "데모 프로필 불러오기" 드롭다운(`seed/profiles.json` 3종) → 즉시 저장 후 `/dashboard` |
| 편집 모드 | `/onboarding?edit=1` — 기존 프로필로 프리필, 완료 시 덮어쓰기(마이페이지 "상세 수정"에서 진입). `useSearchParams()`를 쓰는 클라이언트 컴포넌트는 `<Suspense>`로 감싼다(정적 프리렌더 빌드 오류 방지) |
| 완료 시 | `ProfileProvider.save()` → `HistoryProvider.push({ event: "프로필 최초 등록", result: "온보딩 완료" })` → `router.replace('/dashboard')` |
| 완료 기준 | 새 브라우저 프로필에서 `/` 진입 → 온보딩 → 8단계 완료 → 대시보드에 입력값이 반영. "모름"으로 둔 매출 조건이 판정함에서 "확인 필요"로 표시 |

### S1. 대시보드 — `/dashboard` · **P0** · `Dashboard`

| 항목 | 내용 |
|---|---|
| 데이터 | `useVerdicts()`(카탈로그 × 프로필 → `Grant[]`), `useTasks()`, `useExpiring()`, `useCompany()` |
| 인사말 | `company.name.replace("주식회사","").trim()` 유지. 부제 `"{fmtDate(today)} 기준 자동 판정 결과입니다."` |
| "판정 완료" 배지 | 프로필 로드·판정 완료 시 표시. 점 색 `bg-[#3D7260]`(§4.5-1) |
| 경고 배너 | `pickTopAlert()` 1건. 없으면 미표시. "자세히 →"는 유형별로 `/expiring` `/tasks` `/grants` |
| 숫자 카드 3 | `pass` 건수 · 미완료 할 일 · `expiresIn ≤ 90` 건수. 클릭 이동 유지 |
| 받을 수 있는 지원사업 | `pass` 중 `apply_end` 오름차순 3건(상시는 뒤) |
| 곧 사라질 자격 | `ExpiringItem[]` 상위 3건 (디자인은 전체 렌더 — 3건으로 제한해 높이 고정) |
| 오늘 할 일 | 미완료 Task 3건(날짜형 D-day 오름차순, 이벤트형 뒤) |
| 완료 기준 | 데모 프로필 3종을 전환하면 숫자·목록·배너가 모두 달라진다 |

### S2. 공고 목록 — `/announcements` · **P0** · `AnnouncementsPage`

| 항목 | 내용 |
|---|---|
| 데이터 | 카탈로그 전체(canonical, 마감 포함) → `Announcement[]` |
| 정렬 | §4.5-7. 마감임박순 기본 |
| 필터 | 상태 3 · 분야 칩 5 + `기타` 1개 추가(같은 스타일, 회색 계열 `bg-[#F5F6F8] text-[#444444] border-[#E4E6EA]`) · "우리 기업 대상만"(= `verdict === 'pass'`) |
| 검색 | `title`·`agency` `includes`. 대소문자·공백 정규화 |
| 카드 | 디자인 유지. `dualListed`면 상태 뱃지 옆 `기업마당·K-Startup 동시 게시` 소형 뱃지(`text-[10px] bg-[#f0eef9] text-[#6E62C2] border border-[#dddaf4]`) — 허용된 추가 |
| 원문 보기 | `<a href={originalUrl} target="_blank" rel="noopener noreferrer">`. 없으면 비활성 |
| 완료 기준 | 12건 이상 렌더, 필터 조합·검색·정렬이 URL 없이 클라이언트에서 즉시 반응 |

### S3. 지원사업 판정함 — `/grants` · **P0** · `GrantsPage`

| 항목 | 내용 |
|---|---|
| 데이터 | `useVerdicts()` → `pass / conditional / fail` 분류. **`closed` 프로그램 제외** |
| 부제 | `"{company.name} 프로필 기준 자동 판정 결과입니다."` |
| 대상 카드 | 디자인 유지. 요건표(`eligibility[]`)의 **각 행 클릭 → `sourceText` 펼침**(행 아래 `text-[11px] text-[#888888] bg-[#F5F6F8] rounded-lg px-3 py-2 italic`) — 허용된 추가. 배너 부제 `"업력·업종·지역·직원 수·대표자 연령 조건 전부 통과"`는 실제 통과한 `label` 목록으로 생성 |
| 액션 버튼 | `신청 바로가기 →`(`applyUrl ?? originalUrl`) · `공고 원문`(`originalUrl`) · **`준비서류 확인`**(`hasDocuments`일 때만, `공고 원문`과 같은 스타일, `/grants/{id}/documents`) — P1 |
| 검수 상태 | `reviewStatus === 'ai_draft'`면 기관명 옆 `AI 판독 · 검수 전` 소형 텍스트(`text-[10px] text-[#888888]`) — 허용된 추가 |
| 기타 리스트 | conditional은 `subStatus`에 따라 `△ 조건 하나 부족 — {nearMissReason}`(amber) 또는 `? 확인 필요 — {nearMissReason}`(amber, 같은 박스; needs_check의 `nearMissReason`은 §5.4 규칙으로 생성) · fail은 `✕ 자격 미충족 — {failReason}`(rose). 펼침에 요건표(축약형: `label / required / current / state 아이콘`)도 표시 — 허용된 추가 |
| 법정의무 탭 | 안내문 `"{company.name}의 현재 상태(직원 {n}인, 업력 {y}년)를 기준으로 발생한 법정 의무 목록입니다."` · 목록 = `useTasks()` 전체(완료 포함) · `legalCheckedAt === null`이면 과태료 뱃지 옆 `확인 중` 뱃지(`text-[10px] bg-amber-50 text-amber-700 border-amber-200`) |
| 완료 기준 | 시드 프로필 ①에서 대상 8 · 조건부 5 · 제외 6(§10.2 집계와 일치). 조건부에는 near-miss(직원 충원·업력 하한·인증 취득)와 needs_check(TIPS 추천기관·지역 우수기업)가 모두 포함 |

### S4. 오늘 할 일 — `/tasks` · **P0** · `TasksPage`

| 항목 | 내용 |
|---|---|
| 데이터 | `useTasks()` = `generateTasks()` + localStorage `bridge:tasks:v1 = { doneIds, hiddenIds, overrides, custom }` |
| 완료 토글 | `doneIds` 추가/제거 |
| 추가 | `custom:` id로 `custom[]`에 저장. `dueDate`는 `YYYY.MM.DD` 입력이면 ISO로 정규화해 `dueDateIso`에도 저장(캘린더 표시용), 그 외 문자열은 이벤트형으로 취급 |
| 수정 | 생성된 항목은 `overrides[id]`에 부분 저장, 커스텀은 직접 수정 |
| 삭제 | 생성된 항목은 `hiddenIds`(해당 발생 건만 숨김), 커스텀은 제거 |
| 지난 기한 | 미완료·`dDay < 0` → 날짜 텍스트 `text-rose-600` |
| 완료 기준 | 새로고침 후에도 완료·추가·수정·삭제 상태 유지. 폼 입력 중 포커스 유지 |

### S5. 곧 사라짐 — `/expiring` · **P0** · `ExpiringPage`

| 항목 | 내용 |
|---|---|
| 데이터 | `useExpiring()` (§6.2) |
| 카드 | 디자인 유지(짝수 카드 사진형, 홀수 카드 D-day 박스형). `expiresIn === null`(직원수형)은 D-day 자리에 `채용 시` 텍스트(같은 폰트) — 허용된 추가 |
| "지금 신청하기 →" | `expiresIn ≤ 90`일 때만(디자인) → `applyUrl ?? originalUrl` 새 탭 |
| 하단 안내 | 디자인 문구 유지. 다만 "이메일·앱 푸시 알림 발송" 문장은 `"90일·30일·7일 전 대시보드 배너로 알립니다. (이메일·푸시는 향후 제공)"`으로 사실에 맞게 수정 |
| 빈 상태 | `"3개월 안에 사라지는 자격이 없습니다."` 회색 카드 — 허용된 추가 |
| 완료 기준 | 프로필 개업일을 바꾸면 D-day가 재계산된다 |

### S6. 캘린더 — `/calendar` · **P0** · `CalendarPage`

| 항목 | 내용 |
|---|---|
| 데이터 | `useCalendarTasks(viewYear, viewMonth)` — 보고 있는 달에 대해 `occurrencesBetween()`으로 날짜형 발생 건을 만들고 `TaskState`(done/hidden/overrides/custom)를 병합한다(`useTasks()`의 −30/+60일 창에 갇히지 않아 3/31 법인세·5/31 종소세도 해당 월에 보인다) + **P1**: `pass` 프로그램의 `apply_end`를 `bg-[#6E62C2]` 점으로 표시(범례에 `지원사업 마감` 추가 — 허용된 추가) |
| 그리드·패널 | 디자인 유지. 날짜 선택 → 해당 일의 Task 목록·추가/수정/삭제(`MiniForm`, 호이스팅) |
| 중요 법정의무 | `importance === 'high'`(penalty 있음)인 날짜형 Task, 다른 달은 `opacity-50` |
| 월 통계 | 전체 일정 / 중요 법정의무 / 완료 — 해당 월 기준 |
| 완료 기준 | 할 일 페이지에서 추가한 항목이 캘린더에 즉시 보인다 |

### S7. 직원 시뮬레이터 — `/simulator` · **P0** · `SimulatorPage`

| 항목 | 내용 |
|---|---|
| 데이터 | `simulateEmployees(programs, obligations, profile, simEmployees, today)` |
| 결과 2열 | 좌 "새로 생기는 법정 의무" = `newObligations[].title` · 우 "사라지는 지원 자격" = `lostPrograms[].title`. 인원을 **줄이는** 경우 좌는 `removedObligations`(제목 "사라지는 법정 의무"), 우는 `gainedPrograms`(제목 "새로 열리는 지원 자격") — 구조 동일, 제목 변경은 허용된 추가 |
| 슬라이더 | `min={0}`(디자인은 1 — 직원 0인 프로필을 표현해야 하므로), 눈금 라벨 `[0, 5, 10, 20, 30, 50]`. 그 외 디자인 유지 |
| 하단 3카드 | `employeeThresholds()` 중 5·10·30의 의무 제목 최대 3개 — 하드코딩 문구 삭제(§4.5-9) |
| 허용된 추가 | 결과 아래 한 줄 `"새로 열리는 지원사업 {gainedPrograms.length}건"` 링크(`/grants`) — P1 |
| 완료 기준 | 시드 프로필 ①(4인)에서 5인으로 올리면 §10.5의 5인 의무가, 10인으로 올리면 5인+10인 의무가 누적 표시 |

### S8. 마이페이지 — `/mypage` · **P0** · `MyPage`

| 항목 | 내용 |
|---|---|
| 프로필 카드 | 디자인의 6필드 인라인 편집 유지(업종·지역은 텍스트 대신 `INDUSTRIES`/`REGIONS` 셀렉트, 같은 input 스타일). 사업자번호는 디자인대로 읽기 전용, `null`이면 `미입력`(사이드바 칩도 `사업자번호 미입력`). 대표자 연령 → 생년월일 `date` 입력(§4.5-14). 헤더 우측에 `상세 수정`(→ `/onboarding?edit=1`) 버튼을 `수정` 옆에 같은 스타일로 추가 |
| 저장 시 | `ProfileProvider.save()` → 재판정 → `HistoryProvider.push({ event: "프로필 수정", result: "{변경 요약}, 재판정 완료 (대상 {n}건, 조건부 {m}건)" })` → 저장 배너 2.5초 |
| 알림 설정 | 채널·항목 토글을 `bridge:settings:v1`에 저장. `newGrant`(신규 공고 알림)는 이 버전에서 동작하지 않으므로 저장만 하고 설명 문구를 `"새 지원사업 공고 등록 시 발송 (제공 예정)"`으로 바꾼다. 헤더 아래 한 줄 안내 `"현재 버전은 대시보드 배너로 알립니다. 이메일·푸시 발송은 제공 예정입니다."` — 허용된 추가 |
| 판정 이력 | `useHistory()` 최신순. 비어 있으면 `"아직 이력이 없습니다."`. `엑셀 내보내기` → P1 CSV(`date,event,result`, UTF-8 BOM), P0는 `disabled` |
| 데이터 관리 | (§4.5-11) `데모 프로필 전환` → 3종 선택 팝오버 → 교체 후 이력 기록 · `내 데이터 내보내기(JSON)` → `bridge-export-{date}.json` 다운로드 · `프로필 초기화`(rose) → `confirm()` 대신 인라인 2단계 확인 버튼 → localStorage 전체 삭제 → `/onboarding` |
| 완료 기준 | 직원 수 4→5 저장 시 판정함·시뮬레이터·할 일이 모두 재계산되고 이력에 1행 추가 |

### S9. 준비서류 리드타임 역산 — `/grants/[id]/documents` · **P1** · 신규

| 항목 | 내용 |
|---|---|
| 진입 | 판정함 대상/조건부 카드의 `준비서류 확인` 버튼. `params`는 `await` |
| 헤더 | `← 판정함` 링크 · 프로그램명(`font-display text-2xl`) · 기관 · 우측 D-day 칩(`마감 {fmtDate} · D-{n}`; 상시면 `상시 접수`) |
| 표 | 행 = `LeadTimeItem`: 서류명 / 발급처(링크) / 발급 소요(`{n}일` · `즉시` · `확인 필요`) / 최종 착수일 / 상태 뱃지(`ok` 성공색 "여유" · `tight` amber "서둘러야" · `late` rose "지금 신청해도 마감 초과" · `unknown` 회색 "소요기간 확인 필요") |
| 종합 배너 | `late` → rose 배너 `"이 사업은 서류 준비 기간이 부족합니다. 다음 회차를 준비하세요."` + `공고 원문` 버튼 · `tight` → amber `"오늘 발급 신청을 시작해야 합니다."` · `ok` → 성공색 `"서류 준비 여유가 있습니다."` · `rolling` → 회색 `"상시 접수 — 서류 준비 후 신청하세요."` |
| 하단 | 원문 근거(`ProgramDocument.source_text`) 접이식 |
| 완료 기준 | 시드 프로그램 중 `apply_end`가 today+9일이고 `중소기업확인서`(20일)를 요구하는 항목에서 `late`가 표시된다 |

### S10. AI 파싱 데모 — `/demo/parse` · **P1** · 신규

| 항목 | 내용 |
|---|---|
| 목적 | 심사위원에게 "AI는 읽고, 판정은 코드가 한다"를 **동작으로** 보여준다 |
| 좌측 | `textarea`(`font-mono text-xs`, 12,000자 제한·카운터) · 프리셋 칩 3개(`seed/announcements/*.txt` — 파일명이 라벨) · `구조화 실행` 버튼(brand). 실행 중 비활성 + 스피너 |
| 우측 상단 | 스트리밍 원문 JSON `pre`(`bg-[#F5F6F8] rounded-2xl p-4 text-[11px] font-mono h-64 overflow-auto`) — 델타를 그대로 append |
| 우측 하단(final 후) | 카드 3개: **기본 정보**(제목·기관·분야·금액·접수기간·상시) / **추출 조건**(표: 필드 라벨 · 연산 · 값 · 근거 문장) / **AI가 확신하지 못한 항목**(amber 박스, `unmapped_conditions[]` 원문 + 사유, `"→ 판정에서 '확인 필요'로 처리됩니다"`) / **제출 서류**(카탈로그 매칭 여부 아이콘) |
| 즉시 판정 | `내 프로필로 판정` 버튼 → `evaluateProgram(초안 Program, flat, today)` → 판정함과 동일한 요건표 컴포넌트 재사용 + 종합 뱃지 |
| 메타 | 하단 `text-[10px] text-[#888888]`: `model · 입력 {n} 토큰 · 출력 {m} 토큰 · {ms} ms` |
| 오류 | rose 박스 인라인. 429는 `"잠시 후 다시 시도하세요 (분당 10회 제한)"` |
| 완료 기준 | 프리셋 3건 모두 `final` 도달, 그중 1건은 `unmapped_conditions`가 1개 이상(시드 원문에 "지역 우수기업" 같은 모호 조건 포함) |

### S11. 중복 공고 판별 데모 — `/demo/dedupe` · **P1** · 신규

| 항목 | 내용 |
|---|---|
| 모드 1 (기본) | 프리셋 쌍 선택 — 중복 2쌍(`duplicate_of`에서 파생: #21↔#1, #22↔#2) + 비중복 1쌍(`seed/dedupe_pairs.json`: #3↔#23). 좌우 카드(출처 뱃지 `기업마당`/`K-Startup`, 제목·기관·기간·금액·요약) |
| 중앙 | 유사도 숫자(`font-display text-4xl`, 예 `0.94`) · 판정 체크리스트: `유사도 ≥ 0.92 ✓/✕` · `접수기간 겹침 ✓/✕` → 결정 뱃지 `중복`(성공색)/`검토 필요`(amber)/`별개`(회색) · 설명 `"먼저 수집된 {A}를 대표 공고로 남기고 {B}는 병합합니다. 목록에는 대표 공고만 노출됩니다."` |
| 모드 2 | `직접 비교` 탭 — textarea 2개 → `POST /api/ai/dedupe` → 실시간 임베딩·유사도 |
| 모드 3 (supabase 모드) | 프로그램 선택 → `match_programs` top-5 이웃 표(유사도·기간겹침·결정) |
| 메타 | `임베딩 모델 {VOYAGE_MODEL} · 1024차원 · 코사인 유사도` |
| 완료 기준 | 프리셋 중복 쌍 ≥ 0.92, 비중복 쌍 < 0.85가 실제 임베딩으로 재현된다(시드 원문을 조정해 맞춘다) |

### S12. 데이터 출처·면책 — `/about` · **P0** · 신규(정적)

§13.2의 고지 문구 전체 + 사용 오픈소스 라이선스 목록(`scripts/licenses.ts`가 `package.json` 의존성에서 생성한 `public/licenses.json` 렌더) + Unsplash 이미지 고지 + 사업모델 제약 문장. 사이드바 푸터와 `<Disclaimer />`에서 링크.

---

## 9. API 라우트 명세 (`app/api/**/route.ts`)

공통: 서버 전용. 오류 응답 `{ error: { code: string, message: string } }` + 적절한 상태코드. 스택·키·내부 URL 노출 금지. `Program` 응답에서 `embedding`·`raw_text`는 제외.

| 메서드·경로 | 용도 | 요청 | 응답 | 비고 |
|---|---|---|---|---|
| `GET /api/health` | 상태 확인 | — | `{ ok, dataMode: 'seed'|'supabase', publicDemo, adapters: { kstartup: boolean, bizinfo: boolean }, model: { parse, embed } }` | 키 값 노출 금지(존재 여부만) |
| `GET /api/programs` | 카탈로그 조회(디버그·외부 연동) | `?field=&status=&q=&includeClosed=` | `Program[]` (canonical, PUBLIC_DEMO 필터 적용) | 쿼리를 읽으므로 동적. 캐시는 `loadCatalog()` 내부의 `React.cache`/메모리 TTL 5분 |
| `GET /api/programs/[id]` | 단건 | `await ctx.params` | `Program` | 404 처리 |
| `POST /api/ai/parse` | 공고 원문 → 구조화 (SSE) | `{ text: string }` | `text/event-stream` (§7.1 이벤트) | 12,000자 제한(413) · 10회/분/IP(429) · `maxDuration = 60` |
| `POST /api/ai/dedupe` | 두 텍스트 또는 프로그램 비교 | `{ a: { text } \| { programId }, b: { text } \| { programId } }` | `{ similarity, overlap, decision, model, dimension, neighbors?: { id, title, organization, similarity, decision }[] }` | `neighbors`는 `programId` 입력 + supabase 모드일 때만 |
| `GET /api/ingest` | 수집 파이프라인 1회 | 헤더 `Authorization: Bearer ${CRON_SECRET}` · `?source=kstartup,bizinfo&maxFetch=200` | `{ runs: IngestRun[] }` | 401/503(`INGEST_ENABLED=false`) · `maxDuration = 60` |

프로필은 어떤 라우트에도 보내지 않는다(§0.1-4). `/api/ai/parse`의 "내 프로필로 판정"은 클라이언트에서 실행한다.

---
## 10. 시드 데이터 명세 (`seed/*.json` — 합성 데이터, `is_synthetic: true`)

### 10.0 공통 규칙

- **상대 날짜 토큰**: 시드의 모든 날짜 필드는 ISO(`YYYY-MM-DD`) 또는 상대 토큰을 허용한다. 문법 `^([+-])(\d+y)?(\d+m)?(\d+d)?$` — 예 `"+27d"`(27일 뒤), `"-35m5d"`(35개월 5일 전), `"-39y4m"`(39년 4개월 전). `SeedRepository`는 **요청 시점의 `today`** 기준으로 변환하므로 seed 모드에서는 대회 당일이 언제든 시나리오가 유지된다. `scripts/seed-db.ts`는 실행 시점에 ISO로 **고정**해 저장하므로 supabase 모드로 시연할 때는 **데모 당일 아침에 `npm run seed:db`를 다시 실행**한다(멱등: `source_id` upsert).
- 제목은 실제 사업명을 참고할 수 있으나 연도·회차·금액·기간·조건은 가공한다. 카드에 "시연용" 라벨은 붙이지 않되, 사이드바 푸터(`시연용 합성 데이터`)와 `/about`에 고지한다.
- 세 프로필에서 **서로 다른 결과**가 나오도록 설계한다(심사위원이 전환해 보며 개인화를 확인).
- 기대 판정(§10.2 표의 ①②③ 열)은 **§12 통합 테스트의 기대값**이다. 시드를 바꾸면 테스트도 바꾼다.

### 10.1 `profiles.json` — 데모 프로필 3종

| 키 | ① 테크스타트 주식회사 (디자인 기본) | ② 김창업 전자부품 (첫 채용 예정) | ③ 남도푸드 (개업 2개월) |
|---|---|---|---|
| `business_type` | corporation | individual | individual |
| `industry_code / label` | `J62` / 소프트웨어 개발업 | `C26` / 전자부품 제조업 | `C10` / 식료품 제조업 |
| `region_code / label` | `29` / 광주광역시 (디자인의 서울 → 대회 맥락상 광주로 변경) | `29` / 광주광역시 | `46` / 전라남도 |
| `founded_at` | `-35m5d` (업력 2년 11개월 — `business_age_months = 35`) | `-14m` | `-2m` |
| `employee_count` | 4 | 0 | 2 |
| `ceo_birth_date` | `-39y4m` (만 39세 → 8개월 후 40세) | `-32y` | `-46y` |
| `ceo_gender` | male | male | female |
| `annual_revenue_krw` | 320000000 | null (모름) | null |
| `export_revenue_usd_prev_year` | 0 | null | null |
| `is_vat_exempt` | false | false | false |
| `certifications` | [] | [] | [] |
| `flags` | hiring_planned **true** | hiring_planned **true** | is_food_business **true**, has_online_sales **true**, handles_personal_data **true** |
| `biz_no` | 234-86-01827 | null | null |

### 10.2 `programs.json` — 지원사업 23건 (canonical 21 + 중복 2, 그중 마감 2)

접수기간은 `today` 기준 상대 토큰. 조건 열은 `eligibility` 요약(모두 `source_text` 필수 — 시드에서는 가공 원문 문장을 넣는다). 기대 판정: **P** pass · **C-nm** conditional(near-miss) · **C-nc** conditional(needs_check) · **F** fail · **—** 마감(판정함 제외).

| # | 제목 | 기관 (source) | 분야 | 금액 | 접수 | 조건 요약 | 서류 | ① | ② | ③ |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 초기창업패키지 (하반기) | 창업진흥원 (kstartup) | 창업 | 최대 1억원 | `-20d` ~ `+12d` | 업력 ≤36개월 · 직원 <10 | 사업자등록증명, 중소기업확인서 | **P** (곧 사라짐: 업력 D-약 56) | P | P |
| 2 | 창업도약패키지 3차 | 창업진흥원 (kstartup) | 창업 | 최대 3억원 | `-10d` ~ `+27d` | 업력 ≥36 ∧ ≤84개월 (`gte 36`, `lte 84`) | 중소기업확인서, 재무제표 | **C-nm** (업력 하한 — 약 1개월 후 자격 발생) | F | F |
| 3 | 청년창업사관학교 14기 | 중소벤처기업부 (kstartup) | 창업 | 최대 1억원 | `-3d` ~ `+37d` | ceo_age ≤39 · 업력 ≤36 · 직원 <10 | 사업자등록증명 | **P** | P | F(연령) |
| 4 | 혁신창업스쿨 하반기 | 중소기업진흥공단 (bizinfo) | 창업 | 최대 5,000만원 | `-5d` ~ `+17d` | 직원 ≥5 ∧ <10 · 업력 ≤60 | — | **C-nm** (직원 1명 충원) | C-nm | C-nm |
| 5 | TIPS 프로그램 4분기 | 중소벤처기업부 (kstartup) | R&D | 최대 5억원 | `-3d` ~ `+58d` | 업력 ≤84 · **unmapped: "TIPS 운영사 추천 필요"** | 사업계획서 | **C-nc** | C-nc | C-nc |
| 6 | 중소기업 기술개발 R&D(창업성장) | 중소기업기술정보진흥원 (kstartup) | R&D | 최대 2억원 | `-40d` ~ `+7d` | 업력 ≤84 · 매출 ≤2,000,000,000 | 중소기업확인서, 기업부설연구소 인정서(선택) | **P** (마감임박 · 리드타임 `late`) | C-nc(매출 모름) | C-nc |
| 7 | 수출바우처 4분기 | KOTRA (kstartup) | 수출 | 최대 5,000만원 | `-3d` ~ 상시 | export ≥100,000 | 수출실적증명 | **F** | C-nc(수출 모름) | C-nc |
| 8 | 청년일자리도약장려금 | 고용노동부 (bizinfo) | 고용 | 월 60만원×1년 | `-240d` ~ `+119d` | 직원 <30 (우선지원대상) · hiring_planned = true | 4대보험 가입자명부 | **P** | P | F(채용 계획 없음) |
| 9 | 소상공인 경영개선자금 2차 | 소상공인시장진흥공단 (bizinfo) | 금융 | 최대 7,000만원 | `-30d` ~ `+22d` | 직원 <5 · 업종 in [C, G, I] | 사업자등록증명, 부가세과세표준증명 | **F**(업종) | P | P |
| 10 | 기술보증기금 스타트업 보증 | 기술보증기금 (bizinfo) | 금융 | 최대 30억원 | `-3d` ~ 상시 | 업력 ≤84 | 재무제표, 기술사업계획서 | **P** | P | P |
| 11 | 글로벌 액셀러레이팅 프로그램 | 창업진흥원 (kstartup) | 수출 | 최대 5,000만원 | `-90d` ~ `-3d` | 업력 ≤84 | — | — (마감) | — | — |
| 12 | 중소기업 고용창출장려금 | 고용노동부 (bizinfo) | 고용 | 최대 720만원 | `-240d` ~ `+119d` | 직원 ≥1 · 직원 <100 | 4대보험 가입자명부 | **P** | C-nm(1명 충원 시) | P |
| 13 | 여성기업 지원사업 | 여성기업종합지원센터 (bizinfo) | 경영 | 최대 2,000만원 | `-25d` ~ `+2d` | ceo_gender = female | 여성기업확인서 | **F** | F | P (리드타임 `late`: 확인서 20일) |
| 14 | 광주 청년 일자리 도약 장려금 | 광주광역시 (bizinfo) | 고용 | 최대 1,200만원 | `-14d` ~ `+9d` | region in [29] · (ceo_age ≤39 ∨ hiring_planned) · 직원 <5 · 업력 ≤84 | 중소기업확인서(20일) → **리드타임 `late` 시연용** | **P** (곧 사라짐: 직원수 축 "채용 시") | P | F(지역) |
| 15 | 광주 청년 창업 지원금 | 광주광역시 (bizinfo) | 창업 | 최대 3,000만원 | `-1d` ~ `+45d` | region in [29] · ceo_age ≤39 | 사업자등록증명 | **P** (곧 사라짐: 대표자연령 D-약 243) | P | F |
| 16 | 광주테크노파크 지역특화 R&D | 광주테크노파크 (kstartup) | R&D | 최대 1.5억원 | `-3d` ~ `+30d` | region in [29] · 업력 ≤84 · **unmapped: "지역 우수기업 우선"** | 사업계획서 | **C-nc** | C-nc | F(지역) |
| 17 | 전남 청년창업 활성화 지원 | 전라남도 (bizinfo) | 창업 | 최대 2,000만원 | `-7d` ~ `+35d` | region in [46] · 업력 ≤36 (연령 조건 없음) | 사업자등록증명 | **F**(지역) | F(지역) | **P** |
| 18 | 소상공인 위생·시설 개선 지원 | 전라남도 (bizinfo) | 경영 | 최대 500만원 | `-7d` ~ `+40d` | region in [46] · is_food_business = true · 직원 <5 | 영업신고증 | F | F | **P** |
| 19 | 소공인 특화자금 | 소상공인시장진흥공단 (bizinfo) | 금융 | 최대 5,000만원 | `-3d` ~ 상시 | 업종 prefix C · 직원 <10 | 사업자등록증명 | F(업종) | **P** | P |
| 20 | 벤처기업 R&D 세액공제 컨설팅 지원 | 중소벤처기업부 (kstartup) | 경영 | 최대 1,000만원 | `-3d` ~ `+60d` | certifications includes venture | 벤처기업확인서 | **C-nm**(인증 취득 시) | C-nm | C-nm |
| 21 | [중복] 2026 초기창업패키지 창업기업 모집 | 창업진흥원 (bizinfo) | 창업 | 최대 1억원 | `-20d` ~ `+12d` | = #1 | — | `duplicate_of: #1` (유사도 ≥ 0.92 시연) | | |
| 22 | [중복] 창업도약패키지 3차 사업 참여기업 모집공고 | 창업진흥원 (bizinfo) | 창업 | 최대 3억원 | `-10d` ~ `+27d` | = #2 | — | `duplicate_of: #2` | | |
| 23 | 청년창업사관학교 졸업기업 후속지원 | 중소벤처기업부 (kstartup) | 창업 | 최대 5,000만원 | `-60d` ~ `-5d` | 업력 ≤84 · **unmapped: "청년창업사관학교 졸업기업"** | — | — (마감) | — | — |

- 비중복 유사쌍 시연: #3(청년창업사관학교 14기) ↔ #23(졸업기업 후속지원, 마감) — 제목이 비슷하나 대상·기간이 달라 `distinct`(유사도 < 0.85가 되도록 요약 문구를 충분히 다르게 작성). 이 쌍은 `seed/dedupe_pairs.json`에 `decision: 'distinct'`로 명시한다. 중복 쌍 2개(#21→#1, #22→#2)는 `duplicate_of`에서 파생한다.
- `source`는 **흉내 낸 출처**(`kstartup`/`bizinfo`)를 쓰고 `is_synthetic: true`, `source_id: "SEED-01"…"SEED-23"`로 `unique(source, source_id)` upsert가 되게 한다. `'local'`은 사람이 직접 입력한 지자체 공고(비API), `'synthetic'`은 예약값(현재 미사용).
- `created_at`은 canonical(#1, #2)이 중복(#21, #22)보다 **먼저**여야 한다(먼저 수집된 쪽이 대표).
- 프로필 ① #2는 `gte 36` vs 35개월 → 충족 시점 `founded_at + 36개월` = 약 25일 후 → near-miss. 프로필 ② #2는 업력 하한까지 22개월이 남아 **near-miss 12개월 규칙**(§6.1)에 걸리지 않으므로 F다. 프로필 ③ #8은 `hiring_planned`가 `fixed` 필드이므로 near-miss가 아니라 F다.
- 프로필 ① 기대 집계(판정함, 마감 제외): **P 8건**(1·3·6·8·10·12·14·15) · **C 5건**(2·4·5·16·20) · **F 6건**(7·9·13·17·18·19) — 판정함 헤더의 "N건 대상" 수치는 이 집계와 일치해야 한다. 디자인의 3/2/3은 예시 수치이므로 맞출 필요 없다.
- 프로필 ① "곧 사라짐" 기대(§6.2 규칙 적용): #1 업력 축 D-약 56(`founded_at + 37개월`, rose) · #3 업력 축 D-약 56(연령 축 D-약 243보다 이르므로 업력) · #15 대표자연령 축 D-약 243 · #14 직원수 축 "채용 시"(`직원 <5`, 현재 4인 = 한 명 차이; #14의 `ceo_age ≤39`는 OR 그룹 안이라 반사실 평가에서 루트가 유지되어 항목이 생기지 않는다). #6·#10의 업력 ≤84는 365일 초과로 제외, #8의 `직원 <30`은 한 명 차이 규칙에 걸리지 않아 제외. → 세 축이 모두 한 화면에 나온다. 사이드바 배지(`expiresIn ≤ 90`)는 **2**.
- 각 프로그램에 `summary`(120~200자), `support_type`, `original_url`(실제 기관 대표 URL 또는 `https://www.k-startup.go.kr` / `https://www.bizinfo.go.kr` 루트), `review_status: 'human_verified'`(시드는 사람이 작성한 것으로 간주), `created_at`은 `-N d` 토큰으로 분산(최신순 정렬 시연).

### 10.3 `document_types.json` — 서류 카탈로그 (사람이 확인해 입력 · AI 추정 금지)

| id | 서류명 | 발급처 | 소요(일) | 비고 |
|---|---|---|---|---|
| `biz_registration_cert` | 사업자등록증명 | 홈택스 | 0 | 즉시 |
| `sme_confirmation` | 중소기업확인서 | 중소기업현황정보시스템(sminfo.mss.go.kr) | 20 | 회계자료 준비 포함 최대치 · **`verified_at` 확인 후 조정** |
| `insurance_member_list` | 4대보험 가입자명부 | 4대사회보험 정보연계센터 | 1 | |
| `tax_payment_cert` | 국세·지방세 납세증명 | 홈택스·위택스 | 0 | 즉시 |
| `vat_base_cert` | 부가가치세 과세표준증명 | 홈택스 | 0 | |
| `financial_statements` | 재무제표(표준재무제표증명) | 홈택스 | 0 | 결산 완료 전제 |
| `venture_cert` | 벤처기업확인서 | 벤처확인종합관리시스템 | 45 | 평가 기간 |
| `women_enterprise_cert` | 여성기업확인서 | 여성기업종합정보포털 | 20 | |
| `research_institute_cert` | 기업부설연구소 인정서 | 한국산업기술진흥협회 | 7 | |
| `export_record_cert` | 수출실적증명 | 한국무역협회 | 3 | |
| `food_business_permit` | 식품 영업신고증 | 관할 시·군·구 | 3 | |
| `business_plan` | 사업계획서 | 자체 작성 | null | 소요기간은 팀 역량에 따름 → `unknown` |

### 10.4 `obligations.json` — 법정의무 22건

모든 항목은 `legal_checked_at: null`로 시작한다. `scripts/verify-law.ts` 실행 또는 수동 확인 후에만 채운다. 아래 조문·금액은 **작성 시점의 참고값**이며 시드 확정 전 반드시 대조한다(§7.4).

| id | 분류 | 제목 | `applies_if` | `schedule` | 소관 | 페널티 문구 | 근거(확인 필요) | 중요도 |
|---|---|---|---|---|---|---|---|---|
| OBL-LABOR-001 | labor | 근로계약서 서면 교부 | employee ≥1 ∨ hiring_planned | event hire +0 "채용 즉시" | 고용노동부 | 미교부 시 최대 500만원 벌금·과태료 | 근로기준법 제17조 (`001700`) | high |
| OBL-LABOR-002 | labor | 임금명세서 교부 | employee ≥1 | event wage_payment "임금 지급 시마다" | 고용노동부 | 미교부 시 과태료 최대 500만원 | 근로기준법 제48조 (`004800`) | high |
| OBL-LABOR-003 | labor | 근로자명부·임금대장 작성·보존(3년) | employee ≥1 ∨ hiring_planned | event hire +0 "채용 시 작성" | 고용노동부 | 과태료 최대 500만원 | 근로기준법 제41조·제48조 | normal |
| OBL-LABOR-004 | labor | 직장 내 성희롱 예방교육(연 1회) | employee ≥1 | annual 12/31 | 고용노동부 | 과태료 최대 500만원 (10인 미만은 자료 배포·게시로 갈음 가능) | 남녀고용평등법 제13조 | normal |
| OBL-LABOR-005 | labor | 근로기준법 주요 조항 적용(연차유급휴가·가산수당·부당해고 구제) | employee ≥5 | event threshold_reached "5인 도달 시부터" | 고용노동부 | 임금 미지급 시 형사처벌 | 근로기준법 제56조·제60조 | high |
| OBL-LABOR-006 | labor | 직장 내 괴롭힘 금지 규정 적용 | employee ≥5 | event threshold_reached "5인 도달 시부터" | 고용노동부 | 조치 의무 위반 시 과태료 | 근로기준법 제76조의2·제76조의3 | normal |
| OBL-LABOR-007 | labor | 취업규칙 작성·신고 | employee ≥10 | event threshold_reached "10인 도달 시" | 고용노동부 | 미신고 시 과태료 최대 500만원 | 근로기준법 제93조 (`009300`) | high |
| OBL-LABOR-008 | labor | 노사협의회 설치·고충처리위원 선임 | employee ≥30 | event threshold_reached "30인 도달 시" | 고용노동부 | 과태료 최대 1,000만원 | 근로자참여 및 협력증진에 관한 법률 제4조·제26조 | normal |
| OBL-INS-001 | insurance | 4대보험 자격취득 신고 | employee ≥1 ∨ hiring_planned | event hire +14 "채용 후 14일 이내" | 국민건강보험공단 등 | 미신고 시 과태료(보험별 상이) | 국민건강보험법 제8조 · 국민연금법 제21조 · 고용보험법 제15조 | high |
| OBL-INS-002 | insurance | 4대보험 월별 보험료 납부 | employee ≥1 | monthly 10 | 국민건강보험공단 | 연체금 발생 | 국민건강보험법 제78조 | high |
| OBL-INS-003 | insurance | 보수총액 신고(연 1회) | employee ≥1 | annual 3/15 | 근로복지공단·건보공단 | 과태료·정산 지연 | 고용산재보험료징수법 제16조의10 | normal |
| OBL-TAX-001 | tax | 원천세(소득세·지방소득세) 신고·납부 | employee ≥1 | monthly 10 | 국세청 | 미납 시 납부지연가산세 | 소득세법 제128조 (`012800`) | high |
| OBL-TAX-002A | tax | 부가가치세 신고·납부(법인·분기) | business_type = corporation ∧ ¬is_vat_exempt | quarterly [1,4,7,10] 25 | 국세청 | 무신고 시 가산세 20% | 부가가치세법 제48조·제49조 | high |
| OBL-TAX-002B | tax | 부가가치세 신고·납부(개인 일반과세·반기) | business_type = individual ∧ ¬is_vat_exempt | semiannual [1,7] 25 | 국세청 | 무신고 시 가산세 20% | 부가가치세법 제48조·제49조 | high |
| OBL-TAX-003 | tax | 법인세 신고·납부(12월 결산) | business_type = corporation | annual 3/31 | 국세청 | 무신고 시 가산세 20% | 법인세법 제60조 | high |
| OBL-TAX-004 | tax | 종합소득세 신고·납부 | business_type = individual | annual 5/31 | 국세청 | 무신고 시 가산세 20% | 소득세법 제70조 | high |
| OBL-TAX-005 | tax | 간이지급명세서(상용근로소득) 제출 | employee ≥1 | monthly 31 (말일 클램프) — **2026년부터 월별 제출 여부 확인** | 국세청 | 미제출 가산세 | 소득세법 제164조의3 | normal |
| OBL-TAX-006 | tax | 사업장현황신고(면세사업자) | is_vat_exempt = true | annual 2/10 | 국세청 | 일부 업종 가산세 | 소득세법 제78조 | normal |
| OBL-PERMIT-001 | permit | 통신판매업 신고 | has_online_sales = true | event business_start "판매 개시 전" | 관할 시·군·구 | 미신고 영업 시 벌금 | 전자상거래법 제12조 | high |
| OBL-PERMIT-002 | permit | 식품 영업신고·위생교육 | is_food_business = true | annual 12/31 (위생교육) | 관할 시·군·구 | 영업정지·과태료 | 식품위생법 제37조·제41조 | high |
| OBL-PRIV-001 | privacy | 개인정보 처리방침 수립·공개 | handles_personal_data ∨ has_online_sales | event business_start "서비스 개시 전" | 개인정보보호위원회 | 과태료 최대 1,000만원 | 개인정보 보호법 제30조 | normal |
| OBL-PRIV-002 | privacy | 전자상거래 사업자 표시사항 게시 | has_online_sales = true | event business_start "판매 개시 전" | 공정거래위원회 | 과태료 최대 1,000만원 | 전자상거래법 제10조·제13조 | normal |

### 10.5 인원 임계값 참조표 (시뮬레이터·시드 정합성 기준 — 확정 전 law.go.kr 대조)

| 임계 | 새로 생기는 의무(시드 id) | 사라지는 자격 축(프로그램 조건) |
|---|---|---|
| 1인 이상 | LABOR-001·002·003·004, INS-001·002·003, TAX-001·005 | — |
| 5인 이상 | LABOR-005(연차·가산수당·부당해고), LABOR-006(괴롭힘 금지 적용) | 소상공인 기준(직원 <5: 광업·제조·건설·운수는 <10) → #9·#14·#18 |
| 10인 이상 | LABOR-007(취업규칙), 성희롱 예방교육 정식 실시 | #1·#3·#4·#19 (직원 <10) |
| 30인 이상 | LABOR-008(노사협의회·고충처리), 채용절차법 적용 | #8 (직원 <30) |
| 50인 이상 | 장애인 의무고용(3.1%), 안전·보건관리자 선임(업종별) — **시드 미포함(P2)** | — |
| 100인 이상 | 장애인 고용부담금 납부 — 디자인 mock의 "10인" 표기는 오류 | #12 |
| 300인 이상 | 고용형태 공시 — 디자인 mock의 "30인" 표기는 오류 | — |

### 10.6 `announcements/*.txt` — AI 파싱 데모 원문 3건 (각 800~2,000자, 실제 공고문 문체로 작성)

| 파일 | 내용 요구 | 기대 결과 |
|---|---|---|
| `01_광주_청년일자리도약장려금.txt` | 정형적인 공고. 지역(광주), 상시근로자 10인 미만, 업력 7년 이내, 만 39세 이하 대표자 **또는** 청년 채용 예정("다음 중 하나"), 접수기간 명시, 제출서류에 중소기업확인서·4대보험 가입자명부 | `conditions` 3 + `alternatives` 1(2개 조건), unmapped 0, 서류 2건 카탈로그 매칭 |
| `02_초기창업패키지_모집공고.txt` | K-Startup 문체. 창업 3년 이내, 예비창업자 제외 문구, 우대사항(가점) 포함 — **우대는 조건이 아님**을 검증 | 업력 lte 36 · unmapped 0 · 우대사항이 조건으로 들어가지 않음 |
| `03_지역특화_RnD_공고.txt` | 모호 조건 포함: "지역 우수기업 우선", "기술보증기금 또는 운영사 추천 기업", "예산 소진 시까지" | `unmapped_conditions` ≥ 2 · `is_rolling = true` · 종합 `needs_check` |

### 10.7 `seed/embeddings.json` (생성물)

`npm run seed:embed`가 `programs.json`의 `buildEmbeddingText()` 결과를 Voyage로 임베딩해 `{ [programId]: number[1024] }`로 저장. 커밋한다(seed 모드 데모가 키 호출 없이 동작). `programs.json`이 바뀌면 재생성.

---
## 11. 구현 순서 — Phase별 완료 기준 (순서를 바꾸지 않는다)

| Phase | 작업 | 완료 기준 (전부 만족해야 다음 Phase) |
|---|---|---|
| **0. 디자인 통합** (§4) | `design/` 커밋 → 폰트·globals.css·layout → 앱 셸·사이드바·라우팅 → 8화면 분해(§4.2) → §4.5 수정. 데이터는 임시로 `lib/fixtures/design.ts`(디자인 상수를 그대로 옮긴 것)에서 공급 | §4.6 전체. `npx tsc --noEmit`·`npm run lint` 통과 |
| **1. 타입 + 엔진 + 테스트** (§5, §6, §12.1) | `lib/types.ts` → `lib/constants.ts`(REGIONS·INDUSTRIES·CERT_LABEL·FIELD_META) → `lib/engine/*` → vitest. **UI를 건드리지 않는다** | `npm test` 전부 통과(§12.1 엔진 케이스 1~38 전부). 엔진에 `react`·`next`·`@supabase` import 없음 |
| **2. 시드 + 로컬 데이터 + P0 화면 연결** (§10, §3.4, §8 S0~S8·S12) | `seed/*.json` 작성(상대 날짜 토큰) → `SeedRepository` → `lib/view/*` 매퍼 → `store/*Provider`(localStorage) → `(app)/layout.tsx`에서 카탈로그 주입 → 8화면을 실데이터로 전환하고 `lib/fixtures/design.ts` 삭제 → S0 온보딩 → `/about`·`<Disclaimer />` | **P0 완료 = §1.4 시나리오 1~4·8이 끊기지 않고 시연됨.** 프로필 ①의 판정함 집계가 §10.2(P 8·C 5·F 6)와 일치. 새로고침 후 상태 유지 |
| **3. Supabase** (§5.5) | 프로젝트 생성(사람) → 환경변수 2개(`SUPABASE_URL`, `SUPABASE_SECRET_KEY`) → `supabase/migrations/0001_init.sql` 적용 → `lib/data/supabase.ts`(서버 전용 secret 클라이언트, `import 'server-only'`) → `SupabaseRepository` → `scripts/seed-db.ts`(시드 → 테이블, 상대 날짜 확정, `seed/embeddings.json`이 있으면 `embedding` 컬럼도 적재) → `DATA_MODE` 자동 판별 → `.env.example` 커밋 | `DATA_MODE=supabase`에서 Phase 2 완료 기준이 동일하게 통과. `match_programs` RPC가 #21→#1, #22→#2를 0.92 이상으로 반환 |
| **4. AI 모듈 + 데모 화면** (§7.1, §7.2, §8 S10·S11, §9) | `lib/ai/schema.ts`·`prompts.ts`·`claude.ts`·`voyage.ts`·`postprocess.ts` → `scripts/embed-seed.ts`(Voyage → `seed/embeddings.json`, Supabase 불필요) → `/api/ai/parse`(SSE) → `/api/ai/dedupe` → S10 → S11 → 사이드바 "AI 데모" 그룹 | 프리셋 3건 파싱 성공, `03_*`에서 unmapped ≥ 2. 중복 쌍 ≥ 0.92·비중복 쌍 < 0.85. 가드레일(413/429) 동작 |
| **5. 수집 파이프라인** (§7.3, §7.5) | `lib/ingest/kstartup.ts` → `normalize.ts` → `run.ts` → `scripts/ingest.ts` → `/api/ingest` → `vercel.json` cron → 사이드바 푸터 동기화 시각. `bizinfo.ts`는 인터페이스만 구현하고 키 없으면 skip | 로컬 `npm run ingest -- --maxFetch 30`으로 K-Startup 실공고 30건이 `is_synthetic=false`로 적재·파싱·임베딩·중복검사까지 완료되고 `ingest_runs`에 1행 기록. `PUBLIC_DEMO=true`에서는 화면에 나오지 않음 |
| **6. P1 마무리** (§8 S9, §6.5, §7.4) | `document_types` + `ProgramDocument` 매칭 → S9 리드타임 → 판정함 "준비서류 확인" 버튼 → 캘린더 지원사업 마감 점 → 판정 이력 CSV → `scripts/verify-law.ts` 실행 후 시드의 `legal_checked_at` 갱신(실패 시 수동 확인 기록) | 시나리오 5 시연. `legal_checked_at`이 채워진 의무는 "확인 중" 배지가 사라짐 |
| **7. 배포·QA** (§12.2, §12.3, §13) | 라이선스 목록 생성 → Vercel 프로젝트(Node 24, 환경변수, `PUBLIC_DEMO=true`, `CRON_SECRET`) → 프로덕션 배포 → §12.3 수동 QA → README 갱신 | 공개 URL에서 §1.4 시나리오 8단계 전부 통과. `/api/health`가 `publicDemo: true`. Lighthouse 접근성 ≥ 90(데스크톱) |

**P2 (시간이 남을 때만, 별도 승인 후):** Supabase 익명 인증 동기화 · 관리자 검수 화면(`ai_draft → human_verified`) · 공휴일 테이블 · 이메일/푸시 발송 · 모바일 사이드바 접힘 · Unsplash 이미지 로컬화.

---

## 12. 테스트

### 12.1 엔진 단위 테스트 (vitest, `lib/engine/__tests__/*.test.ts`) — 필수 케이스

```
evaluate
  1. 모든 조건 pass → eligible
  2. 조건 1개 fail(fixed 필드) → ineligible, nearMiss null
  3. annual_revenue_krw null인 조건 → check (ineligible 아님), 종합 needs_check
  4. unmapped_conditions 1개 → criteria에 check 행 추가, 종합 needs_check
  5. AND 안의 OR: OR 중 하나 pass → 그룹 pass
  6. OR 전부 fail → 그룹 fail
  7. OR에 check 포함·pass 없음 → check
  8. industry_code prefix: 조건 "C" vs 프로필 "C26" → pass; 조건 "C10" vs "C26" → fail
  9. region_code in ["ALL"] → pass
 10. 빈 조건 → check 1행 (자동 pass 금지)
 11. near-miss: employee_count gte 5 vs 4 → nearMiss.message "1명 충원"
 12. near-miss: business_age_months gte 36 vs 35(founded −35m5d) → "약 25일 후" 자격 발생 날짜 메시지 ; gt 36 vs 35 → 임계 37
 13. non-near-miss: business_age_months gte 36 vs 14 (22개월) → nearMiss null
 14. non-near-miss: fail 2개 → nearMiss null
 15. non-near-miss: ceo_age lte 39 vs 46(상한 초과) → nearMiss null
 16. certifications includes venture 미보유 → near-miss(acquirable)
expiry
 17. business_age_months lte 36, founded −35m5d → flip = founded + 37개월, axis 업력, expiresIn ≈ 56 ; 엔진 evaluate가 flip 전날 pass·flip 당일 fail (같은 헬퍼 사용 검증)
 18. ceo_age lte 39, 생일 39y4m 전 → axis 대표자연령, expiresIn ≈ 243
 19. 두 축 모두 있으면 이른 쪽 1건만 ; 충족된 OR 그룹 안의 상한 리프(#14 ceo_age)는 반사실 평가로 항목 미생성
 20. employee_count lt 5, 현재 4 → expiresIn null, axis 직원수
 21. employee_count lt 30, 현재 4, hiring_planned → 항목 없음
 22. ineligible 프로그램 → null
 23. ceo_birth_date null → 연령 축 항목 없음
schedule
 24. monthly 10, today 9/3 → 9/10 ; today 9/11 → 10/10
 25. monthly 31, 2월 → 2/28(또는 29) 클램프
 26. quarterly [1,4,7,10] 25, today 9/3 → 10/25
 27. annual 5/31, today 9/3 → 다음 해 5/31
 28. event_relative → null ; Task.type 'event', dueDate = label
 29. occurrencesBetween(monthly 10, 9/1~10/31) → [9/10, 10/10]
 30. shiftToBusinessDay(토) → 월
 31. generateTasks: 의무 applies_if fail이면 미생성 ; doneIds 반영 ; custom 병합 ; overdue 플래그
simulate
 32. 4 → 5: LABOR-005·006 신규, 직원 <5 프로그램 lost
 33. 4 → 10: 5인 + 10인 의무 누적
 34. 5 → 4: removedObligations에 LABOR-005
leadTime
 35. apply_end +9d, lead 20 → late ; lead 0 → ok ; lead 7 → tight(경계 3일 규칙 확인) ; lead null → unknown ; is_rolling → rolling
dedupe
 36. cosineSimilarity([1,0],[1,0]) = 1 ; 직교 = 0
 37. periodsOverlap: 겹침/비겹침/rolling/null
 38. decideDuplicate(0.95,true)=duplicate ; (0.95,false)=review ; (0.86,true)=review ; (0.5,true)=distinct
postprocess (lib/ai/__tests__)
 39. 알 수 없는 field → unmapped로 이동
 40. value "36" → 36 (number 필드) ; "true" → true ; "29,46" (in) → ["29","46"]
 41. alternatives 원소 1개(조건 2개) → 루트 AND 안의 OR 그룹 1개 ; 원소 2개 → OR 그룹 2개 ; 조건 1개짜리 원소 → 그룹 없이 루트에 직접
 42. confidence 0.4 → unmapped에 확신도 항목 추가
seed
 43. 상대 날짜 토큰 "+27d" / "-34m" / "-39y4m" / ISO / 잘못된 토큰(throw)
```

### 12.2 통합 스모크 (`npm run build` 이후, 로컬 서버 대상 스크립트 `scripts/smoke.ts`)

- `GET /api/health` 200, `dataMode`가 환경과 일치.
- `GET /api/programs` — `embedding`·`raw_text` 필드가 없다. `PUBLIC_DEMO=true`면 `is_synthetic=false` 행이 없다.
- `POST /api/ai/parse` 프리셋 `01` → `final` 이벤트 수신, zod 통과. (`AI_MOCK=true`면 `seed/parsed/01.json`을 가짜 스트림으로 반환 — 테스트·오프라인 개발 전용. **UI에 `MOCK` 배지를 반드시 표시**하고 프로덕션에서는 설정 금지)
- `POST /api/ai/parse` 13,000자 → 413. 11회 연속 → 429.
- `GET /api/ingest` 헤더 없음 → 401.
- 시드 프로필 ①·②·③으로 `evaluateProgram` 전체 실행 → §10.2 표의 기대 판정(①②③ 열)과 전부 일치(뷰 매퍼 포함 테스트).

### 12.3 수동 QA 체크리스트 (배포 전)

```
[ ] 새 브라우저(시크릿)에서 / → 온보딩 → 데모 프로필 ① → 대시보드 (스켈레톤 후 즉시 렌더, 잘못된 리다이렉트 없음)
[ ] 사이드바 8+2 메뉴 이동, 새로고침 유지, 활성 상태 표시
[ ] 판정함: 대상 카드 요건표 펼침 → 행 클릭 시 원문 근거 표시 / 조건부 2종(near-miss·확인 필요) 문구 / 제외 사유
[ ] 할 일: 추가·수정·삭제·완료 → 새로고침 유지, 폼 포커스 유지, 캘린더 반영
[ ] 곧 사라짐: 세 축 표시, D-day 색, "지금 신청하기" 새 탭
[ ] 시뮬레이터: 4→5→10→30 누적, 4→3 감소 모드
[ ] 마이페이지: 직원 수 저장 → 재판정·이력 1행 / 데모 프로필 전환 / 내보내기 / 초기화 → 온보딩
[ ] 준비서류: #14에서 late 배너
[ ] AI 파싱: 프리셋 3건 스트리밍 → 구조화 → 즉시 판정. 네트워크 탭에 프로필 전송 없음 확인
[ ] 중복 판별: 프리셋 중복/비중복, 직접 비교
[ ] /about: 출처·면책·라이선스·합성데이터 고지
[ ] 개발자도구: 콘솔 에러 0, 클라이언트 번들에 API 키 문자열 없음 (빌드 산출물 grep)
[ ] 1024px·1440px 너비에서 레이아웃 깨짐 없음
[ ] (supabase 모드) 데모 당일 `npm run seed:db` 재실행 → 상대 날짜가 오늘 기준으로 재고정됐는지 #1 D-day 확인
```

---

## 13. 컴플라이언스 · 보안 · 비범위

### 13.1 대회 규정 체크리스트

| 규정 | 구현 |
|---|---|
| 공고 수집은 공식 오픈 API만, 누리집 크롤링 금지 | `lib/ingest/*`는 `apis.data.go.kr`·`bizinfo.go.kr/uss/rss/bizinfoApi.do`만 호출. HTML 파서 의존성 없음(§0.1-5) |
| 기업마당 API 별도 인증키 | `BIZINFO_API_KEY` 미발급 상태 반영. 배포 URL 확정 후 신청 → 키 투입만으로 활성 |
| 공개 배포 URL에는 더미·합성 데이터만 | `PUBLIC_DEMO=true` + `is_synthetic` 필터(§0.1-6). 사이드바 푸터 "시연용 합성 데이터" |
| 오픈소스·공개 데이터셋 라이선스 고지 | `/about`에 `public/licenses.json` 렌더 + 데이터 출처 문구 |
| 두 기관 중복 게시 | §3.3-3, §6.6 중복제거 + 시연(S11) |

### 13.2 고지 문구 (`/about` 및 `<Disclaimer />` — 그대로 사용)

```
· 본 서비스의 지원사업 정보는 기업마당(bizinfo.go.kr)·K-Startup(공공데이터포털) 공식 오픈 API를 통해 수집한 것을 기반으로 하며,
  공개 시연 버전에는 시연용 합성 데이터만 게시되어 있습니다. 실제 공고와 내용·일정이 다를 수 있습니다.
· 법정의무 정보는 국가법령정보센터(law.go.kr)를 참조한 참고 자료이며 법적 자문이 아닙니다.
  각 항목의 "확인 기준일"을 확인하시고, 개별 사안은 관할 기관 또는 전문가에게 확인하시기 바랍니다.
· 자격 판정은 입력하신 기업 정보와 공고의 요건을 규칙 기반으로 대조한 결과이며, 최종 자격은 주관기관의 심사에 따릅니다.
  AI(언어모델)는 공고문을 구조화하는 데만 사용되며 판정·법령 해석에는 사용되지 않습니다.
· 입력하신 기업 정보는 이 브라우저에만 저장되며 서버로 전송되지 않습니다.
· 알림은 현재 버전에서 앱 내 배너로만 제공됩니다.
· 사용 이미지: Unsplash (Unsplash License). 사용 오픈소스 라이선스: 아래 목록 참조.
```

### 13.3 비범위 (Out of Scope) — 구현하지 않는다

신청서 자동 작성 · 실시간 크롤링 · 세무·노무·법률 상담 기능 · 회원가입/로그인 · 결제 · 모바일 앱 · AI에 의한 법령 해석 · 이메일/푸시 실제 발송 · 관리자 검수 화면(P2 승인 시) · 다국어 · 사업자번호 진위 조회(국세청 API) · 다크 모드.

### 13.4 보안·개인정보

- 키는 서버 전용, `.env*` gitignore 유지, `.env.example`만 커밋(부록 A). 빌드 후 `.next/static` 에서 키 문자열 grep으로 누출 검사(§12.3).
- 프로필·할 일·이력은 서버에 저장·전송하지 않는다. 서버 로그에 요청 본문(공고 원문)을 남기지 않는다(길이·소요시간만).
- `/api/ai/*` 입력 길이 제한·레이트리밋, `/api/ingest`는 `CRON_SECRET`, Supabase는 RLS 읽기 전용 + secret 키 서버 한정.
- 외부 링크는 `rel="noopener noreferrer"`. 사용자 입력은 React 기본 이스케이프에 맡기고 `dangerouslySetInnerHTML`을 쓰지 않는다(기업마당 `bsnsSumryCn`의 HTML은 서버에서 태그 제거).

### 13.5 사업모델 제약 (설계 반영)

세무사·노무사·변호사 등 자격사에 대한 유료 알선은 법적으로 제한된다(세무사법 제2조의2, 변호사법 제34조 — 조문은 제출 전 재확인). 따라서 전문가 연결은 **무료 정보 링크(관할 기관·공식 안내 페이지)로만** 제공하고, 수익모델은 비자격 서비스 제공자(컨설팅·마케팅·디자인·물류·SaaS) 대상 월정액 게재료로 한정한다. 이 산출물에는 결제·광고 게재 기능을 넣지 않는다.

---

## 14. 심사기준 대응

| 기준 | 배점 | 이 산출물의 대응 |
|---|---|---|
| 문제 정의 적절성 | 25 | §1.2 "모르는 것을 모른다" + 비용 비대칭 + 자격 소멸 + 채용 임계값 → 대시보드 배너·곧 사라짐·시뮬레이터가 문제를 화면으로 증명 |
| AI 활용도·구현성 | 25 | §3.1 3계층 경계(읽기=AI, 판단=코드) · S10 실제 파싱 스트리밍 + `unmapped` 노출 · S11 임베딩 중복제거 · 단위 테스트 43개(엔진 38 + 후처리·시드 5) |
| 실무·현장 적용 가능성 | 20 | 3-state 판정·near-miss 안내 · 서류 리드타임 역산(S9) · 법령 확인일 노출 · 오픈 API 규정 준수 · 프로필 비전송 |
| 창의성 | 15 | 지원사업 + 법정의무 + 자격 소멸을 한 프로필로 통합 · 직원 시뮬레이터(뽑기 전에 본다) · 푸시형 전환 |
| 발표·공감도 | 15 | §1.4 5분 동선 · 데모 프로필 3종 전환 · "첫 채용" 장면(시뮬레이터 0→5인) |

---

## 부록 A. `.env.example` (값 없이 커밋 · `.gitignore`에 `!.env.example` 추가)

```bash
# ── AI ─────────────────────────────────────────────
ANTHROPIC_API_KEY=            # 필수. 서버 전용
ANTHROPIC_MODEL=claude-sonnet-5          # 선택. 저비용: claude-haiku-4-5
VOYAGE_API_KEY=               # 필수(중복제거). 서버 전용
VOYAGE_MODEL=voyage-4                    # 선택. 대안: voyage-multilingual-2 (1024차원 동일)

# ── 공공 API ────────────────────────────────────────
DATA_GO_KR_SERVICE_KEY=       # 공공데이터포털 Decoding 키 (URLSearchParams로 사용)
DATA_GO_KR_SERVICE_KEY_ENCODED=          # 참고용. 코드에서는 사용하지 않음
BIZINFO_API_KEY=              # 기업마당 crtfcKey. 비어 있으면 어댑터 비활성
LAW_GO_KR_OC=                 # 국가법령정보센터 OC. scripts/verify-law.ts 전용

# ── Supabase (없으면 DATA_MODE=seed) ───────────────
SUPABASE_URL=                 # 서버 전용. 브라우저는 Supabase에 직접 접속하지 않음
SUPABASE_SECRET_KEY=          # 서버 전용(읽기·수집·시드 쓰기)

# ── 앱 ─────────────────────────────────────────────
DATA_MODE=                    # seed | supabase (비우면 자동: SUPABASE_URL 유무로 판별)
PUBLIC_DEMO=true              # 프로덕션 true: is_synthetic=true만 노출
INGEST_ENABLED=true           # false면 /api/ingest 503
CRON_SECRET=                  # openssl rand -hex 32
AI_MOCK=                      # 테스트 전용. 프로덕션 설정 금지
```

## 부록 B. 의존성 · 스크립트

```bash
npm i @anthropic-ai/sdk @supabase/supabase-js zod date-fns fast-xml-parser server-only
npm i -D vitest @vitest/coverage-v8 tsx dotenv
```

`package.json` scripts에 추가: `"test": "vitest run"`, `"test:watch": "vitest"`, `"typecheck": "tsc --noEmit"`, `"ingest": "tsx scripts/ingest.ts"`, `"seed:db": "tsx scripts/seed-db.ts"`, `"seed:embed": "tsx scripts/embed-seed.ts"`, `"law:verify": "tsx scripts/verify-law.ts"`, `"licenses": "tsx scripts/licenses.ts"`, `"smoke": "tsx scripts/smoke.ts"`. `"lint"`는 `"eslint ."`로 변경. `package.json`에 `"engines": { "node": ">=20.9" }` 추가(Vercel은 프로젝트 설정에서 24.x).

## 부록 C. 코드표·토큰 (`lib/constants.ts`)

- `REGIONS`: `{ code: '11', label: '서울특별시', short: '서울' } …` 17개 (코드는 §7.1 프롬프트의 표와 동일).
- `INDUSTRIES`: KSIC 대분류 21 + §8 S0의 중분류 12. `label`은 사용자 표시용, `code`는 prefix 매칭용.
- `CERT_LABEL`: `venture: '벤처기업 인증'`, `innobiz: '이노비즈'`, `mainbiz: '메인비즈'`, `research_institute: '기업부설연구소'`, `social_enterprise: '사회적기업'`, `women_enterprise: '여성기업 확인'`, `disabled_enterprise: '장애인기업 확인'`.
- `FIELD_META`: §5.1. `DOC_ALIASES`: §7.1 후처리.
- 색 임계값: `EXPIRY_ROSE = 60`, `EXPIRY_AMBER = 90`, `CLOSING_DAYS = 7`, `TASK_WINDOW = { past: 30, future: 60 }`, `LEADTIME_TIGHT_DAYS = 3`, `DEDUPE = { duplicate: 0.92, review: 0.85 }`, `NEAR_MISS_TIME_MONTHS = 12`.
- 상대 날짜 토큰 파서 `resolveDate(token: string, today: Date): string` — §10.0 문법. `lib/engine/format.ts`에 두고 시드 로더·테스트가 공유.

## 부록 D. v1.0 → v2.0 변경 로그

| 구분 | v1.0 | v2.0 | 이유 |
|---|---|---|---|
| 화면 체계 | 통합 타임라인 1개가 중심 | 사이드바 8화면(디자인 확정) + 4 신규 | 디자인이 먼저 확정됨. 타임라인의 "두 축 혼합" 가치는 대시보드 배너(§6.7)·캘린더 마감 점·시뮬레이터로 흡수 |
| "직원 채용 예정" 토글 하이라이트 | 대시보드 토글 | 직원 시뮬레이터 슬라이더 + `hiring_planned` 플래그 | 디자인 반영. 시연 효과 동일 |
| 의무 상세 페이지(S4) | 별도 라우트 | 판정함 "법정의무" 탭 + 할 일 카드 + 캘린더 패널 | 디자인에 상세 페이지 없음. 4블록(무엇/언제/안 하면/어떻게)은 카드 필드로 존재 |
| 스택 | Next 14, Supabase 전면 | Next 16.3.4, 카탈로그만 Supabase, 사용자 상태 localStorage | 실제 스캐폴드 버전·프라이버시·규정 |
| 임베딩 | 미정 1536 | Voyage voyage-4 1024 | 키 보유·무료 한도·pgvector 인덱스 한도 |
| 파싱 출력 | 자유 JSON + 재시도 | structured outputs + zod + 후처리 | 형식 실패 제거 |
| 판정 상태 | 3-state | 3-state + near-miss → UI 3라벨(pass/conditional/fail) 매핑 | 디자인의 "조건부" 개념 수용, 안전장치 유지 |
| 신규 엔진 | — | expiry · simulate · leadTime · alerts | 디자인의 곧 사라짐·시뮬레이터, v1.0 S5 리드타임 |
| 법령 확인 | "law.go.kr에서 확인" 지시만 | `scripts/verify-law.ts` + `legal_checked_at` + "확인 중" 배지 | 사실 확인 절차를 코드로 |
| 시드 | 절대 날짜 | 상대 날짜 토큰 | 대회 당일에도 시나리오 유지 |
| 인원 임계값 | 언급 없음 | §10.5 참조표(디자인 mock의 법적 오류 수정) | 사용자 손실 방지 |

## 부록 E. 용어

| 용어 | 뜻 |
|---|---|
| 카탈로그 | 공개·공유되는 지원사업·법정의무·서류 데이터(Supabase 또는 seed) |
| canonical | 중복 그룹의 대표 공고(`duplicate_of IS NULL`) |
| near-miss(조건부) | 실패 조건이 1개이고 충원·인증·시간으로 해소 가능한 상태 |
| needs_check(확인 필요) | 프로필 값 없음·조건 매핑 불가·원문 모호로 자동 판정을 유보한 상태 |
| flip | 시간·인원 조건이 뒤집혀 자격이 소멸(또는 발생)하는 시점 |
| P0/P1/P2 | 데모 필수 / 차별화 / 여유 시 |

---

*문서 끝. 이 문서와 코드가 충돌하면 문서를 고치고 사람에게 알린다 — 조용히 코드만 바꾸지 않는다.*
