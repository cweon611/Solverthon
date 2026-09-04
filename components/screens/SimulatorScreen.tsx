"use client";

// design/BridgePage.tsx 1193–1317행 SimulatorPage. employeeRules(법적 사실 오류) 삭제 → useSimulation() 결과(§4.5-9).
// 인원을 줄이는 경우는 제목만 "사라지는 법정 의무 / 새로 열리는 지원 자격"으로 바뀐다(§8 S7 허용된 추가).

import { useState } from "react";

import { PHOTOS } from "@/lib/constants";
import { useCompany, useEmployeeThresholdCards, useSimulation } from "@/lib/store/hooks";

import { Disclaimer } from "@/components/ui/Disclaimer";
import { Img } from "@/components/ui/Img";

const THRESHOLD_CARDS = [5, 10, 30];

export function SimulatorScreen() {
  const company = useCompany();
  const [simEmployees, setSimEmployees] = useState(company.employees);
  const sim = useSimulation(simEmployees);
  const cards = useEmployeeThresholdCards(THRESHOLD_CARDS);

  const increasing = simEmployees > company.employees;
  const obligations = increasing ? sim.newObligations : sim.removedObligations;
  const programs = increasing ? sim.lostPrograms : sim.gainedPrograms;
  const hasChange = simEmployees !== company.employees;

  return (
    <div className="p-6 space-y-5">

      {/* 헤더 — lifestyle 가로 배너 */}
      <div className="relative rounded-3xl overflow-hidden h-36">
        <Img src={PHOTOS.teamMeeting} alt="팀 미팅 자연광" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent" />
        <div className="absolute inset-0 p-6 flex flex-col justify-center">
          <h1 className="text-2xl font-display font-bold text-[#111111]">직원 시뮬레이터</h1>
          <p className="text-[#444444] text-sm mt-1">뽑기 전에 의무와 자격 변화를 먼저 확인하세요.</p>
        </div>
      </div>

      {/* 슬라이더 카드 */}
      <div className="bg-white border border-[#E4E6EA] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="text-center flex-1">
            <p className="text-[#888888] text-xs mb-1">현재</p>
            <p className="text-3xl font-display font-bold text-[#111111]">{company.employees}<span className="text-lg text-[#888888] ml-1">인</span></p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#6E62C2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </div>
          <div className="text-center flex-1">
            <p className="text-[#888888] text-xs mb-1">시뮬레이션</p>
            <p className={`text-3xl font-display font-bold font-mono ${simEmployees > company.employees ? "text-amber-600" : simEmployees < company.employees ? "text-blue-600" : "text-[#111111]"}`}>{simEmployees}<span className="text-lg text-[#888888] ml-1">인</span></p>
          </div>
        </div>

        <input type="range" min={1} max={50} value={simEmployees}
          onChange={e => setSimEmployees(Number(e.target.value))}
          className="w-full accent-[#6E62C2]" />
        <div className="flex justify-between text-[10px] text-[#888888] mt-1 font-mono px-0.5">
          {[1, 5, 10, 20, 30, 50].map(n => <span key={n}>{n}</span>)}
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {[{ n: 5, label: "5인" }, { n: 10, label: "10인" }, { n: 30, label: "30인" }].map(m => (
            <button key={m.n} onClick={() => setSimEmployees(m.n)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer ${simEmployees >= m.n && company.employees < m.n ? "bg-[#6E62C2] text-white border-[#6E62C2] shadow-md shadow-[#6E62C2]/25" : "border-[#E4E6EA] text-[#444444] hover:border-[#6E62C2]/40 bg-[#F5F6F8]"}`}>
              {m.label} 구간
            </button>
          ))}
        </div>
      </div>

      {/* 결과 */}
      {hasChange ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-amber-600">⚡</span>
              <h3 className="text-[#111111] font-semibold text-sm">{increasing ? "새로 생기는 법정 의무" : "사라지는 법정 의무"}</h3>
              <span className="ml-auto text-xs font-mono font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">{obligations.length}</span>
            </div>
            {obligations.length > 0 ? (
              <ul className="space-y-2">
                {obligations.map((ob, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 mt-0.5 shrink-0">▸</span>
                    <span className="text-[#444444]">{ob}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[#888888] text-sm">{increasing ? "이 구간에서 새 의무 없음" : "이 구간에서 사라지는 의무 없음"}</p>}
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-rose-500">✕</span>
              <h3 className="text-[#111111] font-semibold text-sm">{increasing ? "사라지는 지원 자격" : "새로 열리는 지원 자격"}</h3>
              <span className="ml-auto text-xs font-mono font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">{programs.length}</span>
            </div>
            {programs.length > 0 ? (
              <ul className="space-y-2">
                {programs.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-rose-400 mt-0.5 shrink-0">▸</span>
                    <span className="text-[#444444]">{g}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[#888888] text-sm">{increasing ? "소멸되는 자격 없음" : "새로 열리는 자격 없음"}</p>}
          </div>
        </div>
      ) : (
        <div className="bg-[#F5F6F8] border border-[#E4E6EA] rounded-2xl p-8 text-center">
          <p className="text-[#888888]">슬라이더를 움직여 인원 변화 시나리오를 확인하세요</p>
          <p className="text-[#888888]/60 text-sm mt-1">5인·10인·30인 구간을 넘을 때 의무와 자격이 동시에 바뀝니다</p>
        </div>
      )}

      {/* 3D 컷 + 안내 — 임계값별 새 의무 제목(최대 3개)에서 생성(§6.4) */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map(t => (
          <div key={t.n} className="bg-[#F5F6F8] rounded-2xl p-4 border border-[#E4E6EA]">
            <span className="text-[#6E62C2] font-mono font-bold text-base">{t.n}</span>
            <p className="text-[#888888] text-[11px] mt-1.5 leading-relaxed">{t.desc}</p>
          </div>
        ))}
      </div>
    <Disclaimer />
    </div>
  );
}
