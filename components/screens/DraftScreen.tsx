"use client";

// 신청서 초안 — 공고의 평가항목·제출서류에서 목차를 만들고, 빈칸을 최대한 자동으로 채운다.
//   · 목차: AI(공고문 기반) 또는 기본 양식(lib/draft/template.ts, AI 없음) 중 선택
//   · 채우기: {{프로필}} · {{lib:내 사업 정보}} · {{eligibility_summary}}(판정 엔진 근거) — 전부 브라우저에서 (§0.1-4)
//   · 남은 [[빈칸]]은 오른쪽 패널에서 질문처럼 채운다. "내 사업 정보"는 한 번 쓰면 모든 공고 초안에 재사용된다.
// LLM은 공고문만 본다. 회사 프로필·내 사업 정보는 서버로 가지 않는다.

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { DraftOutput } from "@/lib/ai/geminiSchemas";
import { applyPrefill, buildPrefillValues, countBlanks, fillBlank, freeBlanks, libBlanks, refill, splitBlanks, toPlainText } from "@/lib/ai/prefill";
import { eligibilityEvidence } from "@/lib/draft/evidence";
import { LIB_FIELDS, LIB_KEYS, libraryProgress, type LibKey, type Library } from "@/lib/draft/library";
import { buildBasicDraft } from "@/lib/draft/template";
import { evaluateProgram } from "@/lib/engine/evaluate";
import { isoToDot } from "@/lib/engine/format";
import { useCatalog, useFlatProfile, useProfile, useToday } from "@/lib/store/hooks";
import { usePersistent } from "@/lib/store/persistent";
import { STORAGE_KEYS } from "@/lib/store/storage";
import { cn } from "@/lib/utils";

import { Disclaimer } from "@/components/ui/Disclaimer";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { button, segmented } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cardMutedVariants, cardTitleClass } from "@/components/ui/variants";

interface StoredDraft {
  generatedAt: string;
  model: string;
  source?: "ai" | "basic"; // 없으면 AI (이전 버전 저장분)
  draft: DraftOutput;
  edits: Record<string, string>; // 섹션 인덱스 → 사용자가 고친 본문
}
type DraftStore = Record<string, StoredDraft>;

// 뒤로 가기 <Link> 2곳(asChild 없음) — 소스에 손 모양 커서가 없어 hand를 끈다.
const BACK_LINK = button({ variant: "linkBrand", text: "xs", hand: false });

const LIB_TOKEN_RE = /\{\{\s*lib:([a-z_]+)\s*\}\}/g;

