"use client";

// design/BridgePage.tsx 1107–1174행 ExpiringPage. expiresIn null(직원수형 "채용 시") 처리(§4.5-18), 버튼은 외부 링크(§4.5-8).
// 하단 "판정 기준" 문구는 유지(§4.2).

import { EXPIRY_AMBER, EXPIRY_ROSE, PHOTOS } from "@/lib/constants";
import { resolveApplyUrl } from "@/lib/sourceLinks";
import { useCatalog, useExpiring } from "@/lib/store/hooks";

import { CutoutFrame } from "@/components/ui/CutoutFrame";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { ExtLink } from "@/components/ui/ExtLink";
import { Img } from "@/components/ui/Img";

export function ExpiringScreen() {
  const expiringItems = useExpiring();
  const { programs } = useCatalog();
  const urlFor = (programId: string) => {
    const p = programs.find(x => x.id === programId);
    return p ? resolveApplyUrl(p) : null;
  };

  return (
    <div className="p-6 space-y-5">

      {/* 헤더 — 3D cutout 스타일 */}
      <div className="flex items-start gap-5">
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-[#111111]">곧 사라짐</h1>
          <p className="text-[#888888] text-sm mt-1">만료 3개월 전 미리 알려드립니다. 지나가면 다시 받지 못합니다.</p>
        </div>
        <CutoutFrame src={PHOTOS.plantDesk} alt="책상 위 식물 자연광" className="w-28 h-20 shrink-0" />
      </div>

      {expiringItems.length === 0 && (
        <div className="bg-[#F5F6F8] rounded-2xl p-8 text-center">
          <p className="text-[#888888] text-sm">3개월 안에 사라지는 자격이 없습니다.</p>
        </div>
      )}

      <div className="space-y-4">
        {expiringItems.map((item, i) => {
          const urgent = item.expiresIn !== null && item.expiresIn <= EXPIRY_ROSE;
          const soon = item.expiresIn !== null && item.expiresIn <= EXPIRY_AMBER;
          return (
          <div key={item.id} className={`rounded-3xl overflow-hidden border shadow-sm ${urgent ? "border-rose-200" : soon ? "border-amber-200" : "border-[#E4E6EA]"}`}>

            {/* 라이프스타일 / 3D 컷 교차 */}
            {i % 2 === 0 ? (
              <div className="relative h-28">
                <Img
                  src={i === 0 ? PHOTOS.teamMeeting : PHOTOS.heroLifestyle}
                  alt="자연광 라이프스타일"
                  className="w-full h-full object-cover"
                />
                <div className={`absolute inset-0 ${urgent ? "bg-rose-900/50" : "bg-amber-900/40"} mix-blend-multiply`} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                <div className="absolute bottom-3 left-5 flex items-center gap-2">
                  <span className="text-white font-mono font-bold text-2xl">{item.expiresIn === null ? "채용 시" : `D-${item.expiresIn}`}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${item.axis === "업력" ? "bg-blue-500 text-white" : item.axis === "대표자연령" ? "bg-purple-500 text-white" : "bg-green-500 text-white"}`}>{item.axis}</span>
                </div>
              </div>
            ) : (
              <div className={`h-20 flex items-center px-5 gap-4 ${urgent ? "bg-rose-50" : soon ? "bg-amber-50" : "bg-[#F5F6F8]"}`}>
                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-display shrink-0 shadow-sm ${urgent ? "bg-rose-500 text-white shadow-rose-200" : soon ? "bg-amber-500 text-white shadow-amber-200" : "bg-[#6E62C2] text-white shadow-[#6E62C2]/20"}`}>
                  {item.expiresIn === null ? (
                    <span className="text-[10px] font-bold leading-none">채용 시</span>
                  ) : (
                    <>
                      <span className="text-[9px] opacity-70">D-</span>
                      <span className="text-lg font-bold leading-none">{item.expiresIn}</span>
                    </>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${urgent ? "text-rose-700" : "text-amber-700"}`}>{item.grantName}</p>
                  <p className="text-[#888888] text-xs">{item.axis} 기준</p>
                </div>
              </div>
            )}

            {/* 상세 */}
            <div className="bg-white px-5 py-4">
              <p className="text-[#111111] font-semibold text-sm">{item.grantName}</p>
              <p className="text-[#888888] text-xs mt-1">{item.reason}</p>
              {soon && (
                <ExtLink href={urlFor(item.programId)} className="inline-block mt-3 text-xs font-semibold bg-[#6E62C2] hover:bg-[#5a50a8] text-white px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25">
                  지금 신청하기 →
                </ExtLink>
              )}
            </div>
          </div>
          );
        })}
      </div>

      <div className="bg-[#F5F6F8] rounded-2xl p-4">
        <p className="text-[#888888] text-xs leading-relaxed">
          <span className="text-[#111111] font-semibold">판정 기준:</span> 업력(개업일), 대표자 연령, 상시근로자 수 세 축으로 만료 시점 계산.
          90일·30일·7일 전 대시보드 배너로 알립니다. (이메일·푸시는 향후 제공) 마이페이지에서 설정 변경 가능.
        </p>
      </div>

      <Disclaimer />
    </div>
  );
}
