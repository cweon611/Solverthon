"use client";

// S11 중복 공고 판별 데모 (§8 S11)
// 임베딩은 의미를 비교하고, 중복 결정은 임계값 + 기간 겹침이라는 결정론이 내린다 (§3.1).

import { useState } from "react";
import { toast } from "sonner";

import { DEDUPE } from "@/lib/constants";
import { fmtDate, fromIso } from "@/lib/engine/format";
import { useCatalog } from "@/lib/store/hooks";
import type { Program } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { chip, segmented } from "@/components/ui/button-variants";
import { Card, cardTitleClass } from "@/components/ui/card";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Textarea } from "@/components/ui/textarea";
import { cardMutedVariants, dedupeStatusBadge } from "@/components/ui/variants";

interface DedupeResult {
  similarity: number;
  overlap: boolean;
  decision: "duplicate" | "review" | "distinct";
  model: string;
  dimension: number;
}

const SOURCE_LABEL: Record<string, string> = { kstartup: "K-Startup", bizinfo: "기업마당", local: "직접 등록", synthetic: "합성" };

// 색은 badge 표(dedupeStatusBadge)가 들고 있다 — 여기는 라벨만 남긴다.
const DECISION_LABEL = { duplicate: "중복", review: "검토 필요", distinct: "별개" } as const;

function period(p: Program): string {
  if (p.is_rolling || !p.apply_end) return "상시 접수";
  const s = p.apply_start ? fromIso(p.apply_start) : null;
  const e = fromIso(p.apply_end);
  return `${s ? fmtDate(s) : "-"} ~ ${e ? fmtDate(e) : "-"}`;
}

function ProgramCard({ p, side }: { p: Program; side: string }) {
  return (
    <Card pad="p5">
      <div className="flex items-center gap-2 mb-2">
        <Badge size="md" weight="semibold" tone="brand">
          {SOURCE_LABEL[p.source] ?? p.source}
        </Badge>
        <span className="text-[10px] text-[#888888] font-mono">{side}</span>
      </div>
      <p className={cn(cardTitleClass, "leading-snug")}>{p.title}</p>
      <p className="text-[#888888] text-xs mt-1">{p.organization}</p>
      <div className="flex items-center gap-3 mt-2 text-xs">
        <span className="text-[#6E62C2] font-mono font-semibold">{p.amount_text ?? "-"}</span>
        <span className="text-[#888888] font-mono">{period(p)}</span>
      </div>
      {p.summary && <p className="text-[#444444] text-[11px] leading-relaxed mt-3 line-clamp-4">{p.summary}</p>}
    </Card>
  );
}

