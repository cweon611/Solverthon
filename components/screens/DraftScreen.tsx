"use client";

// 신청서 뼈대 (B-08 연결) — 공고의 평가항목·제출서류에서 목차를 만들고, 회사 정보 자리는 프로필로 채운다.
// LLM은 공고문만 본다. {{키}} 치환은 브라우저에서 프로필로 한다 — 프로필은 서버로 가지 않는다 (§0.1-4).
// 사용자가 써야 할 곳은 [[빈칸]]으로 남는다. 전문을 대신 쓰지 않는다.

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import type { DraftOutput } from "@/lib/ai/geminiSchemas";
import { applyPrefill, buildPrefillValues, countBlanks, splitBlanks } from "@/lib/ai/prefill";
import { isoToDot } from "@/lib/engine/format";
import { useCatalog, useProfile, useToday } from "@/lib/store/hooks";
import { usePersistent } from "@/lib/store/persistent";
import { STORAGE_KEYS } from "@/lib/store/storage";

import { Disclaimer } from "@/components/ui/Disclaimer";

interface StoredDraft {
  generatedAt: string;
  model: string;
  draft: DraftOutput;
  edits: Record<string, string>; // 섹션 인덱스 → 사용자가 고친 본문
}
type DraftStore = Record<string, StoredDraft>;

const BTN = "px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_PRIMARY = `${BTN} text-white bg-[#6E62C2] border-[#6E62C2] hover:bg-[#5a50a8]`;
const BTN_GHOST = `${BTN} text-[#6E62C2] bg-[#f0eef9] border-[#dddaf4] hover:bg-[#dddaf4]`;

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
          } else if (evt.type === "error") {
            setError(evt.message);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setRunning(false);
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
    } catch { /* 클립보드 차단 환경 */ }
  };

  const download = () => {
    const blob = new Blob([toMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${(program?.title ?? "신청서").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60)}_초안.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!program) {
    return (
      <div className="p-6 space-y-5">
        <Link href="/grants" className="text-xs font-semibold text-[#6E62C2] hover:underline">← 판정함</Link>
        <div className="bg-[#F5F6F8] rounded-2xl p-10 text-center"><p className="text-[#888888] text-sm">해당 공고를 찾을 수 없습니다.</p></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div>
        <Link href="/grants" className="text-xs font-semibold text-[#6E62C2] hover:underline">← 판정함</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-[#6E62C2] uppercase tracking-wide">신청서 뼈대</p>
            <h1 className="text-2xl font-display font-bold text-[#111111] leading-tight">{program.title}</h1>
            <p className="text-[#888888] text-sm mt-1">{program.organization} · 마감 {program.is_rolling ? "상시" : program.apply_end ? isoToDot(program.apply_end) : "-"}</p>
          </div>
        </div>
      </div>

      {/* 설명 + 툴바 */}
      <div className="bg-[#F5F6F8] border border-[#E4E6EA] rounded-2xl px-5 py-4 space-y-3">
        <p className="text-xs text-[#444444] leading-relaxed">
          공고의 평가항목·제출서류를 읽어 <span className="font-semibold text-[#111111]">목차와 문단 뼈대</span>를 만듭니다.
          회사 정보는 이 브라우저의 프로필로 채우고, <span className="font-semibold text-amber-700">[[ ]]</span> 표시는 직접 쓰셔야 할 곳입니다.
          전문을 대신 쓰지 않습니다. AI는 공고문만 읽으며 회사 프로필은 서버로 보내지 않습니다.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={generate} disabled={running} className={BTN_PRIMARY}>
            {running ? "생성 중…" : saved ? "다시 생성" : "✦ 신청서 뼈대 만들기"}
          </button>
          {saved && (
            <>
              <button onClick={copyAll} className={BTN_GHOST}>{copied ? "복사됨 ✓" : "전체 복사"}</button>
              <button onClick={download} className={BTN_GHOST}>Markdown 내려받기</button>
              <div className="flex gap-1 bg-white border border-[#E4E6EA] rounded-xl p-1 ml-auto">
                {(["edit", "preview"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${view === v ? "bg-[#6E62C2] text-white" : "text-[#888888] hover:text-[#444444]"}`}>
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
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3"><p className="text-rose-700 text-xs">{error}</p></div>
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
          <div className="bg-white border border-[#E4E6EA] rounded-2xl p-5 space-y-3">
            <h2 className="text-lg font-display font-bold text-[#111111]">{saved.draft.title}</h2>
            <p className="text-sm text-[#444444] leading-relaxed">{saved.draft.overview}</p>
          </div>

          {saved.draft.evaluation_criteria.length > 0 && (
            <div className="bg-white border border-[#E4E6EA] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E4E6EA] flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#111111]">평가항목</h3>
                <span className="text-[10px] text-[#888888]">심사위원이 보는 것</span>
              </div>
              <div className="divide-y divide-[#F5F6F8]">
                {saved.draft.evaluation_criteria.map((c, i) => (
                  <div key={i} className="px-5 py-3 grid grid-cols-[1fr_auto] gap-3 items-start">
                    <div>
                      <p className="text-sm font-semibold text-[#111111]">{c.name}</p>
                      <p className="text-xs text-[#444444] mt-0.5">{c.what_to_show}</p>
                    </div>
                    <span className="text-[11px] font-mono text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-2 py-0.5 rounded-full shrink-0">{c.weight_text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {sections.map((s, i) => (
              <div key={i} className="bg-white border border-[#E4E6EA] rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#111111]">{s.heading}</h3>
                    <p className="text-xs text-[#888888] mt-0.5">{s.purpose}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.blanks > 0 && <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">빈칸 {s.blanks}</span>}
                    {saved.edits[String(i)] !== undefined && <span className="text-[10px] text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-2 py-0.5 rounded-full">수정됨</span>}
                  </div>
                </div>

                {view === "edit" ? (
                  <textarea
                    value={s.text}
                    onChange={(e) => setEdit(i, e.target.value)}
                    rows={Math.max(4, Math.ceil(s.text.length / 70))}
                    className="w-full border border-[#E4E6EA] rounded-xl px-4 py-3 text-sm text-[#111111] leading-relaxed focus:outline-none focus:border-[#6E62C2] focus:ring-2 focus:ring-[#6E62C2]/10 font-sans"
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
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E4E6EA] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[#111111]">제출 서류</h3>
                {program.required_documents.length > 0 && (
                  <Link href={`/grants/${program.id}/documents`} className="text-[11px] text-[#6E62C2] hover:underline">발급 소요기간 보기 →</Link>
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
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-amber-800 mb-2">놓치기 쉬운 것</h3>
              {saved.draft.warnings.length === 0 ? (
                <p className="text-xs text-amber-700">특별한 주의사항이 없습니다. 공고 원문의 제출 방법을 한 번 더 확인하세요.</p>
              ) : (
                <ul className="space-y-1">{saved.draft.warnings.map((w, i) => <li key={i} className="text-xs text-amber-800">· {w}</li>)}</ul>
              )}
            </div>
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
