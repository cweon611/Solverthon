"use client";

// 신청서 뼈대 (B-08 연결) — 공고의 평가항목·제출서류에서 목차를 만들고, 회사 정보 자리는 프로필로 채운다.
// LLM은 공고문만 본다. {{키}} 치환은 브라우저에서 프로필로 한다 — 프로필은 서버로 가지 않는다 (§0.1-4).
// 사용자가 써야 할 곳은 [[빈칸]]으로 남는다. 전문을 대신 쓰지 않는다.

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { DraftOutput } from "@/lib/ai/geminiSchemas";
import { applyPrefill, buildPrefillValues, countBlanks, splitBlanks } from "@/lib/ai/prefill";
import { isoToDot } from "@/lib/engine/format";
import { useCatalog, useProfile, useToday } from "@/lib/store/hooks";
import { usePersistent } from "@/lib/store/persistent";
import { STORAGE_KEYS } from "@/lib/store/storage";
import { cn } from "@/lib/utils";

import { Disclaimer } from "@/components/ui/Disclaimer";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { button, segmented } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cardMutedVariants, cardTitleClass } from "@/components/ui/variants";

interface StoredDraft {
  generatedAt: string;
  model: string;
  draft: DraftOutput;
  edits: Record<string, string>; // 섹션 인덱스 → 사용자가 고친 본문
}
type DraftStore = Record<string, StoredDraft>;

// 뒤로 가기 <Link> 2곳(asChild 없음) — 소스에 손 모양 커서가 없어 hand를 끈다.
const BACK_LINK = button({ variant: "linkBrand", text: "xs", hand: false });