export function DraftScreen({ programId }: { programId: string }) {
  const today = useToday();
  const { programs } = useCatalog();
  const { profile } = useProfile();
  const flat = useFlatProfile();
  const [store, setStore] = usePersistent<DraftStore>(STORAGE_KEYS.drafts, {});
  const [library, setLibrary] = usePersistent<Library>(STORAGE_KEYS.library, {});

  const program = programs.find((p) => p.id === programId);
  const saved = store[programId];

  const [running, setRunning] = useState(false);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const [openLib, setOpenLib] = useState<Set<LibKey>>(new Set());
  const [showAllLib, setShowAllLib] = useState(false);
  const [freeAnswers, setFreeAnswers] = useState<Record<string, string>>({});
  const preRef = useRef<HTMLPreElement>(null);

  // 판정 엔진 결과 → "신청 자격 충족 현황" 문단
  const evidence = useMemo(() => {
    if (!program || !profile) return null;
    return eligibilityEvidence(evaluateProgram(program, flat, today), profile.name);
  }, [program, profile, flat, today]);

  const values = useMemo(
    () => (profile ? buildPrefillValues(profile, today, { eligibility_summary: evidence?.text ?? null }) : null),
    [profile, today, evidence],
  );

  // 섹션별 최종 본문: 사용자가 고친 것(그 사이 생긴 값으로 빈칸 재채움) > 템플릿 채움 결과
  const sections = useMemo(() => {
    if (!saved || !values) return [];
    return saved.draft.sections.map((s, i) => {
      const pre = applyPrefill(s.template, values, library);
      const edited = saved.edits[String(i)];
      const text = edited !== undefined ? refill(edited, values, library) : pre.text;
      return {
        ...s,
        criteria: (s.criteria ?? []).filter((c) => c >= 0 && c < saved.draft.evaluation_criteria.length),
        text,
        filled: pre.filled,
        blanks: countBlanks(text),
        libNeeded: libBlanks(text),
        free: freeBlanks(text),
        chars: text.replace(/\s/g, "").length,
      };
    });
  }, [saved, values, library]);

  // 이 초안이 쓰는 "내 사업 정보" 항목 — 채워도 목록에서 사라지지 않게 템플릿 기준으로 모은다
  const libUsed = useMemo(() => {
    if (!saved) return [] as LibKey[];
    const keys = new Set<LibKey>();
    for (const s of saved.draft.sections) for (const m of s.template.matchAll(LIB_TOKEN_RE)) {
      if ((LIB_KEYS as readonly string[]).includes(m[1])) keys.add(m[1] as LibKey);
    }
    for (const s of sections) s.libNeeded.forEach((k) => keys.add(k));
    return LIB_KEYS.filter((k) => keys.has(k));
  }, [saved, sections]);

  const totalBlanks = sections.reduce((a, s) => a + s.blanks, 0);
  const totalFilled = sections.reduce((a, s) => a + s.filled.length, 0);
  const completion = totalFilled + totalBlanks === 0 ? 0 : totalFilled / (totalFilled + totalBlanks);
  const libMissing = libUsed.filter((k) => !(library[k] ?? "").trim());
  const warnings = saved ? [...saved.draft.warnings, ...(evidence?.warnings ?? [])] : [];

  const startBasic = () => {
    if (!program) return;
    const draft = buildBasicDraft(program);
    setStore((prev) => ({ ...prev, [programId]: { generatedAt: new Date().toISOString(), model: "", source: "basic", draft, edits: {} } }));
    setView("edit");
    toast.success("기본 양식으로 초안을 만들었습니다", {
      description: `문단 ${draft.sections.length}개 · 회사 정보와 '내 사업 정보'로 채울 수 있는 곳은 자동으로 채웠습니다.`,
    });
  };

  const generate = async () => {
    setRunning(true); setRaw(""); setError(null);
    // 20~40초짜리 스트리밍이라 진행 중 토스트를 띄우고 끝에서 같은 id로 갈아끼운다
    const tid = toast.loading("공고문을 읽고 신청서 뼈대를 만드는 중…", {
      description: `${program?.title ?? "공고"} · 평가항목과 제출서류를 정리합니다. 20~40초 걸립니다.`,
    });
    let settled = false; // final·error 없이 스트림이 끊기면 지금까지 아무 표시도 없었다
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        if (body?.error?.code === "no_api_key") {
          settled = true;
          setError(null);
          toast.info("AI 생성을 쓸 수 없는 환경입니다", {
            id: tid,
            description: "서버에 Gemini 키가 없습니다. 기본 양식으로 바로 시작할 수 있습니다.",
            action: { label: "기본 양식으로 시작", onClick: startBasic },
          });
          return;
        }
        throw new Error(body?.error?.message ?? `요청 실패 (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "delta") {
            setRaw((prev) => prev + evt.text);
            requestAnimationFrame(() => { if (preRef.current) preRef.current.scrollTop = preRef.current.scrollHeight; });
          } else if (evt.type === "reset") {
            setRaw("");
          } else if (evt.type === "final") {
            setStore((prev) => ({
              ...prev,
              [programId]: { generatedAt: new Date().toISOString(), model: evt.usage?.model ?? "", source: "ai", draft: evt.draft as DraftOutput, edits: {} },
            }));
            setView("edit");
            settled = true;
            const made = evt.draft as DraftOutput;
            toast.success("신청서 뼈대를 만들었습니다", {
              id: tid,
              description: `문단 ${made.sections.length}개 · 제출서류 ${made.documents.length}건 · 이 브라우저에 자동 저장했습니다`,
            });
          } else if (evt.type === "error") {
            setError(evt.message);
            settled = true;
            toast.error("뼈대를 만들지 못했습니다", { id: tid, description: String(evt.message) });
          }
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(message);
      settled = true;
      toast.error("뼈대를 만들지 못했습니다", { id: tid, description: message });
    } finally {
      setRunning(false);
      if (!settled) {
        toast.error("생성이 도중에 끊겼습니다", { id: tid, description: "응답이 끝까지 오지 않았습니다. 다시 생성을 눌러 주세요." });
      }
    }
  };

  const setEdit = (i: number, text: string) =>
    setStore((prev) => {
      const cur = prev[programId];
      if (!cur) return prev;
      return { ...prev, [programId]: { ...cur, edits: { ...cur.edits, [String(i)]: text } } };
    });

  const setLib = (k: LibKey, v: string) => setLibrary({ ...library, [k]: v });

  const applyFree = (i: number, blank: string) => {
    const key = `${i}:${blank}`;
    const answer = freeAnswers[key] ?? "";
    if (!answer.trim()) return;
    setEdit(i, fillBlank(sections[i].text, blank, answer));
    setFreeAnswers((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };

  const toMarkdown = (): string => {
    if (!saved) return "";
    const d = saved.draft;
    const parts = [
      `# ${d.title}`, "", `> ${d.overview}`, "",
      "## 평가항목", ...d.evaluation_criteria.map((c) => `- **${c.name}** (${c.weight_text}) — ${c.what_to_show}`), "",
      ...sections.flatMap((s) => [`## ${s.heading}`, `_${s.purpose}_`, "", s.text, "", ...(s.tips.length ? ["> 심사 포인트", ...s.tips.map((t) => `> - ${t}`), ""] : [])]),
      "## 제출 서류", ...d.documents.map((doc) => `- [ ] ${doc.name}${doc.is_required ? " (필수)" : " (선택)"}${doc.note ? ` — ${doc.note}` : ""}`), "",
      ...(warnings.length ? ["## 주의", ...warnings.map((w) => `- ${w}`), ""] : []),
      "---", `비즈버디 신청서 초안 · ${isoToDot(saved.generatedAt.slice(0, 10))} 생성 · [[ ]] 표시는 직접 작성할 곳입니다.`,
    ];
    return parts.join("\n");
  };

  const copy = async (kind: "md" | "plain") => {
    if (!saved) return;
    const text = kind === "md" ? toMarkdown() : toPlainText(saved.draft.title, sections);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success(kind === "md" ? "초안 전문을 복사했습니다 (Markdown)" : "본문만 서식 없이 복사했습니다", {
        description: `문단 ${sections.length}개 · 남은 빈칸 ${totalBlanks}개 · ${kind === "plain" ? "한글·워드 양식에 그대로 붙여넣으세요" : "노션·문서 도구에 붙여넣으세요"}`,
      });
    } catch { /* 클립보드 차단 환경 */
      toast.error("클립보드 복사가 막혀 있습니다", {
        description: "브라우저의 클립보드 권한을 허용하거나 Markdown 내려받기를 사용하세요.",
      });
    }
  };

  const download = () => {
    const blob = new Blob([toMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const name = `${(program?.title ?? "신청서").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60)}_초안.md`;
    const a = document.createElement("a");
    a.href = url; a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown 파일을 내려받았습니다", { description: name });
  };

  if (!program) {
    return (
      <div className="p-6 space-y-5">
        <Link href="/grants" className={BACK_LINK}>← 판정함</Link>
        <div className={cardMutedVariants({ pad: "p10", center: true })}><p className="text-[#888888] text-sm">해당 공고를 찾을 수 없습니다.</p></div>
      </div>
    );
  }

  const libProg = libraryProgress(library);

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div>
        <Link href="/grants" className={BACK_LINK}>← 판정함</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-[#6E62C2] uppercase tracking-wide">신청서 초안</p>
            <h1 className="text-2xl font-display font-bold text-[#111111] leading-tight">{program.title}</h1>
            <p className="text-[#888888] text-sm mt-1">{program.organization} · 마감 {program.is_rolling ? "상시" : program.apply_end ? isoToDot(program.apply_end) : "-"}</p>
          </div>
        </div>
      </div>

      {/* 설명 + 툴바 */}
      <div className={cn(cardMutedVariants({ bordered: true, pad: "px5y4" }), "space-y-3")}>
        <p className="text-xs text-[#444444] leading-relaxed">
          목차를 만든 뒤 <span className="font-semibold text-[#111111]">회사 정보 · 자격 충족 근거 · 내 사업 정보</span>로 채울 수 있는 곳은 자동으로 채웁니다.
          남은 <span className="font-semibold text-amber-700">[[ ]]</span> 빈칸은 오른쪽 패널에서 채우세요. AI는 공고문만 읽으며 회사 정보는 서버로 보내지 않습니다.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="primaryBordered" pad="3x2" text="xs" radius="xl" motion="colors" off="o50" onClick={generate} disabled={running}>
            {running ? "생성 중…" : saved?.source === "ai" || (saved && !saved.source) ? "AI로 다시 생성" : "✦ AI로 공고 맞춤 목차 만들기"}
          </Button>
          <Button variant="soft" pad="3x2" text="xs" radius="xl" motion="colors" off="o50" onClick={startBasic} disabled={running}>
            {saved?.source === "basic" ? "기본 양식 다시 만들기" : "기본 양식으로 바로 시작 (AI 없음)"}
          </Button>
          {saved && (
            <>
              <Button variant="soft" pad="3x2" text="xs" radius="xl" motion="colors" off="o50" onClick={() => copy("plain")}>{copied ? "복사됨 ✓" : "본문 복사 (서식 없이)"}</Button>
              <Button variant="soft" pad="3x2" text="xs" radius="xl" motion="colors" off="o50" onClick={() => copy("md")}>전체 복사 (Markdown)</Button>
              <Button variant="soft" pad="3x2" text="xs" radius="xl" motion="colors" off="o50" onClick={download}>Markdown 내려받기</Button>
              {/* 트레이 껍데기(rounded-xl)는 카드 표에 없다 — 인라인 유지 */}
              <div className="flex gap-1 bg-white border border-[#E4E6EA] rounded-xl p-1 ml-auto">
                {(["edit", "preview"] as const).map((v) => (
                  // ON이 브랜드 채움이라 on 축을 쓰지 않고 색만 className으로 넘긴다
                  <button key={v} onClick={() => setView(v)}
                    className={cn(
                      segmented({ on: null, size: "sm", motion: "none" }),
                      view === v ? "bg-[#6E62C2] text-white" : "text-[#888888] hover:text-[#444444]",
                    )}>
                    {v === "edit" ? "편집" : "미리보기"}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {saved && (
          <div className="space-y-1.5">
            <div className="h-1.5 bg-white rounded-full overflow-hidden border border-[#E4E6EA]">
              <div className="h-full bg-[#6E62C2] transition-all" style={{ width: `${Math.round(completion * 100)}%` }} />
            </div>
            <p className="text-[10px] text-[#888888] font-mono">
              채움 {Math.round(completion * 100)}% · 자동으로 채운 곳 {totalFilled}개 · 남은 빈칸 {totalBlanks}개 · {saved.source === "basic" ? "기본 양식" : `AI${saved.model ? ` (${saved.model})` : ""}`} · {isoToDot(saved.generatedAt.slice(0, 10))} 생성 · 이 브라우저에 자동 저장
            </p>
          </div>
        )}
      </div>

      {error && (
        <Alert pad="lg"><p className="text-rose-700 text-xs">{error}</p></Alert>
      )}

      {/* 스트리밍 중 */}
      {running && (
        <pre ref={preRef} className="bg-[#111111] text-[#c9c4ea] text-[11px] font-mono rounded-2xl p-4 h-48 overflow-auto whitespace-pre-wrap break-all">
          {raw || "공고문을 읽고 있습니다…"}
        </pre>
      )}

      {/* 결과 */}
      {saved && !running && (
        <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            <Card pad="p5" shadow="none" className="space-y-3">
              <h2 className="text-lg font-display font-bold text-[#111111]">{saved.draft.title}</h2>
              <p className="text-sm text-[#444444] leading-relaxed">{saved.draft.overview}</p>
            </Card>

            {saved.draft.evaluation_criteria.length > 0 && (
              <Card shadow="none" clip>
                <CardHeader size="tight" layout="row">
                  <h3 className="text-sm font-bold text-[#111111]">평가항목 점검</h3>
                  <span className="text-[10px] text-[#888888]">항목마다 관련 문단이 채워졌는지</span>
                </CardHeader>
                <CardContent size="none" list>
                  {saved.draft.evaluation_criteria.map((c, ci) => {
                    const related = sections.filter((s) => s.criteria.includes(ci));
                    const left = related.reduce((a, s) => a + s.blanks, 0);
                    return (
                      // 목록 행 — 카드 본문이 아니라 행 여백이라 인라인 유지
                      <div key={ci} className="px-5 py-3 grid grid-cols-[1fr_auto] gap-3 items-start">
                        <div>
                          <p className={cardTitleClass}>{c.name}</p>
                          <p className="text-xs text-[#444444] mt-0.5">{c.what_to_show}</p>
                          {related.length > 0 && <p className="text-[10px] text-[#888888] mt-1">관련 문단: {related.map((s) => s.heading).join(", ")}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge size="md11" weight="mono" tone="brand">{c.weight_text}</Badge>
                          {related.length === 0 ? <Badge size="md" weight="none" tone="muted">관련 문단 없음</Badge>
                            : left === 0 ? <Badge size="md" weight="none" tone="successAlt">채움 완료</Badge>
                            : <Badge size="md" weight="none" tone="warning">빈칸 {left}</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {sections.map((s, i) => (
                <Card key={i} pad="p5" shadow="none" className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#111111]">{s.heading}</h3>
                      <p className="text-xs text-[#888888] mt-0.5">{s.purpose}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-[#888888]">{s.chars.toLocaleString("ko-KR")}자</span>
                      {s.blanks > 0 ? <Badge size="md" weight="none" tone="warning">빈칸 {s.blanks}</Badge> : <Badge size="md" weight="none" tone="successAlt">완성</Badge>}
                      {saved.edits[String(i)] !== undefined && <Badge size="md" weight="none" tone="brand">수정됨</Badge>}
                    </div>
                  </div>

                  {view === "edit" ? (
                    <Textarea
                      variant="draftEditor"
                      value={s.text}
                      onChange={(e) => setEdit(i, e.target.value)}
                      rows={Math.max(4, Math.ceil(s.text.length / 70) + s.text.split("\n").length)}
                    />
                  ) : (
                    <p className="text-sm text-[#111111] leading-relaxed whitespace-pre-wrap border border-[#E4E6EA] rounded-xl px-4 py-3 bg-[#FAFAFB]">
                      {splitBlanks(s.text).map((part, j) =>
                        part.kind === "blank"
                          ? <mark key={j} className="bg-amber-100 text-amber-800 rounded px-1 not-italic">[{part.value}]</mark>
                          : <span key={j}>{part.value}</span>,
                      )}
                    </p>
                  )}

                  {s.tips.length > 0 && (
                    <div className="bg-[#F5F6F8] rounded-xl px-4 py-3">
                      <p className="text-[10px] font-semibold text-[#888888] mb-1">심사 포인트</p>
                      <ul className="space-y-0.5">
                        {s.tips.map((t, j) => <li key={j} className="text-xs text-[#444444]">· {t}</li>)}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card pad="p5" shadow="none">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-[#111111]">제출 서류</h3>
                  {program.required_documents.length > 0 && (
                    <Link href={`/grants/${program.id}/documents`} className={button({ variant: "linkBrandPlain", text: "11", hand: false })}>발급 소요기간 보기 →</Link>
                  )}
                </div>
                {saved.draft.documents.length === 0 ? (
                  <p className="text-xs text-[#888888]">공고에 명시된 서류가 없습니다.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {saved.draft.documents.map((d, i) => (
                      <li key={i} className="text-xs text-[#444444] flex items-start gap-2">
                        <span className={`mt-0.5 w-3.5 h-3.5 rounded border shrink-0 ${d.is_required ? "border-[#6E62C2]" : "border-[#E4E6EA]"}`} />
                        <span><span className="font-medium text-[#111111]">{d.name}</span>{d.is_required ? "" : " (선택)"}{d.note && <span className="text-[#888888]"> — {d.note}</span>}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Alert tone="warning" radius="2xl" pad="p5">
                <h3 className="text-sm font-bold text-amber-800 mb-2">놓치기 쉬운 것</h3>
                {warnings.length === 0 ? (
                  <p className="text-xs text-amber-700">특별한 주의사항이 없습니다. 공고 원문의 제출 방법을 한 번 더 확인하세요.</p>
                ) : (
                  <ul className="space-y-1">{warnings.map((w, i) => <li key={i} className="text-xs text-amber-800">· {w}</li>)}</ul>
                )}
              </Alert>
            </div>
          </div>

          {/* ── 오른쪽: 빈칸 채우기 ── */}
          <aside className="space-y-4 lg:sticky lg:top-4">
            <Card pad="p5" shadow="none" className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[#111111]">내 사업 정보</h3>
                <p className="text-[11px] text-[#888888] mt-0.5 leading-relaxed">
                  한 번 쓰면 모든 공고의 신청서 초안에 자동으로 들어갑니다. 계정에 저장되며 AI에는 보내지 않습니다.
                  <span className="font-mono"> ({libProg.filled}/{libProg.total} 작성)</span>
                </p>
              </div>
              {libUsed.length === 0 && <p className="text-[11px] text-[#888888]">이 초안에는 내 사업 정보 자리가 없습니다.</p>}
              {(showAllLib ? [...LIB_KEYS] : libUsed).map((k) => {
                const f = LIB_FIELDS[k];
                const v = library[k] ?? "";
                const open = !v.trim() || openLib.has(k);
                const short = v.trim().length > 0 && v.trim().length < f.minChars;
                return (
                  <div key={k} className={`rounded-xl border px-3 py-2.5 space-y-1.5 ${v.trim() ? "border-[#E4E6EA] bg-white" : "border-amber-200 bg-amber-50/50"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#111111]">{f.label}</p>
                      {v.trim() && !open && (
                        <button type="button" onClick={() => setOpenLib(new Set([...openLib, k]))} className="text-[11px] text-[#6E62C2] hover:underline cursor-pointer">수정</button>
                      )}
                    </div>
                    {open ? (
                      <>
                        <p className="text-[10px] text-[#888888] leading-relaxed">{f.guide}</p>
                        <Textarea variant="draftEditor" rows={3} value={v} placeholder={`예: ${f.example}`}
                          onFocus={() => { if (!openLib.has(k)) setOpenLib(new Set([...openLib, k])); }}
                          onChange={(e) => setLib(k, e.target.value)} />
                        {short && <p className="text-[10px] text-amber-700">조금 더 구체적으로 쓰면 좋습니다 (권장 {f.minChars}자 이상).</p>}
                        {openLib.has(k) && v.trim() && (
                          <button type="button" onClick={() => { const n = new Set(openLib); n.delete(k); setOpenLib(n); }} className="text-[11px] text-[#6E62C2] hover:underline cursor-pointer">접기</button>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-[#444444] line-clamp-2">{v}</p>
                    )}
                  </div>
                );
              })}
              <button type="button" onClick={() => setShowAllLib(!showAllLib)} className="text-[11px] text-[#6E62C2] hover:underline cursor-pointer">
                {showAllLib ? "이 초안에 쓰는 항목만 보기" : `내 사업 정보 전체 보기 (${LIB_KEYS.length}개)`}
              </button>
              {libMissing.length > 0 && (
                <p className="text-[10px] text-amber-700">아직 비어 있는 항목 {libMissing.length}개가 이 초안의 빈칸 {sections.reduce((a, s) => a + s.libNeeded.length, 0)}곳에 들어갑니다.</p>
              )}
            </Card>

            {sections.some((s) => s.free.length > 0) && (
              <Card pad="p5" shadow="none" className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">이 공고에만 쓰는 빈칸</h3>
                  <p className="text-[11px] text-[#888888] mt-0.5">답을 쓰고 채우기를 누르면 해당 문단의 빈칸이 바뀝니다.</p>
                </div>
                {sections.map((s, i) => s.free.map((blank, j) => {
                  const key = `${i}:${blank}`;
                  return (
                    <div key={`${key}:${j}`} className="space-y-1">
                      <p className="text-[10px] text-[#888888]">{s.heading}</p>
                      <p className="text-[11px] text-amber-800">{blank}</p>
                      <div className="flex gap-1.5">
                        <Input variant="flowLg" className="text-xs" value={freeAnswers[key] ?? ""}
                          onChange={(e) => setFreeAnswers({ ...freeAnswers, [key]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) applyFree(i, blank); }} />
                        <Button variant="soft" pad="3x2" text="xs" radius="xl" onClick={() => applyFree(i, blank)} disabled={!(freeAnswers[key] ?? "").trim()} off="o50">채우기</Button>
                      </div>
                    </div>
                  );
                }))}
              </Card>
            )}
          </aside>
        </div>
      )}

      {!saved && !running && (
        <div className="bg-white border border-dashed border-[#E4E6EA] rounded-2xl p-10 text-center space-y-1">
          <p className="text-[#444444] text-sm">아직 만든 초안이 없습니다.</p>
          <p className="text-[#888888] text-xs">
            &quot;AI로 공고 맞춤 목차&quot;는 공고문의 평가항목·양식을 읽어 목차를 만듭니다(20~40초).
            &quot;기본 양식&quot;은 AI 없이 분야별 표준 목차(창업은 PSST)로 바로 시작합니다.
          </p>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
