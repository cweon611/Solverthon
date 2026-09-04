import Image from "next/image";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "데이터 출처·면책 — 비즈버디",
  description: "비즈버디가 사용하는 데이터의 출처와 면책 사항, 오픈소스 라이선스 고지입니다.",
};

// §8 S12 · §13.2 고지 문구를 그대로 싣는다. 앱 셸 없음, 정적 페이지.
const NOTICES = [
  "본 서비스의 지원사업 정보는 기업마당(bizinfo.go.kr)·K-Startup(공공데이터포털) 공식 오픈 API를 통해 수집한 실제 공고만 게시합니다. 자격 요건·지원 규모는 AI가 공고 원문(첨부파일 포함)에서 읽어 정리한 초안이며, 사람의 검수를 거치지 않은 항목은 화면에 그렇게 표시합니다.",
  "수집된 실제 공고는 원문 링크를 누르면 해당 공고의 상세 페이지로 연결됩니다. 다만 수집 시점 이후 공고가 마감·변경되었을 수 있으니 반드시 포털에서 최신 내용을 확인하시기 바랍니다.",
  "법정의무 정보는 국가법령정보센터(law.go.kr)를 참조한 참고 자료이며 법적 자문이 아닙니다. 각 항목의 \"확인 기준일\"을 확인하시고, 개별 사안은 관할 기관 또는 전문가에게 확인하시기 바랍니다.",
  "자격 판정은 입력하신 기업 정보와 공고의 요건을 규칙 기반으로 대조한 결과이며, 최종 자격은 주관기관의 심사에 따릅니다. AI(언어모델)는 공고문을 구조화하는 데만 사용되며 판정·법령 해석에는 사용되지 않습니다.",
  "입력하신 기업 정보(프로필·할 일·설정·이력·신청서 초안)는 로그인 계정에 저장되어 어느 기기에서든 복원됩니다. 비밀번호는 해시로만 저장하며, 자격 판정은 서버가 아닌 이 브라우저의 코드가 수행합니다.",
  "알림은 현재 버전에서 앱 내 배너로만 제공됩니다.",
  "사용 이미지: Unsplash (Unsplash License). 사용 오픈소스 라이선스: 아래 목록 참조.",
];

const SOURCES = [
  { name: "K-Startup 창업지원포털", org: "창업진흥원 · 공공데이터포털", url: "https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do" },
  { name: "기업마당", org: "중소벤처기업부", url: "https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do" },
  { name: "국가법령정보센터", org: "법제처", url: "https://www.law.go.kr" },
];

// scripts/licenses.ts가 생성한 public/licenses.json을 읽는다 (§8 S12).
// 각 패키지의 package.json에 적힌 값을 그대로 옮긴 것이며 추정하지 않는다.
interface LicenseEntry { name: string; version: string; license: string; kind: string }

function loadLicenses(): LicenseEntry[] {
  try {
    const raw = readFileSync(resolve(process.cwd(), "public/licenses.json"), "utf8");
    return (JSON.parse(raw) as { entries: LicenseEntry[] }).entries;
  } catch {
    return [];
  }
}

export default function AboutPage() {
  const licenses = loadLicenses();

  return (
    <div className="min-h-full bg-[#F5F6F8] py-10 px-6">
      <div className="mx-auto max-w-3xl space-y-5">

        <div className="flex items-center gap-2.5">
          <Image src="/brand/logo.png" alt="비즈버디" width={176} height={56} priority className="h-9 w-auto" />
          <Link href="/dashboard" className="ml-auto text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#dddaf4] transition-colors">
            ← 대시보드
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-display font-bold text-[#111111]">데이터 출처 · 면책</h1>
          <p className="text-[#888888] text-sm mt-1">이 서비스가 무엇을 근거로 판정하는지, 무엇을 보장하지 않는지 밝힙니다.</p>
        </div>

        <section className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-[#E4E6EA]">
            <h2 className="text-[#111111] font-semibold text-sm">고지 사항</h2>
          </div>
          <ul className="px-5 py-4 space-y-3">
            {NOTICES.map((text) => (
              <li key={text} className="flex items-start gap-2">
                <span className="text-[#6E62C2] text-xs mt-1 shrink-0">·</span>
                <p className="text-[#444444] text-xs leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-[#E4E6EA]">
            <h2 className="text-[#111111] font-semibold text-sm">데이터 출처</h2>
          </div>
          <div className="divide-y divide-[#F5F6F8]">
            {SOURCES.map((s) => (
              <div key={s.name} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[#111111] text-sm font-medium">{s.name}</p>
                  <p className="text-[#888888] text-xs mt-0.5">{s.org}</p>
                </div>
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-lg font-medium hover:bg-[#dddaf4] transition-colors shrink-0">
                  바로가기
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-[#E4E6EA]">
            <h2 className="text-[#111111] font-semibold text-sm">오픈소스 라이선스</h2>
          </div>
          <div className="px-5 py-4">
            {licenses.length === 0 ? (
              <p className="text-[#888888] text-xs">라이선스 목록을 생성하려면 npm run licenses 를 실행하세요.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {licenses.map((l) => (
                  <div key={l.name} className="flex items-center justify-between bg-[#F5F6F8] rounded-xl px-3 py-2">
                    <span className="text-[#444444] text-xs font-mono truncate">{l.name}</span>
                    <span className="text-[#888888] text-[10px] shrink-0 ml-2">{l.license}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm px-5 py-4">
          <h2 className="text-[#111111] font-semibold text-sm mb-2">사업모델 고지</h2>
          <p className="text-[#444444] text-xs leading-relaxed">
            세무사·노무사·변호사 등 자격사에 대한 유료 알선은 법적으로 제한됩니다. 따라서 비즈버디는 전문가 연결을 무료 정보 링크(관할 기관·공식 안내 페이지)로만 제공하며, 이 산출물에는 결제·광고 게재 기능이 없습니다.
          </p>
        </section>

        <p className="text-[10px] text-[#888888] text-center pb-4">
          2026 전남광주 청년 AI 솔버톤 · 팀 코스모스 · 공식 오픈 API 실수집 데이터
        </p>
      </div>
    </div>
  );
}
