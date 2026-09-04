"use client";

// S10 AI 파싱 데모 (§8 S10) — "AI는 읽고, 판정은 코드가 한다"를 동작으로 보여준다.
// 프로필은 서버로 보내지 않는다. 판정은 받은 초안으로 클라이언트에서 실행한다 (§9).

import { useRef, useState } from "react";

import { evaluateProgram } from "@/lib/engine/evaluate";
import { useCatalog, useFlatProfile, useToday } from "@/lib/store/hooks";
import type { Condition, ConditionGroup, Program, ProgramDocument, UnmappedCondition } from "@/lib/types";
import { toGrant } from "@/lib/view/toGrant";

import { Disclaimer } from "@/components/ui/Disclaimer";

const PRESETS = [
  { label: "광주 청년일자리도약장려금", file: "01_광주_청년일자리도약장려금" },
  { label: "초기창업패키지 모집공고", file: "02_초기창업패키지_모집공고" },
  { label: "지역특화 R&D 공고", file: "03_지역특화_RnD_공고" },
];

const MAX_CHARS = 12_000;

interface ParsedBasics {
  title: string; organization: string; support_field: string;
  amount_text: string | null; apply_start: string | null; apply_end: string | null; is_rolling: boolean;
  confidence: number;
}
interface ProgramDraft {
  eligibility: ConditionGroup;
  unmapped_conditions: UnmappedCondition[];
  required_documents: ProgramDocument[];
  summary: string;
}
interface Usage { model: string; inputTokens: number; outputTokens: number; ms: number }

const isGroup = (n: Condition | ConditionGroup): n is ConditionGroup => "operator" in n;
const flatten = (n: Condition | ConditionGroup): Condition[] => (isGroup(n) ? n.conditions.flatMap(flatten) : [n]);

const OP_LABEL: Record<string, string> = {
  lt: "미만", lte: "이하", gt: "초과", gte: "이상", eq: "같음", neq: "다름",
  in: "포함", not_in: "제외", includes: "보유",
};

