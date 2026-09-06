"use client";

// S10 AI 파싱 데모 (§8 S10) — "AI는 읽고, 판정은 코드가 한다"를 동작으로 보여준다.
// 프로필은 서버로 보내지 않는다. 판정은 받은 초안으로 클라이언트에서 실행한다 (§9).

import { useRef, useState } from "react";
import { toast } from "sonner";

import { evaluateProgram } from "@/lib/engine/evaluate";
import { useCatalog, useFlatProfile, useToday } from "@/lib/store/hooks";
import type { Condition, ConditionGroup, Program, ProgramDocument, UnmappedCondition } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toGrant } from "@/lib/view/toGrant";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { chip } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, cardTitleClass } from "@/components/ui/card";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Textarea } from "@/components/ui/textarea";
import { grantStatusBadge } from "@/components/ui/variants";

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

  // 예시 불러오기는 실패하면 입력칸만 비우고 조용히 끝났다 — 네트워크 오류는 그마저도 없었다
  const loadPreset = async (file: string, label: string) => {
    setError(null);
    try {
      const res = await fetch(`/presets/${file}.txt`);
      if (!res.ok) {
        setText("");
        toast.error("예시 공고문을 불러오지 못했습니다", { description: `${label} · 서버 응답 ${res.status}` });
        return;
      }
      const body = await res.text();
      setText(body);
      toast.success(`예시 공고문을 붙여넣었습니다 — ${label}`, {
        description: `${body.length.toLocaleString()}자 · 오른쪽 아래 구조화 실행을 눌러 주세요`,
      });
    } catch (e) {
      toast.error("예시 공고문을 불러오지 못했습니다", {
        description: e instanceof Error ? e.message : "네트워크 오류",
      });
    }
  };

  const run = async () => {
    setRunning(true); setRaw(""); setBasics(null); setDraft(null); setUsage(null);
    setError(null); setVerdictShown(false);
    const tid = toast.loading("공고문을 구조화하는 중…", {
      description: `${text.trim().length.toLocaleString()}자를 AI가 읽고 있습니다. 자격 판정은 규칙 엔진이 따로 합니다.`,
    });
    let settled = false; // final·error 없이 스트림이 끊기는 경우
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
            settled = true;
            const got = evt.program as ProgramDraft;
            const found = got.eligibility.conditions.flatMap(flatten).length;
            const unsure = got.unmapped_conditions.length;
            toast.success(`공고문을 구조화했습니다 — ${(evt.parsed as ParsedBasics).title}`, {
              id: tid,
              description: `조건 ${found}건 · 제출서류 ${got.required_documents.length}건${unsure > 0 ? ` · AI가 확신하지 못한 항목 ${unsure}건` : ""}`,
            });
          } else if (evt.type === "error") {
            setError(evt.message);
            settled = true;
            toast.error("구조화에 실패했습니다", { id: tid, description: String(evt.message) });
          }
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(message);
      settled = true;
      toast.error("구조화에 실패했습니다", { id: tid, description: message });
    } finally {
      setRunning(false);
      if (!settled) {
        toast.error("구조화가 도중에 끊겼습니다", { id: tid, description: "응답이 끝까지 오지 않았습니다. 다시 실행해 주세요." });
      }
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

  // 판정 결과는 카드 아래쪽에 그려져 화면 밖일 수 있다 — 결론만 토스트로 한 번 더 알린다
  const showVerdict = () => {
    setVerdictShown(true);
    if (!verdict) return;
    const rows = verdict.eligibility?.length ?? 0;
    const checked = `요건 ${rows}개를 브라우저에서 대조했습니다`;
    if (verdict.status === "pass") toast.success("판정 결과: 대상", { description: checked });
    else if (verdict.status === "conditional") toast.warning("판정 결과: 조건부", { description: verdict.nearMissReason ?? checked });
    else toast.info("판정 결과: 제외", { description: verdict.failReason ?? checked });
  };

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
              <button key={p.file} onClick={() => void loadPreset(p.file, p.label)} disabled={running}
                className={cn(chip({ on: false }), "disabled:opacity-50")}>
                {p.label}
              </button>
            ))}
          </div>

          <Textarea
            variant="pasteMonoH64"
            value={text}
            onChange={(e) => {
              const next = e.target.value;
              // 긴 공고문은 조용히 잘려 나갔다. 고정 id라 계속 입력해도 토스트가 쌓이지 않는다.
              if (next.length > MAX_CHARS) {
                toast.warning("공고문이 길어 뒷부분을 잘랐습니다", {
                  id: "parse-max-chars",
                  description: `한 번에 ${MAX_CHARS.toLocaleString()}자까지 읽습니다. 자격 요건이 담긴 부분을 남겨 주세요.`,
                });
              }
              setText(next.slice(0, MAX_CHARS));
            }}
            placeholder="공고 원문을 붙여넣으세요"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#888888] font-mono">{text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}자</span>
            <Button onClick={run} disabled={running || text.trim().length === 0}
              variant="primary" pad="5x2" text="sm" radius="xl" elevate="brand" motion="colors" off="o40"
              className="flex items-center gap-2">
              {running && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {running ? "구조화 중…" : "구조화 실행"}
            </Button>
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
        <Alert radius="2xl" pad="lg">
          <p className="text-rose-700 text-xs font-semibold">{error}</p>
        </Alert>
      )}

      {basics && draft && (
        <div className="space-y-4">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <h2 className={cardTitleClass}>기본 정보</h2>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
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
            </CardContent>
          </Card>

          {/* 추출 조건 */}
          <Card clip>
            <CardHeader layout="row">
              <h2 className={cardTitleClass}>추출된 조건</h2>
              <Badge size="md" weight="mono" tone="brand">{conditions.length}건</Badge>
            </CardHeader>
            {conditions.length === 0 ? (
              <p className="px-5 py-6 text-center text-[#888888] text-xs">추출된 조건이 없습니다.</p>
            ) : (
              <CardContent size="none" list>
                {conditions.map((c, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge size="md" weight="mono" tone="brand">{c.field}</Badge>
                      <span className="text-[#111111] text-xs font-semibold">{String(Array.isArray(c.value) ? c.value.join(", ") : c.value)} {OP_LABEL[c.op] ?? c.op}</span>
                      <span className="text-[#888888] text-xs">{c.label}</span>
                    </div>
                    <p className="text-[11px] text-[#888888] bg-[#F5F6F8] rounded-lg px-3 py-2 italic mt-2">{c.source_text}</p>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* AI가 확신하지 못한 항목 */}
          {draft.unmapped_conditions.length > 0 && (
            <Alert tone="warning" radius="2xl" pad="x2">
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
            </Alert>
          )}

          {/* 제출 서류 */}
          {draft.required_documents.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className={cardTitleClass}>제출 서류</h2>
                <p className="text-[10px] text-[#888888] mt-0.5">서류 카탈로그({documentTypes.length}종)와 이름이 맞으면 발급 소요기간을 역산할 수 있습니다</p>
              </CardHeader>
              <CardContent size="tight" className="space-y-1.5">
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
              </CardContent>
            </Card>
          )}

          {/* 즉시 판정 */}
          <Card>
            <CardHeader layout="between">
              <div>
                <h2 className={cardTitleClass}>내 프로필로 판정</h2>
                <p className="text-[10px] text-[#888888] mt-0.5">프로필은 서버로 전송되지 않습니다. 이 계산은 브라우저에서 실행됩니다.</p>
              </div>
              <Button onClick={showVerdict}
                variant="primary" pad="4x2" text="xs" radius="xl" elevate="brand" motion="colors">
                판정 실행
              </Button>
            </CardHeader>
            {verdictShown && verdict && (
              <CardContent className="space-y-3">
                <Badge size="lg" weight="semibold" tone={grantStatusBadge[verdict.status]} fixed="inlineBlock">
                  {verdict.status === "pass" ? "대상" : verdict.status === "conditional" ? "조건부" : "제외"}
                </Badge>
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
              </CardContent>
            )}
          </Card>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
