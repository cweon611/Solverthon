"use client";

// 미충족·확인필요 요건을 AI가 쉬운 말로 풀어주고 충족 방법을 안내한다.
// 서버로 보내는 것은 공고 id와 요건 행(라벨·기준·원문·상태)뿐이다. 회사의 현재 값은 보내지 않는다 (§0.1-4).
// 판정은 lib/engine이 이미 끝냈고, 이 설명은 판정을 바꾸지 않는다 (§0.1-1).

import { useState } from "react";

import type { CoachOutput } from "@/lib/ai/geminiSchemas";
import type { Grant } from "@/lib/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: CoachOutput; model: string }
  | { status: "error"; message: string };

export function ConditionCoach({ grant }: { grant: Grant }) {
  const [state, setState] = useState<State>({ status: "idle" });

  const rows = (grant.eligibility ?? [])
    .filter((e) => e.state !== "pass")
    .map((e) => ({ label: e.label, required: e.required, sourceText: e.sourceText, state: e.state as "fail" | "check" }));
  if (rows.length === 0) return null;

  const run = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: grant.id, criteria: rows.slice(0, 15) }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? `요청 실패 (${res.status})`);
      setState({ status: "done", data: body.coach as CoachOutput, model: body.usage?.model ?? "" });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "알 수 없는 오류" });
    }
  };

  return (
    <div className="mt-2">
      {state.status !== "done" && (
        <button
          onClick={run}
          disabled={state.status === "loading"}
          className="w-full text-left bg-white border border-[#dddaf4] rounded-xl px-3 py-2.5 hover:bg-[#f0eef9] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          <p className="text-xs font-semibold text-[#6E62C2]">
            ✦ {state.status === "loading" ? "AI 코치가 요건을 읽고 있습니다…" : "AI 코치에게 물어보기 — 이 요건, 어떻게 충족하나요?"}
          </p>
          <p className="text-[10px] text-[#888888] mt-0.5">요건의 뜻과 충족 방법만 설명합니다. 판정은 바꾸지 않습니다.</p>
        </button>
      )}

      {state.status === "error" && (
        <div className="mt-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          <p className="text-rose-700 text-xs">{state.message}</p>
        </div>
      )}

      {state.status === "done" && (
        <div className="bg-[#f0eef9]/60 border border-[#dddaf4] rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-[#444444] leading-relaxed">{state.data.summary}</p>
            <button onClick={run} className="text-[10px] text-[#888888] hover:text-[#6E62C2] shrink-0 cursor-pointer">다시 생성</button>
          </div>

          <div className="space-y-2">
            {state.data.items.map((item, i) => (
              <div key={i} className="bg-white border border-[#E4E6EA] rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-[#111111]">{item.requirement}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${item.can_fix_now ? "bg-[#EEF4F0] text-[#2A5A46] border-[#B2D1BF]" : "bg-[#F5F6F8] text-[#888888] border-[#E4E6EA]"}`}>
                    {item.can_fix_now ? "지금 행동으로 해결 가능" : "시간·상황이 필요"}
                  </span>
                </div>
                <p className="text-xs text-[#444444] leading-relaxed">{item.meaning}</p>
                {item.how_to_meet.length > 0 && (
                  <ol className="space-y-1 pl-4 list-decimal">
                    {item.how_to_meet.map((step, j) => (
                      <li key={j} className="text-xs text-[#444444] leading-relaxed">{step}</li>
                    ))}
                  </ol>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {item.where_to_check && <p className="text-[11px] text-[#6E62C2]">확인처: {item.where_to_check}</p>}
                  {item.caution && <p className="text-[11px] text-amber-700">주의: {item.caution}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#6E62C2] text-white rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-semibold opacity-80">오늘 할 첫 행동</p>
            <p className="text-xs font-semibold mt-0.5">{state.data.next_step}</p>
          </div>

          <p className="text-[10px] text-[#888888]">
            AI 설명은 참고용입니다. 자격 판정은 코드가 했고 이 설명은 판정을 바꾸지 않습니다. 최종 확인은 공고 원문과 주관기관에서 하세요.
            {state.model && <span className="font-mono"> · {state.model}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