export function ParseDemoScreen() {
  const today = useToday();
  const flat = useFlatProfile();
  const { documentTypes } = useCatalog();

  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [raw, setRaw] = useState("");
  const [basics, setBasics] = useState<ParsedBasics | null>(null);
  const [draft, setDraft] = useState<ProgramDraft | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdictShown, setVerdictShown] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const loadPreset = async (file: string) => {
    setError(null);
    const res = await fetch(`/presets/${file}.txt`);
    setText(res.ok ? await res.text() : "");
  };

  const run = async () => {
    setRunning(true); setRaw(""); setBasics(null); setDraft(null); setUsage(null);
    setError(null); setVerdictShown(false);
    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
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
          } else if (evt.type === "final") {
            setBasics(evt.parsed); setDraft(evt.program); setUsage(evt.usage);
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

  // 받은 초안을 그대로 엔진에 넣는다 — 판정 규칙은 판정함과 완전히 같다
  const verdict = (() => {
    if (!draft || !basics) return null;
    const program: Program = {
      id: "demo", source: "local", source_id: null, title: basics.title, organization: basics.organization,
      executing_org: null, support_field: "기타", support_type: null, amount_text: basics.amount_text,
      summary: draft.summary, apply_start: basics.apply_start, apply_end: basics.apply_end,
      is_rolling: basics.is_rolling, original_url: null, apply_url: null, attachment_url: null,
      eligibility: draft.eligibility, unmapped_conditions: draft.unmapped_conditions,
      required_documents: draft.required_documents, review_status: "ai_draft", is_synthetic: false,
      duplicate_of: null, parsed_at: null, created_at: "", updated_at: "",
    };
    return toGrant(program, evaluateProgram(program, flat, today));
  })();

  const conditions = draft ? draft.eligibility.conditions.flatMap(flatten) : [];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#111111]">공고 AI 파싱</h1>
        <p className="text-[#888888] text-sm mt-1">
          공고문을 붙여넣으면 AI가 구조화합니다. 자격 판정은 AI가 아니라 규칙 엔진이 합니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 좌측 — 입력 */}
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button key={p.file} onClick={() => loadPreset(p.file)} disabled={running}
                className="px-3 py-1.5 rounded-xl border border-[#E4E6EA] bg-white text-xs font-semibold text-[#444444] hover:border-[#6E62C2]/40 transition-all cursor-pointer disabled:opacity-50">
                {p.label}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="공고 원문을 붙여넣으세요"
            className="w-full h-64 border border-[#E4E6EA] rounded-2xl p-4 font-mono text-xs text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#6E62C2] focus:ring-2 focus:ring-[#6E62C2]/10 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#888888] font-mono">{text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}자</span>
            <button onClick={run} disabled={running || text.trim().length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-40 disabled:cursor-not-allowed">
              {running && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {running ? "구조화 중…" : "구조화 실행"}
            </button>
          </div>
        </div>

        {/* 우측 — 스트리밍 원문 */}
        <div className="space-y-3">
          <p className="text-[11px] text-[#888888] font-medium">모델이 생성 중인 JSON</p>
          <pre ref={preRef} className="bg-[#F5F6F8] rounded-2xl p-4 text-[11px] font-mono h-64 overflow-auto text-[#444444] whitespace-pre-wrap break-all">
            {raw || (running ? "연결 중…" : "실행하면 여기에 흘러나옵니다.")}
          </pre>
          {usage && (
            <p className="text-[10px] text-[#888888] font-mono">
              {usage.model} · 입력 {usage.inputTokens.toLocaleString()} 토큰 · 출력 {usage.outputTokens.toLocaleString()} 토큰 · {usage.ms.toLocaleString()} ms
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
          <p className="text-rose-700 text-xs font-semibold">{error}</p>
        </div>
      )}

      {basics && draft && (
        <div className="space-y-4">
          {/* 기본 정보 */}
          <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm">
            <div className="px-5 py-4 border-b border-[#E4E6EA]">
              <h2 className="text-[#111111] font-semibold text-sm">기본 정보</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-3 gap-3">
              {[
                { label: "공고명", value: basics.title },
                { label: "기관", value: basics.organization },
                { label: "분야", value: basics.support_field },
                { label: "지원 규모", value: basics.amount_text ?? "미기재" },
                { label: "접수 기간", value: basics.is_rolling ? "상시 접수" : `${basics.apply_start ?? "-"} ~ ${basics.apply_end ?? "-"}` },
                { label: "파서 확신도", value: String(basics.confidence) },
              ].map((f) => (
                <div key={f.label} className="bg-[#F5F6F8] rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-[#888888] font-medium mb-0.5">{f.label}</p>
                  <p className="text-[#111111] text-xs font-semibold">{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 추출 조건 */}
          <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4E6EA] flex items-center gap-2">
              <h2 className="text-[#111111] font-semibold text-sm">추출된 조건</h2>
              <span className="text-[10px] font-mono text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-2 py-0.5 rounded-full">{conditions.length}건</span>
            </div>
            {conditions.length === 0 ? (
              <p className="px-5 py-6 text-center text-[#888888] text-xs">추출된 조건이 없습니다.</p>
            ) : (
              <div className="divide-y divide-[#F5F6F8]">
                {conditions.map((c, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-2 py-0.5 rounded-full">{c.field}</span>
                      <span className="text-[#111111] text-xs font-semibold">{String(Array.isArray(c.value) ? c.value.join(", ") : c.value)} {OP_LABEL[c.op] ?? c.op}</span>
                      <span className="text-[#888888] text-xs">{c.label}</span>
                    </div>
                    <p className="text-[11px] text-[#888888] bg-[#F5F6F8] rounded-lg px-3 py-2 italic mt-2">{c.source_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI가 확신하지 못한 항목 */}
          {draft.unmapped_conditions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <h2 className="text-amber-800 font-semibold text-sm mb-2">AI가 확신하지 못한 항목 {draft.unmapped_conditions.length}건</h2>
              <div className="space-y-2">
                {draft.unmapped_conditions.map((u, i) => (
                  <div key={i}>
                    <p className="text-amber-900 text-xs">{u.text}</p>
                    <p className="text-amber-700 text-[11px] mt-0.5">사유: {u.reason}</p>
                  </div>
                ))}
              </div>
              <p className="text-amber-800 text-[11px] font-semibold mt-3">→ 판정에서 &quot;확인 필요&quot;로 처리됩니다</p>
            </div>
          )}

          {/* 제출 서류 */}
          {draft.required_documents.length > 0 && (
            <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm">
              <div className="px-5 py-4 border-b border-[#E4E6EA]">
                <h2 className="text-[#111111] font-semibold text-sm">제출 서류</h2>
                <p className="text-[10px] text-[#888888] mt-0.5">서류 카탈로그({documentTypes.length}종)와 이름이 맞으면 발급 소요기간을 역산할 수 있습니다</p>
              </div>
              <div className="px-5 py-3 space-y-1.5">
                {draft.required_documents.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${d.document_type_id ? "bg-[#3D7260] text-white" : "bg-[#E4E6EA] text-[#888888]"}`}>
                      {d.document_type_id ? "✓" : "?"}
                    </span>
                    <span className="text-[#111111] text-xs">{d.name}</span>
                    {!d.is_required && <span className="text-[10px] text-[#888888]">(선택)</span>}
                    {!d.document_type_id && <span className="text-[10px] text-[#888888]">카탈로그 미등록</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 즉시 판정 */}
          <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm">
            <div className="px-5 py-4 border-b border-[#E4E6EA] flex items-center justify-between">
              <div>
                <h2 className="text-[#111111] font-semibold text-sm">내 프로필로 판정</h2>
                <p className="text-[10px] text-[#888888] mt-0.5">프로필은 서버로 전송되지 않습니다. 이 계산은 브라우저에서 실행됩니다.</p>
              </div>
              <button onClick={() => setVerdictShown(true)}
                className="text-xs font-semibold text-white bg-[#6E62C2] px-4 py-2 rounded-xl hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25">
                판정 실행
              </button>
            </div>
            {verdictShown && verdict && (
              <div className="px-5 py-4 space-y-3">
                <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                  verdict.status === "pass" ? "bg-[#EEF4F0] text-[#2A5A46] border-[#B2D1BF]"
                  : verdict.status === "conditional" ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-rose-50 text-rose-600 border-rose-200"}`}>
                  {verdict.status === "pass" ? "대상" : verdict.status === "conditional" ? "조건부" : "제외"}
                </span>
                {verdict.nearMissReason && <p className="text-amber-700 text-xs">{verdict.nearMissReason}</p>}
                {verdict.failReason && <p className="text-rose-700 text-xs">{verdict.failReason}</p>}

                <div className="border border-[#E4E6EA] rounded-xl overflow-hidden">
                  <div className="grid grid-cols-3 bg-[#F5F6F8] px-4 py-2 text-[10px] font-semibold text-[#888888] uppercase tracking-wide">
                    <span>요건 항목</span><span>기준 조건</span><span>우리 회사</span>
                  </div>
                  {(verdict.eligibility ?? []).map((item, i) => (
                    <div key={i} className={`grid grid-cols-3 px-4 py-3 items-center border-t border-[#E4E6EA] ${i % 2 === 0 ? "bg-white" : "bg-[#F5F6F8]/40"}`}>
                      <span className="text-[#444444] text-xs font-medium">{item.label}</span>
                      <span className="text-[#888888] text-xs">{item.required}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold shrink-0 ${
                          item.state === "pass" ? "bg-[#3D7260] text-white" : item.state === "fail" ? "bg-rose-400 text-white" : "bg-amber-400 text-white"}`}>
                          {item.state === "pass" ? "✓" : item.state === "fail" ? "✕" : "?"}
                        </span>
                        <span className={`text-xs font-medium ${item.state === "pass" ? "text-[#2A5A46]" : item.state === "fail" ? "text-rose-600" : "text-amber-700"}`}>{item.current}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
