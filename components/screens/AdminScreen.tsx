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
import { cn } from "@/lib/utils";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { skeletonCardClass, statTileVariants } from "@/components/ui/variants";

const fmtDT = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

function Kpi({ label, value, sub, tone = "default" }: { label: string; value: string | number; sub?: string; tone?: "default" | "purple" | "green" }) {
  return (
    <div className={statTileVariants({ tone })}>
      <p className="text-[10px] text-[#888888] font-medium">{label}</p>
      <p className="text-2xl font-bold font-mono text-[#111111] mt-1 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-[#888888] mt-1.5">{sub}</p>}
    </div>
  );
}

function Bars({ title, items, color = "bg-[#6E62C2]" }: { title: string; items: Bucket[]; color?: string }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <Card pad="p5" shadow="none">
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
    </Card>
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
          <Button onClick={() => void loadStats()} disabled={stats.status === "loading"}
            variant="soft" pad="3x1.5" text="xs" radius="xl" motion="colors" off="o50only">
            {stats.status === "loading" ? "불러오는 중…" : "새로 고침"}
          </Button>
          {/* 이 <Link>는 cursor-pointer가 없다(a 기본값에 의존) → button()을 쓰면 클래스가 늘어난다. 인라인 유지. */}
          <Link href="/dashboard" className="text-xs font-semibold text-[#444444] border border-[#E4E6EA] px-3 py-1.5 rounded-xl hover:bg-[#F5F6F8]">앱으로</Link>
          <Button onClick={async () => { await logoutAndClear(); router.replace("/login"); }}
            variant="outline" pad="3x1.5" text="xs" radius="xl">로그아웃</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {denied && (
          <Alert radius="2xl" pad="p6">
            <p className="text-rose-700 text-sm font-semibold">관리자만 볼 수 있는 화면입니다.</p>
            <p className="text-rose-600 text-xs mt-1">현재 계정: {user?.loginId}. 관리자 계정으로 다시 로그인하세요.</p>
          </Alert>
        )}
        {!denied && stats.status === "error" && (
          <Alert radius="2xl" pad="p6"><p className="text-rose-700 text-sm">{stats.error}</p></Alert>
        )}
        {!denied && stats.status !== "error" && !stats.data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className={cn(skeletonCardClass, "h-24")} />)}</div>
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
                <Card pad="p5" shadow="none" className="mt-3">
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
                </Card>
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
                <Card shadow="none" clip>
                  <Table>
                    <TableHeader>
                      <TableRow tone="none">{["시작", "출처", "수집", "적재", "파싱", "임베딩", "중복", "실패", "메모"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.ingest.runs.length === 0 ? <TableRow tone="none"><TableCell colSpan={9} className="px-4 py-4 text-[#888888]">실행 기록 없음</TableCell></TableRow> : d.ingest.runs.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono">{fmtDT(r.started_at)}</TableCell>
                          <TableCell>{r.source}</TableCell>
                          <TableCell className="font-mono">{r.fetched}</TableCell><TableCell className="font-mono">{r.upserted}</TableCell>
                          <TableCell className="font-mono">{r.parsed}</TableCell><TableCell className="font-mono">{r.embedded}</TableCell>
                          <TableCell className="font-mono">{r.deduped}</TableCell>
                          <TableCell className={`font-mono ${r.failed ? "text-rose-600 font-semibold" : ""}`}>{r.failed}</TableCell>
                          <TableCell className="text-[#888888] truncate max-w-[220px]" title={r.notes ?? ""}>{r.notes ?? ""}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </section>

              <section>
                <h2 className="text-sm font-bold text-[#111111] mb-3">최근 회원 (최대 50 · 사업자번호 마스킹)</h2>
                <Card shadow="none" clip>
                  <Table>
                    <TableHeader>
                      <TableRow tone="none">{["아이디", "사업자번호", "가입", "마지막 로그인", "지역", "업종", "직원", "프로필"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.members.map((m) => (
                        <TableRow key={m.loginId}>
                          <TableCell className="font-semibold text-[#111111]">{m.loginId}</TableCell>
                          <TableCell className="font-mono">{m.bizNoMasked}</TableCell>
                          <TableCell className="font-mono">{fmtDT(m.createdAt)}</TableCell>
                          <TableCell className="font-mono">{fmtDT(m.lastLoginAt)}</TableCell>
                          <TableCell>{m.region ?? "—"}</TableCell><TableCell>{m.industry ?? "—"}</TableCell>
                          <TableCell className="font-mono">{m.employees ?? "—"}</TableCell>
                          <TableCell>{m.hasProfile ? <Badge size="sm" weight="none" tone="success">완료</Badge> : <span className="text-[#888888]">미완료</span>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </section>

              <p className="text-[10px] text-[#888888]">집계 시각 {new Date(d.generatedAt).toLocaleString("ko-KR")} · 개인 프로필 원문은 표시하지 않고 분포와 마스킹된 값만 보여줍니다.</p>
            </>
          );
        })()}
      </main>
    </div>
  );
}