export function DedupeDemoScreen() {
  const { programs, dualListedIds } = useCatalog();
  const [mode, setMode] = useState<"preset" | "manual">("preset");
  const [pairIndex, setPairIndex] = useState(0);
  const [result, setResult] = useState<DedupeResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");

  // 카탈로그는 canonical만 담고 있으므로, 중복 쪽은 API가 programId로 찾도록 넘긴다.
  // 여기서는 대표 공고와 "같은 기간·같은 사업"인 짝을 프리셋으로 보여준다.
  const canonical = programs.filter((p) => dualListedIds.includes(p.id));
  // 비중복 대조군: 중복 판정을 받지 않은 실공고 중 하나 (시드 제목에 기대지 않는다)
  const distinctPair = programs.filter((p) => !dualListedIds.includes(p.id) && p.parsed_at).slice(0, 1);

  const pairs = [
    ...canonical.map((p) => ({ label: `중복 후보 — ${p.title}`, a: p, b: null as Program | null })),
    ...(distinctPair.length >= 1 ? [{ label: "비중복 대조군", a: distinctPair[0], b: null as Program | null }] : []),
  ];
  const current = pairs[pairIndex];

  const compare = async (body: unknown) => {
    setRunning(true); setError(null); setResult(null);
    const tid = toast.loading("두 공고를 임베딩으로 비교하는 중…", {
      description: "문장을 벡터로 바꿔 코사인 유사도를 냅니다. 판정은 임계값이 합니다.",
    });
    try {
      const res = await fetch("/api/ai/dedupe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? `요청 실패 (${res.status})`);
      const data = json as DedupeResult;
      setResult(data);
      toast.success(`판별 결과: ${DECISION_LABEL[data.decision]}`, {
        id: tid,
        description: `코사인 유사도 ${data.similarity.toFixed(4)} · 접수기간 ${data.overlap ? "겹침" : "안 겹침"} · 임계값 ${DEDUPE.duplicate}`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(message);
      toast.error("유사도를 계산하지 못했습니다", { id: tid, description: message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#111111]">중복 공고 판별</h1>
        <p className="text-[#888888] text-sm mt-1">
          같은 사업이 두 기관에 올라오면 목록이 중복됩니다. 임베딩으로 후보를 찾고 임계값으로 결정합니다.
        </p>
      </div>

      {/* 모드 탭 */}
      <div className="flex gap-0 bg-[#F5F6F8] rounded-xl p-1 w-fit border border-[#E4E6EA]">
        {([{ id: "preset", label: "카탈로그 비교" }, { id: "manual", label: "직접 비교" }] as const).map((t) => (
          <button key={t.id} onClick={() => { setMode(t.id); setResult(null); setError(null); }}
            className={segmented({ on: mode === t.id, size: "md" })}>
            {t.label}
          </button>
        ))}
      </div>

      {mode === "preset" && current && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {pairs.map((p, i) => (
              <button key={p.label} onClick={() => { setPairIndex(i); setResult(null); }}
                className={chip({ on: i === pairIndex, elevate: "sm" })}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ProgramCard p={current.a} side="대표 공고" />
            <div className={cn(cardMutedVariants({ bordered: true, center: true }), "flex flex-col items-center justify-center")}>
              <p className="text-[#888888] text-xs">비교할 공고 원문을 아래에 붙여넣거나</p>
              <p className="text-[#888888] text-xs">직접 비교 탭을 사용하세요</p>
            </div>
          </div>

          <Textarea variant="pasteMonoH32" value={textB} onChange={(e) => setTextB(e.target.value)}
            placeholder="다른 기관에 올라온 같은 사업의 공고문을 붙여넣으세요" />

          <Button onClick={() => compare({ a: { programId: current.a.id }, b: { text: textB } })}
            disabled={running || textB.trim().length === 0}
            variant="primary" pad="5x2" text="sm" radius="xl" elevate="brand" motion="colors" off="o40"
            className="flex items-center gap-2">
            {running && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            유사도 계산
          </Button>
        </div>
      )}

      {mode === "manual" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {([["A", textA, setTextA], ["B", textB, setTextB]] as const).map(([label, value, setter]) => (
              <div key={label} className="space-y-2">
                <p className="text-[11px] text-[#888888] font-medium">공고 {label}</p>
                <Textarea variant="pasteMonoH48" value={value} onChange={(e) => setter(e.target.value)}
                  placeholder={`공고 ${label} 원문`} />
              </div>
            ))}
          </div>
          <Button onClick={() => compare({ a: { text: textA }, b: { text: textB } })}
            disabled={running || textA.trim().length === 0 || textB.trim().length === 0}
            variant="primary" pad="5x2" text="sm" radius="xl" elevate="brand" motion="colors" off="o40"
            className="flex items-center gap-2">
            {running && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            유사도 계산
          </Button>
        </div>
      )}

      {error && (
        <Alert radius="2xl" pad="lg">
          <p className="text-rose-700 text-xs font-semibold">{error}</p>
        </Alert>
      )}

      {result && (
        <Card pad="p6">
          <div className="flex items-start gap-8">
            <div className="text-center shrink-0">
              <p className="text-[#888888] text-xs mb-1">코사인 유사도</p>
              <p className="font-display text-4xl font-bold text-[#111111]">{result.similarity.toFixed(4)}</p>
            </div>

            <div className="flex-1 space-y-2">
              {[
                { label: `유사도 ≥ ${DEDUPE.duplicate}`, ok: result.similarity >= DEDUPE.duplicate },
                { label: "접수기간 겹침", ok: result.overlap },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${c.ok ? "bg-[#3D7260] text-white" : "bg-rose-400 text-white"}`}>
                    {c.ok ? "✓" : "✕"}
                  </span>
                  <span className="text-[#444444] text-xs">{c.label}</span>
                </div>
              ))}
              <div className="pt-2">
                <Badge size="lg" weight="semibold" tone={dedupeStatusBadge[result.decision]} fixed="inlineBlock">
                  {DECISION_LABEL[result.decision]}
                </Badge>
              </div>
            </div>
          </div>

          {result.decision === "duplicate" && (
            <p className="text-[#444444] text-xs mt-4 bg-[#F5F6F8] rounded-xl px-4 py-3">
              먼저 수집된 공고를 대표로 남기고 나머지는 병합합니다. 목록에는 대표 공고만 노출됩니다.
            </p>
          )}

          <p className="text-[10px] text-[#888888] font-mono mt-4">
            임베딩 모델 {result.model} · {result.dimension}차원 · 코사인 유사도 · 중복 {DEDUPE.duplicate} / 검토 {DEDUPE.review}
          </p>
        </Card>
      )}

      <Disclaimer />
    </div>
  );
}
