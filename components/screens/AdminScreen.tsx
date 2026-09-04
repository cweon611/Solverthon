"use client";

// 관리자 대시보드 — 회원·프로필 분포·공고 카탈로그·수집 실행 통계. 집계와 마스킹은 서버가 한다.

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { loadStats, useAdminStats } from "@/lib/admin/statsStore";
import type { Bucket } from "@/lib/admin/stats";
import { useSession } from "@/lib/auth/AuthProvider";
import { logoutAndClear } from "@/lib/store/sync";

const fmtDT = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

function Kpi({ label, value, sub, tone = "default" }: { label: string; value: string | number; sub?: string; tone?: "default" | "purple" | "green" }) {
  const cls = tone === "purple" ? "bg-[#f0eef9] border-[#dddaf4]" : tone === "green" ? "bg-[#EEF4F0] border-[#B2D1BF]" : "bg-white border-[#E4E6EA]";
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="text-[10px] text-[#888888] font-medium">{label}</p>
      <p className="text-2xl font-bold font-mono text-[#111111] mt-1 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-[#888888] mt-1.5">{sub}</p>}
    </div>
  );
}

function Bars({ title, items, color = "bg-[#6E62C2]" }: { title: string; items: Bucket[]; color?: string }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="bg-white border border-[#E4E6EA] rounded-2xl p-5">
      <h3 className="text-sm font-bold text-[#111111] mb-3">{title}</h3>
      {items.length === 0 ? <p className="text-xs text-[#888888]">데이터 없음</p> : (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.label} className="grid grid-cols-[110px_1fr_36px] items-center gap-2">
              <span className="text-[11px] text-[#444444] truncate">{i.label}</span>
              <div className="h-2 rounded bg-[#F5F6F8]"><div className={`h-full rounded ${color}`} style={{ width: `${(i.count / max) * 100}%` }} /></div>
              <span className="text-[11px] font-mono text-[#888888] text-right">{i.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminScreen() {
  const router = useRouter();
  const { status, user } = useSession();
  const stats = useAdminStats();

  useEffect(() => {
    if (status === "anon" || status === "unavailable") router.replace("/login");
  }, [status, router]);

  const denied = status === "authed" && user && !user.isAdmin;

  return (
    <div className="min-h-full bg-[#F5F6F8]">
      <header className="bg-white border-b border-[#E4E6EA]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Image src="/brand/logo.png" alt="비즈버디" width={140} height={45} priority className="h-9 w-auto" />
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-[#6E62C2] uppercase tracking-wide">Admin</p>
            <h1 className="text-lg font-display font-bold text-[#111111] leading-tight">관리자 대시보드</h1>
          </div>
          {user && <span className="text-xs text-[#888888]">{user.loginId}</span>}
          <button onClick={() => void loadStats()} disabled={stats.status === "loading"}
            className="text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#dddaf4] transition-colors cursor-pointer disabled:opacity-50">
            {stats.status === "loading" ? "불러오는 중…" : "새로 고침"}
          </button>
          <Link href="/dashboard" className="text-xs font-semibold text-[#444444] border border-[#E4E6EA] px-3 py-1.5 rounded-xl hover:bg-[#F5F6F8]">앱으로</Link>
          <button onClick={async () => { await logoutAndClear(); router.replace("/login"); }}
            className="text-xs font-semibold text-[#444444] border border-[#E4E6EA] px-3 py-1.5 rounded-xl hover:bg-[#F5F6F8] cursor-pointer">로그아웃</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {denied && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
            <p className="text-rose-700 text-sm font-semibold">관리자만 볼 수 있는 화면입니다.</p>
            <p className="text-rose-600 text-xs mt-1">현재 계정: {user?.loginId}. 관리자 계정으로 다시 로그인하세요.</p>
          </div>
        )}
        {!denied && stats.status === "error" && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6"><p className="text-rose-700 text-sm">{stats.error}</p></div>
        )}
        {!denied && stats.status !== "error" && !stats.data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-24 rounded-2xl bg-white border border-[#E4E6EA] animate-pulse" />)}</div>
        )}

        {!denied && stats.data && (() => {
          const d = stats.data;
          const maxDay = Math.max(...d.users.signupsByDay.map((x) => x.count), 1);
          return (
            <>
              <section>
                <h2 className="text-sm font-bold text-[#111111] mb-3">회원</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Kpi label="전체 회원" value={d.users.total} tone="purple" />
                  <Kpi label="최근 7일 가입" value={d.users.new7d} sub={`30일 ${d.users.new30d}`} />
                  <Kpi label="최근 7일 로그인" value={d.users.active7d} />
                  <Kpi label="프로필 완료" value={d.users.withProfile} sub={d.users.total ? `${Math.round((d.users.withProfile / d.users.total) * 100)}%` : undefined} tone="green" />
                  <Kpi label="사업 방향 입력" value={d.profiles.directions} sub="AI 대화에서 수집" />
                </div>
                <div className="bg-white border border-[#E4E6EA] rounded-2xl p-5 mt-3">
                  <h3 className="text-sm font-bold text-[#111111] mb-3">일별 가입 (최근 30일)</h3>
                  <div className="flex items-end gap-1 h-20">
                    {d.users.signupsByDay.map((x) => (
                      <div key={x.date} className="flex-1 flex flex-col items-center justify-end" title={`${x.date} · ${x.count}명`}>
                        <div className="w-full rounded-t bg-[#6E62C2]" style={{ height: `${Math.max((x.count / maxDay) * 100, x.count ? 8 : 2)}%`, opacity: x.count ? 1 : 0.25 }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[#888888] mt-1">
                    <span>{d.users.signupsByDay[0]?.date.slice(5)}</span><span>{d.users.signupsByDay.at(-1)?.date.slice(5)}</span>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-bold text-[#111111] mb-3">회원 프로필 분포</h2>
                <div className="grid md:grid-cols-3 gap-3">
                  <Bars title="지역" items={d.profiles.regions} />
                  <Bars title="업종" items={d.profiles.industries} />
                  <Bars title="사업자 형태" items={d.profiles.businessType} />
                  <Bars title="상시근로자" items={d.profiles.employees} color="bg-[#6FA48E]" />
                  <Bars title="업력" items={d.profiles.age} color="bg-[#6FA48E]" />
                  <Bars title="보유 인증 · 특성" items={[...d.profiles.certifications, ...d.profiles.flags]} color="bg-amber-400" />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <Kpi label="신청서 초안 생성" value={d.profiles.drafts} sub="계정 데이터 기준" />
                  <Kpi label="완료 처리한 할 일" value={d.profiles.tasksDone} />
                  <Kpi label="직접 추가한 할 일" value={d.profiles.customTasks} />
                </div>
              </section>

              <section>
                <h2 className="text-sm font-bold text-[#111111] mb-3">공고 카탈로그</h2>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <Kpi label="공고 수" value={d.programs.total} sub={`실수집 ${d.programs.real} · 합성 ${d.programs.synthetic}`} tone="purple" />
                  <Kpi label="AI 파싱 완료" value={d.programs.parsed} sub={d.programs.total ? `${Math.round((d.programs.parsed / d.programs.total) * 100)}%` : undefined} />
                  <Kpi label="접수중" value={d.programs.open} sub={`마감임박 ${d.programs.closing}`} tone="green" />
                  <Kpi label="마감 · 상시" value={`${d.programs.closed} · ${d.programs.rolling}`} />
                  <Kpi label="사람 검수" value={d.programs.humanVerified} sub={`중복 병합 ${d.programs.duplicates}`} />
                  <Kpi label="법정의무" value={d.obligations.total} sub={`법령 확인 ${d.obligations.verified}`} />
                </div>
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <Bars title="지원 분야" items={d.programs.byField} />
                  <Bars title="출처" items={d.programs.bySource} color="bg-[#6FA48E]" />
                </div>
              </section>

              <section>
                <h2 className="text-sm font-bold text-[#111111] mb-3">공고 수집 실행 (최근 10회)</h2>
                <div className="bg-white border border-[#E4E6EA] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#F5F6F8] text-[#888888]">
                        <tr>{["시작", "출처", "수집", "적재", "파싱", "임베딩", "중복", "실패", "메모"].map((h) => <th key={h} className="text-left font-semibold px-4 py-2">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-[#F5F6F8]">
                        {d.ingest.runs.length === 0 ? <tr><td colSpan={9} className="px-4 py-4 text-[#888888]">실행 기록 없음</td></tr> : d.ingest.runs.map((r) => (
                          <tr key={r.id} className="text-[#444444]">
                            <td className="px-4 py-2 font-mono">{fmtDT(r.started_at)}</td>
                            <td className="px-4 py-2">{r.source}</td>
                            <td className="px-4 py-2 font-mono">{r.fetched}</td><td className="px-4 py-2 font-mono">{r.upserted}</td>
                            <td className="px-4 py-2 font-mono">{r.parsed}</td><td className="px-4 py-2 font-mono">{r.embedded}</td>
                            <td className="px-4 py-2 font-mono">{r.deduped}</td>
                            <td className={`px-4 py-2 font-mono ${r.failed ? "text-rose-600 font-semibold" : ""}`}>{r.failed}</td>
                            <td className="px-4 py-2 text-[#888888] truncate max-w-[220px]" title={r.notes ?? ""}>{r.notes ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-bold text-[#111111] mb-3">최근 회원 (최대 50 · 사업자번호 마스킹)</h2>
                <div className="bg-white border border-[#E4E6EA] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#F5F6F8] text-[#888888]">
                        <tr>{["아이디", "사업자번호", "가입", "마지막 로그인", "지역", "업종", "직원", "프로필"].map((h) => <th key={h} className="text-left font-semibold px-4 py-2">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-[#F5F6F8]">
                        {d.members.map((m) => (
                          <tr key={m.loginId} className="text-[#444444]">
                            <td className="px-4 py-2 font-semibold text-[#111111]">{m.loginId}</td>
                            <td className="px-4 py-2 font-mono">{m.bizNoMasked}</td>
                            <td className="px-4 py-2 font-mono">{fmtDT(m.createdAt)}</td>
                            <td className="px-4 py-2 font-mono">{fmtDT(m.lastLoginAt)}</td>
                            <td className="px-4 py-2">{m.region ?? "—"}</td><td className="px-4 py-2">{m.industry ?? "—"}</td>
                            <td className="px-4 py-2 font-mono">{m.employees ?? "—"}</td>
                            <td className="px-4 py-2">{m.hasProfile ? <span className="text-[#2A5A46] bg-[#EEF4F0] border border-[#B2D1BF] px-1.5 py-0.5 rounded-full text-[10px]">완료</span> : <span className="text-[#888888]">미완료</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <p className="text-[10px] text-[#888888]">집계 시각 {new Date(d.generatedAt).toLocaleString("ko-KR")} · 개인 프로필 원문은 표시하지 않고 분포와 마스킹된 값만 보여줍니다.</p>
            </>
          );
        })()}
      </main>
    </div>
  );
}