export function DraftScreen({ programId }: { programId: string }) {
  const today = useToday();
  const { programs } = useCatalog();
  const { profile } = useProfile();
  const [store, setStore] = usePersistent<DraftStore>(STORAGE_KEYS.drafts, {});

  const program = programs.find((p) => p.id === programId);
  const saved = store[programId];

  const [running, setRunning] = useState(false);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const values = useMemo(() => (profile ? buildPrefillValues(profile, today) : null), [profile, today]);

  // 섹션별 최종 본문: 사용자가 고친 것 > 프리필 치환 결과
  const sections = useMemo(() => {
    if (!saved || !values) return [];
    return saved.draft.sections.map((s, i) => {
      const pre = applyPrefill(s.template, values);
      const text = saved.edits[String(i)] ?? pre.text;
      return { ...s, text, filled: pre.filled, missing: pre.missing, blanks: countBlanks(text) };
    });
  }, [saved, values]);

  const totalBlanks = sections.reduce((a, s) => a + s.blanks, 0);
  const totalFilled = new Set(sections.flatMap((s) => s.filled)).size;

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
              [programId]: { generatedAt: new Date().toISOString(), model: evt.usage?.model ?? "", draft: evt.draft as DraftOutput, edits: {} },
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
      // 스트림이 final도 error도 없이 닫힌 경우 — 예전에는 버튼만 되살아나고 끝이었다
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

  const toMarkdown = (): string => {
    if (!saved) return "";
    const d = saved.draft;
    const parts = [
      `# ${d.title}`, "", `> ${d.overview}`, "",
      "## 평가항목", ...d.evaluation_criteria.map((c) => `- **${c.name}** (${c.weight_text}) — ${c.what_to_show}`), "",
      ...sections.flatMap((s) => [`## ${s.heading}`, `_${s.purpose}_`, "", s.text, "", ...(s.tips.length ? ["> 심사 포인트", ...s.tips.map((t) => `> - ${t}`), ""] : [])]),
      "## 제출 서류", ...d.documents.map((doc) => `- [ ] ${doc.name}${doc.is_required ? " (필수)" : " (선택)"}${doc.note ? ` — ${doc.note}` : ""}`), "",
      ...(d.warnings.length ? ["## 주의", ...d.warnings.map((w) => `- ${w}`), ""] : []),
      "---", `비즈버디 신청서 뼈대 · ${isoToDot(saved.generatedAt.slice(0, 10))} 생성 · [[ ]] 표시는 직접 작성할 곳입니다.`,
    ];
    return parts.join("\n");
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("신청서 뼈대 전문을 복사했습니다", {
        description: `문단 ${sections.length}개 · 빈칸 ${totalBlanks}개 · 한글·워드에 그대로 붙여넣으세요`,
      });
    } catch { /* 클립보드 차단 환경 — 예전에는 버튼이 "복사됨"으로도 바뀌지 않고 조용히 끝났다 */
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

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div>
        <Link href="/grants" className={BACK_LINK}>← 판정함</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-[#6E62C2] uppercase tracking-wide">신청서 뼈대</p>
            <h1 className="text-2xl font-display font-bold text-[#111111] leading-tight">{program.title}</h1>
            <p className="text-[#888888] text-sm mt-1">{program.organization} · 마감 {program.is_rolling ? "상시" : program.apply_end ? isoToDot(program.apply_end) : "-"}</p>
          </div>
        </div>
      </div>

      {/* 설명 + 툴바 */}
      <div className={cn(cardMutedVariants({ bordered: true, pad: "px5y4" }), "space-y-3")}>
        <p className="text-xs text-[#444444] leading-relaxed">
          공고의 평가항목·제출서류를 읽어 <span className="font-semibold text-[#111111]">목차와 문단 뼈대</span>를 만듭니다.
          회사 정보는 이 브라우저의 프로필로 채우고, <span className="font-semibold text-amber-700">[[ ]]</span> 표시는 직접 쓰셔야 할 곳입니다.
          전문을 대신 쓰지 않습니다. AI는 공고문만 읽으며 회사 프로필은 서버로 보내지 않습니다.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="primaryBordered" pad="3x2" text="xs" radius="xl" motion="colors" off="o50" onClick={generate} disabled={running}>
            {running ? "생성 중…" : saved ? "다시 생성" : "✦ 신청서 뼈대 만들기"}
          </Button>
          {saved && (
            <>
              <Button variant="soft" pad="3x2" text="xs" radius="xl" motion="colors" off="o50" onClick={copyAll}>{copied ? "복사됨 ✓" : "전체 복사"}</Button>
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
          <p className="text-[10px] text-[#888888] font-mono">
            프로필로 채운 항목 {totalFilled}개 · 직접 쓸 빈칸 {totalBlanks}개 · {isoToDot(saved.generatedAt.slice(0, 10))} 생성{saved.model && ` · ${saved.model}`} · 이 브라우저에 자동 저장
          </p>
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
        <div className="space-y-5">
          <Card pad="p5" shadow="none" className="space-y-3">
            <h2 className="text-lg font-display font-bold text-[#111111]">{saved.draft.title}</h2>
            <p className="text-sm text-[#444444] leading-relaxed">{saved.draft.overview}</p>
          </Card>

          {saved.draft.evaluation_criteria.length > 0 && (
            <Card shadow="none" clip>
              <CardHeader size="tight" layout="row">
                <h3 className="text-sm font-bold text-[#111111]">평가항목</h3>
                <span className="text-[10px] text-[#888888]">심사위원이 보는 것</span>
              </CardHeader>
              <CardContent size="none" list>
                {saved.draft.evaluation_criteria.map((c, i) => (
                  // 목록 행 — 카드 본문이 아니라 행 여백이라 인라인 유지
                  <div key={i} className="px-5 py-3 grid grid-cols-[1fr_auto] gap-3 items-start">
                    <div>
                      <p className={cardTitleClass}>{c.name}</p>
                      <p className="text-xs text-[#444444] mt-0.5">{c.what_to_show}</p>
                    </div>
                    <Badge size="md11" weight="mono" tone="brand" fixed="shrink0">{c.weight_text}</Badge>
                  </div>
                ))}
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
                    {s.blanks > 0 && <Badge size="md" weight="none" tone="warning">빈칸 {s.blanks}</Badge>}
                    {saved.edits[String(i)] !== undefined && <Badge size="md" weight="none" tone="brand">수정됨</Badge>}
                  </div>
                </div>

                {view === "edit" ? (
                  <Textarea
                    variant="draftEditor"
                    value={s.text}
                    onChange={(e) => setEdit(i, e.target.value)}
                    rows={Math.max(4, Math.ceil(s.text.length / 70))}
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
              {saved.draft.warnings.length === 0 ? (
                <p className="text-xs text-amber-700">특별한 주의사항이 없습니다. 공고 원문의 제출 방법을 한 번 더 확인하세요.</p>
              ) : (
                <ul className="space-y-1">{saved.draft.warnings.map((w, i) => <li key={i} className="text-xs text-amber-800">· {w}</li>)}</ul>
              )}
            </Alert>
          </div>

          <p className="text-[10px] text-[#888888]">
            이 뼈대는 AI가 공고문을 읽고 만든 참고 자료입니다. 회사 정보는 이 브라우저의 프로필로 채웠고, 사실·수치는 직접 확인해 쓰셔야 합니다. 제출 양식은 반드시 공고 원문의 서식을 따르세요.
          </p>
        </div>
      )}

      {!saved && !running && (
        <div className="bg-white border border-dashed border-[#E4E6EA] rounded-2xl p-10 text-center">
          <p className="text-[#444444] text-sm">아직 생성한 뼈대가 없습니다.</p>
          <p className="text-[#888888] text-xs mt-1">위 버튼을 누르면 이 공고에 맞는 목차와 문단 뼈대를 만듭니다. 약 20~40초 걸립니다.</p>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
