"use client";

// design/BizBuddyPage.tsx 399–641행 GrantsPage + statusLabel/statusStyle.
// 법정의무 탭은 공유 useTasks() 사용(§4.5-4). 회사명·직원·업력 보간(§4.5-6). 버튼은 외부 링크(§4.5-8).

import Link from "next/link";
import { useState } from "react";

import { PHOTOS } from "@/lib/constants";
import { fmtBusinessAge } from "@/lib/engine/format";
import { useCompany, useTasks, useVerdicts } from "@/lib/store/hooks";
import type { GrantStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

import { CriteriaTable } from "@/components/ui/CriteriaTable";
import { CutoutFrame } from "@/components/ui/CutoutFrame";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { ExtLink } from "@/components/ui/ExtLink";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { button, segmented } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { cardMutedVariants, chipVariants, grantStatusBadge } from "@/components/ui/variants";

const statusLabel: Record<GrantStatus, string> = { pass: "대상", fail: "제외", conditional: "조건부" };
// 색은 variants.ts의 grantStatusBadge(= 옛 statusStyle 맵)로 옮겼다.

// <a>/<Link> 버튼 흉내 — asChild가 없으므로 button()으로 className만 만든다.
const LINK_PRIMARY = cn(button({ variant: "primary", pad: "4x2.5", text: "sm", radius: "xl", motion: "colors" }), "flex-1 text-center");
const LINK_SOFT = cn(button({ variant: "soft", pad: "4x2.5", text: "sm", radius: "xl", motion: "colors" }), "font-medium");
const LINK_OUTLINE = cn(button({ variant: "outline", pad: "4x2.5", text: "sm", radius: "xl", motion: "colors" }), "bg-white font-medium");
// 펼친 행 안쪽 작은 링크 2종. 글자 크기는 부모(text-xs)에서 상속받는다.
const PILL_SOFT = cn(button({ variant: "soft", pad: "3x1.5", radius: "lg", motion: "colors" }), "font-medium");
const PILL_OUTLINE = cn(button({ variant: "outline", pad: "3x1.5", radius: "lg", motion: "colors" }), "bg-white font-medium");

export function GrantsScreen() {
  const company = useCompany();
  const grants = useVerdicts();
  const { tasks } = useTasks();
  const [category, setCategory] = useState<"grants" | "obligations">("grants");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPassId, setExpandedPassId] = useState<string | null>(null);

  const passGrants        = grants.filter(g => g.status === "pass");
  const conditionalGrants = grants.filter(g => g.status === "conditional");
  const failGrants        = grants.filter(g => g.status === "fail");

  return (
    <div className="p-6 space-y-5">

      {/* 헤더 */}
      <div className="flex items-end gap-5">
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-[#111111]">판정함</h1>
          <p className="text-[#888888] text-sm mt-1">{company.name} 프로필 기준 자동 판정 결과입니다.</p>
        </div>
        <CutoutFrame src={PHOTOS.deskDocuments} alt="서류 책상" className="w-36 h-20 shrink-0" />
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-0 bg-[#F5F6F8] rounded-xl p-1 w-fit border border-[#E4E6EA]">
        {([
          { id: "grants",      label: "지원사업", count: passGrants.length + "건 대상" },
          { id: "obligations", label: "법정의무", count: tasks.filter(t => !t.done).length + "건 미완료" },
        ] as const).map(cat => (
          <button key={cat.id} onClick={() => setCategory(cat.id)}
            className={cn(segmented({ on: category === cat.id, size: "md" }), "flex items-center gap-2")}>
            {cat.label}
            <Badge size="sm" weight="mono" bordered={false} tone={null}
              className={category === cat.id ? "bg-[#6E62C2]/10 text-[#6E62C2]" : "bg-[#E4E6EA] text-[#888888]"}>{cat.count}</Badge>
          </button>
        ))}
      </div>

      {/* ── 지원사업 판정 ── */}
      {category === "grants" && (
        <div className="space-y-6">

          {/* 대상 — 크고 상세한 카드 */}
          <section>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#3D7260] shrink-0" />
              <h2 className="text-sm font-bold text-[#111111]">신청 가능 지원사업</h2>
              <Badge size="count" weight="mono" tone="successAlt">{passGrants.length}건</Badge>
            </div>

            {passGrants.length === 0 ? (
              <div className={cn(cardMutedVariants({ pad: "p8", center: true }), "text-[#888888] text-sm")}>해당 조건의 지원사업이 없습니다.</div>
            ) : (
              <div className="grid gap-4">
                {passGrants.map(grant => {
                  const passedLabels = grant.eligibility?.filter(e => e.state === "pass").map(e => e.label) ?? [];
                  return (
                  <div key={grant.id} className="bg-white border border-[#B2D1BF]/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#92BFAA] transition-all">
                    {/* 상단 색상 띠 */}
                    <div className="h-1 bg-gradient-to-r from-[#6FA48E] to-[#4D8C72]" />
                    <div className="p-5">
                      {/* 제목행 */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <Badge size="lg" weight="semibold" tone={grantStatusBadge[grant.status]} fixed="shrink0">{statusLabel[grant.status]}</Badge>
                            <span className="text-[#888888] text-xs">{grant.agency}</span>
                            {grant.isSynthetic && (
                              <span className="text-[10px] text-[#888888]">시연용 데이터</span>
                            )}
                            {!grant.isSynthetic && grant.reviewStatus === "ai_draft" && (
                              <span className="text-[10px] text-[#888888]">AI 판독 · 검수 전</span>
                            )}
                            {grant.supportType && (
                              <Badge size="md" weight="medium" tone="brand">{grant.supportType}</Badge>
                            )}
                          </div>
                          <h3 className="text-[#111111] font-bold text-base leading-snug">{grant.name}</h3>
                          {grant.fit && grant.fit.reasons.length > 0 && (
                            <p className="text-[11px] text-[#6E62C2] mt-1.5 flex flex-wrap items-center gap-1">
                              <span className="font-semibold">우리 회사 맞춤</span>
                              {grant.fit.reasons.map((r) => (
                                <span key={r} className="bg-[#6E62C2]/10 rounded-md px-1.5 py-0.5">{r}</span>
                              ))}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[#111111] text-lg font-bold font-mono leading-none">{grant.amount}</p>
                          <p className="text-[#888888] text-xs mt-1">마감 {grant.deadline}</p>
                        </div>
                      </div>

                      {/* 사업 설명 */}
                      {grant.description && (
                        <p className="text-[#444444] text-xs leading-relaxed mb-4">{grant.description}</p>
                      )}

                      {/* 자격 충족 배너 — 클릭으로 상세 토글 */}
                      <div className="mb-4">
                        <Button
                          onClick={() => setExpandedPassId(expandedPassId === grant.id ? null : grant.id)}
                          variant="successBanner" pad="4x3" radius="xl" block motion="colors" className="group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[#3D7260] font-bold text-sm">✓</span>
                              <p className="text-[#2A5A46] text-sm font-semibold">자격 요건 모두 충족</p>
                            </div>
                            <span className={`text-[#3D7260] text-xs font-medium flex items-center gap-1 transition-all ${expandedPassId === grant.id ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}>
                              {expandedPassId === grant.id ? "접기 ▴" : "상세 보기 ▾"}
                            </span>
                          </div>
                          {expandedPassId !== grant.id && (
                            <p className="text-[#3D7260]/70 text-xs mt-1 ml-5">{passedLabels.length > 0 ? `${passedLabels.join("·")} 조건 전부 통과` : "자격 요건 전부 통과"}</p>
                          )}
                        </Button>

                        {/* 펼쳐진 상세 자격 요건 테이블 — 행을 누르면 공고 원문과 상위 근거 */}
                        {expandedPassId === grant.id && grant.eligibility && (
                          <div className="mt-2"><CriteriaTable rows={grant.eligibility} tone="pass" rowKey={grant.id} /></div>
                        )}
                      </div>

                      {/* 주요 정보 그리드 */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: "주관 기관", value: grant.agency },
                          { label: "지원 한도", value: grant.amount },
                          { label: "접수 마감", value: grant.deadline },
                        ].map(item => (
                          <div key={item.label} className="bg-[#F5F6F8] rounded-xl px-3 py-2.5">
                            <p className="text-[10px] text-[#888888] font-medium mb-0.5">{item.label}</p>
                            <p className="text-[#111111] text-xs font-semibold font-mono">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex gap-2">
                        <ExtLink href={grant.applyUrl ?? grant.originalUrl} className={LINK_PRIMARY}>
                          {grant.isSynthetic ? "포털에서 찾기 →" : "신청 바로가기 →"}
                        </ExtLink>
                        <ExtLink href={grant.originalUrl} className={LINK_SOFT}>
                          공고 원문
                        </ExtLink>
                        {grant.hasDocuments && (
                          <Link href={`/grants/${grant.id}/documents`} className={LINK_SOFT}>
                            준비서류 확인
                          </Link>
                        )}
                        <Link href={`/grants/${grant.id}/draft`} className={LINK_SOFT}>
                          ✦ 신청서 초안
                        </Link>
                        {grant.attachmentUrl && (
                          <ExtLink href={grant.attachmentUrl} className={LINK_OUTLINE}>
                            첨부파일
                          </ExtLink>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 조건부 + 제외 — 컴팩트 리스트 */}
          {(conditionalGrants.length > 0 || failGrants.length > 0) && (
            <section>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#D0D3DA] shrink-0" />
                <h2 className="text-sm font-bold text-[#888888]">기타 지원사업</h2>
                <Badge size="count" weight="mono" tone="muted">{conditionalGrants.length + failGrants.length}건</Badge>
              </div>
              <div className="space-y-1.5">
                {[...conditionalGrants, ...failGrants].map(grant => (
                  <div key={grant.id} className="bg-white border border-[#E4E6EA] rounded-xl overflow-hidden">
                    <Button variant="rowDisclosure" pad="4x3" block motion="colors" className="flex items-center gap-3"
                      onClick={() => setExpandedId(expandedId === grant.id ? null : grant.id)}>
                      <Badge size="lg" weight="semibold" tone={grantStatusBadge[grant.status]} fixed="shrink0">{statusLabel[grant.status]}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#444444] font-medium text-sm truncate">{grant.name}</p>
                        <p className="text-[#888888] text-xs mt-0.5">{grant.agency} · {grant.amount}</p>
                      </div>
                      <span className="text-[#888888] text-xs shrink-0">마감 {grant.deadline}</span>
                      <span className={`text-[#888888] text-xs transition-transform ml-1 ${expandedId === grant.id ? "rotate-180" : ""}`}>▾</span>
                    </Button>
                    {expandedId === grant.id && (
                      <div className="px-4 pb-4 border-t border-[#E4E6EA]">
                        <div className="pt-3 space-y-2">
                          {grant.status === "conditional" && (
                            <Alert tone="warning" pad="xsTall">
                              <p className="text-amber-700 text-xs font-semibold">
                                {grant.subStatus === "needs_check" ? "? 확인이 필요한 요건" : "△ 조건 하나 부족"} — {grant.nearMissReason}
                              </p>
                            </Alert>
                          )}
                          {grant.status === "fail" && (
                            <Alert pad="xsTall">
                              <p className="text-rose-700 text-xs font-semibold">✕ 자격 미충족 — {grant.failReason}</p>
                            </Alert>
                          )}
                          {grant.eligibility && grant.eligibility.length > 0 && (
                            <CriteriaTable rows={grant.eligibility} rowKey={grant.id} />
                          )}
                          <div className="flex gap-2 text-xs flex-wrap">
                            <ExtLink href={grant.originalUrl} className={PILL_SOFT}>
                              {grant.isSynthetic ? "포털에서 찾기" : "공고 원문 보기"}
                            </ExtLink>
                            <Link href={`/grants/${grant.id}/draft`} className={PILL_SOFT}>
                              ✦ 신청서 초안
                            </Link>
                            {grant.attachmentUrl && (
                              <ExtLink href={grant.attachmentUrl} className={PILL_OUTLINE}>
                                첨부파일
                              </ExtLink>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── 법정의무 판정 ── */}
      {category === "obligations" && (
        <div className="space-y-2">
          <div className={cn(cardMutedVariants({ pad: "p4" }), "text-xs text-[#888888]")}>
            <span className="text-[#111111] font-semibold">판정 기준:</span> {company.name}의 현재 상태(직원 {company.employees}인, 업력 {fmtBusinessAge(company.ageMonths)})를 기준으로 발생한 법정 의무 목록입니다.
          </div>
          {tasks.map(task => (
            <Card key={task.id} className="px-5 py-4 flex items-start gap-4 hover:border-[#6E62C2]/20 transition-all">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${task.done ? "bg-[#EEF4F0] border border-[#B2D1BF]" : "bg-[#F5F6F8] border border-[#E4E6EA]"}`}>
                {task.done
                  ? <span className="text-[#3D7260] text-xs font-bold">✓</span>
                  : <span className={`w-2 h-2 rounded-full ${task.type === "date" ? "bg-blue-400" : "bg-purple-400"}`} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-semibold ${task.done ? "line-through text-[#888888]" : "text-[#111111]"}`}>{task.title}</p>
                  <Badge size="md" tone={task.type === "date" ? "info" : "purple"}>
                    {task.type === "date" ? "날짜형" : "이벤트형"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-[#888888]">
                  <span className="font-mono">{task.dueDate}</span>
                  <span>{task.authority}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={chipVariants({ tone: "danger" })}>{task.penalty}</span>
                {task.legalCheckedAt === null && (
                  <span className={chipVariants({ tone: "warning" })}>확인 중</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    <Disclaimer />
    </div>
  );
}
