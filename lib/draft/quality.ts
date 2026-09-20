// lib/draft/quality.ts — 초안 품질 점검 (결정론, LLM 없음)
// 문단별 분량·빈칸·근거 유무를 재고, 제출 전 체크리스트를 만든다.
// 점수를 매기지 않는다 — 무엇이 비어 있는지만 사실대로 보여준다.

const NUMBER_RE = /\d/;
const SOURCE_RE = /출처|기준|통계|조사|자료|근거|보고서/;
/** 심사에서 감점되기 쉬운 단정·과장 표현 */
const HYPE = ["최고", "유일", "완벽", "혁명적", "무조건", "100%", "세계 최초", "독보적"];

export interface SectionQuality {
  chars: number;
  target: number; // 권장 글자 수 (공백 제외)
  blanks: number;
  hasNumber: boolean;
  hasSource: boolean;
  hype: string[];
  /** 분량 대비 채움 정도 0~1 */
  ratio: number;
}

/**
 * 권장 분량: 평가항목과 연결된 문단은 길게, 개요·자격 확인처럼 사실만 적는 문단은 짧게.
 * 정확한 기준은 공고 양식이 정하므로 "권장"으로만 쓴다.
 */
export function targetChars(opts: { criteriaCount: number; heading: string }): number {
  if (/자격|개요|현황표/.test(opts.heading)) return 200;
  if (opts.criteriaCount >= 2) return 800;
  if (opts.criteriaCount === 1) return 600;
  return 400;
}

export function sectionQuality(text: string, opts: { criteriaCount: number; heading: string }): SectionQuality {
  const chars = text.replace(/\[\[[^\]]*\]\]/g, "").replace(/\s/g, "").length; // 빈칸은 분량으로 세지 않는다
  const target = targetChars(opts);
  return {
    chars,
    target,
    blanks: (text.match(/\[\[[^\]]+\]\]/g) ?? []).length,
    hasNumber: NUMBER_RE.test(text.replace(/\[\[[^\]]*\]\]/g, "")),
    hasSource: SOURCE_RE.test(text),
    hype: HYPE.filter((h) => text.includes(h)),
    ratio: Math.min(1, chars / target),
  };
}

export interface CheckItem {
  label: string;
  ok: boolean;
  detail: string;
}

/** 제출 전 체크리스트 — 통과하지 못한 항목이 무엇을 뜻하는지까지 적는다 */
export function readiness(input: {
  sections: { heading: string; quality: SectionQuality; criteria: number[] }[];
  criteriaCount: number;
  documents: { name: string; is_required: boolean }[];
}): CheckItem[] {
  const { sections, criteriaCount, documents } = input;
  const blanks = sections.reduce((a, s) => a + s.quality.blanks, 0);
  const short = sections.filter((s) => s.quality.ratio < 0.6);
  const noNumber = sections.filter((s) => s.criteria.length > 0 && !s.quality.hasNumber);
  const marketish = sections.filter((s) => /시장|성장|사업화|규모/.test(s.heading));
  const noSource = marketish.filter((s) => !s.quality.hasSource);
  const hype = sections.filter((s) => s.quality.hype.length > 0);
  const covered = new Set(sections.flatMap((s) => s.criteria));
  const requiredDocs = documents.filter((d) => d.is_required);

  return [
    {
      label: "빈칸을 모두 채웠다",
      ok: blanks === 0,
      detail: blanks === 0 ? "남은 빈칸이 없습니다." : `아직 ${blanks}곳이 비어 있습니다. 빈칸이 있는 채로 제출하면 감점됩니다.`,
    },
    {
      label: "문단 분량이 권장치에 닿았다",
      ok: short.length === 0,
      detail: short.length === 0 ? "모든 문단이 권장 분량을 넘었습니다." : `분량이 부족한 문단: ${short.map((s) => s.heading).join(", ")}`,
    },
    {
      label: "평가항목을 모두 다뤘다",
      ok: criteriaCount === 0 || covered.size >= criteriaCount,
      detail:
        criteriaCount === 0
          ? "이 초안에는 평가항목 정보가 없습니다. 공고문의 평가표를 확인하세요."
          : covered.size >= criteriaCount
            ? "평가항목마다 연결된 문단이 있습니다."
            : `${criteriaCount - covered.size}개 평가항목에 대응하는 문단이 없습니다.`,
    },
    {
      label: "숫자로 근거를 댔다",
      ok: noNumber.length === 0,
      detail: noNumber.length === 0 ? "평가항목 문단에 수치가 들어 있습니다." : `수치가 없는 문단: ${noNumber.map((s) => s.heading).join(", ")}`,
    },
    {
      label: "시장·성장 문단에 출처를 적었다",
      ok: noSource.length === 0,
      detail:
        marketish.length === 0
          ? "해당하는 문단이 없습니다."
          : noSource.length === 0
            ? "출처·기준을 밝혔습니다."
            : `출처 표기가 없는 문단: ${noSource.map((s) => s.heading).join(", ")}`,
    },
    {
      label: "과장 표현을 쓰지 않았다",
      ok: hype.length === 0,
      detail:
        hype.length === 0
          ? "단정·과장 표현이 없습니다."
          : `근거 없이 쓰면 감점될 수 있는 표현: ${[...new Set(hype.flatMap((s) => s.quality.hype))].join(", ")}`,
    },
    {
      label: "제출 서류를 확인했다",
      ok: requiredDocs.length > 0,
      detail:
        requiredDocs.length > 0
          ? `필수 서류 ${requiredDocs.length}건 — 발급 소요기간을 '준비서류 확인'에서 역산하세요.`
          : "공고에 명시된 필수 서류가 없습니다. 원문을 다시 확인하세요.",
    },
  ];
}
