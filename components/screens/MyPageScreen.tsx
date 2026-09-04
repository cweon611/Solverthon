"use client";

// design/BridgePage.tsx 1470–1683행 MyPage.
// 대표자 연령 → 생년월일 date 입력(§4.5-14) · 개업일 date, 업력은 계산(§4.5-15) · 판정 이력 useHistory()(§4.5-10)
// · 엑셀 내보내기 P0 disabled(§4.5-12) · 계정 관리 → 데이터 관리(§4.5-11). 스타일 동일.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { useSession } from "@/lib/auth/AuthProvider";
import { logoutAndClear, resetAll } from "@/lib/store/sync";
import { useSyncState } from "@/lib/store/useSync";
import { formatBizNo } from "@/lib/auth/bizNo";
import { INDUSTRIES, PHOTOS, REGIONS } from "@/lib/constants";
import { loadDemoProfiles, toStoredProfile } from "@/lib/data/demoProfiles";
import { fmtDate, toIso } from "@/lib/engine/format";
import { useCompany, useHistory, useProfile, useSettings, useToday, useVerdicts } from "@/lib/store/hooks";
import { exportAll } from "@/lib/store/storage";
import type { CompanyProfile } from "@/lib/types";

import { Img } from "@/components/ui/Img";

type ProfileDraft = Pick<
  CompanyProfile,
  "industry_code" | "region_code" | "founded_at" | "employee_count" | "ceo_birth_date"
>;

const toDraft = (p: CompanyProfile): ProfileDraft => ({
  industry_code: p.industry_code,
  region_code: p.region_code,
  founded_at: p.founded_at,
  employee_count: p.employee_count,
  ceo_birth_date: p.ceo_birth_date,
});

const inputCls =
  "w-full border border-[#E4E6EA] rounded-lg px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:border-[#6E62C2] focus:ring-1 focus:ring-[#6E62C2]/20";

function Field({ label, display, editing, children }: { label: string; display: string; editing: boolean; children?: ReactNode }) {
  return (
    <div>
      <p className="text-[#888888] text-[11px] font-medium mb-1">{label}</p>
      {editing && children ? children : <p className="text-[#111111] text-sm font-medium">{display}</p>}
    </div>
  );
}

export function MyPageScreen() {
  const router = useRouter();
  const today = useToday();
  const { profile, save } = useProfile();
  const company = useCompany();
  const grants = useVerdicts();
  const { entries: historyRows, push: pushHistory } = useHistory();
  const { settings, toggleChannel, toggleItem } = useSettings();
  const { user } = useSession();
  const sync = useSyncState();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(profile!));
  const [saved, setSaved] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const demoProfiles = useMemo(() => loadDemoProfiles(today), [today]);

  const handleSave = () => {
    if (!profile) return;
    const industry = INDUSTRIES.find((i) => i.code === draft.industry_code);
    const region = REGIONS.find((r) => r.code === draft.region_code);
    const changes: string[] = [];
    if (draft.employee_count !== profile.employee_count) changes.push(`직원 ${profile.employee_count}→${draft.employee_count}인`);
    if (draft.industry_code !== profile.industry_code) changes.push("업종 변경");
    if (draft.region_code !== profile.region_code) changes.push("지역 변경");
    if (draft.founded_at !== profile.founded_at) changes.push("개업일 변경");
    if (draft.ceo_birth_date !== profile.ceo_birth_date) changes.push("대표자 생년월일 변경");

    save({
      ...profile,
      ...draft,
      industry_label: industry?.label ?? profile.industry_label,
      region_label: region?.label ?? profile.region_label,
    });

    const pass = grants.filter((g) => g.status === "pass").length;
    const cond = grants.filter((g) => g.status === "conditional").length;
    pushHistory({
      date: fmtDate(today),
      event: "프로필 수정",
      result: `${changes.length > 0 ? changes.join(", ") + ", " : ""}재판정 완료 (대상 ${pass}건, 조건부 ${cond}건)`,
    });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const applyDemo = (id: string) => {
    const demo = demoProfiles.find((p) => p.id === id);
    if (!demo) return;
    save(toStoredProfile(demo));
    pushHistory({ date: fmtDate(today), event: "데모 프로필 전환", result: demo.name });
    setDemoOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // UTF-8 BOM을 붙여야 엑셀에서 한글이 깨지지 않는다 (§4.5-12)
  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [["date", "event", "result"], ...historyRows.map((r) => [r.date, r.event, r.result])];
    const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bridge-history-${toIso(today)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bridge-export-${toIso(today)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doReset = async () => {
    await resetAll(); // 서버 원본과 이 기기 사본을 모두 비운다. 계정은 남는다
    router.replace("/onboarding/chat");
  };

  const notifItems: { key: keyof typeof settings.items; label: string; desc: string }[] = [
    { key: "expiring", label: "곧 사라짐 알림", desc: "자격 만료 90일·30일·7일 전 발송" },
    { key: "deadline", label: "공고 마감 임박 알림", desc: "마감 7일 전 대상 공고 알림" },
    { key: "newGrant", label: "신규 공고 알림", desc: "새 지원사업 공고 등록 시 발송 (제공 예정)" },
    { key: "task", label: "법정 의무 알림", desc: "신고·납부 기한 3일 전 발송" },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* 헤더 — 3D cutout 스타일 */}
      <div className="relative rounded-3xl overflow-hidden h-36">
        <Img src={PHOTOS.laptopSunlight} alt="자연광 작업 공간" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent" />
        <div className="absolute inset-0 p-6 flex flex-col justify-center">
          <h1 className="text-2xl font-display font-bold text-[#111111]">마이페이지</h1>
          <p className="text-[#444444] text-sm mt-1">기업 프로필·알림 설정·판정 이력을 관리합니다.</p>
        </div>
      </div>

      {/* ── 기업 프로필 ── */}
      <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E6EA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#E4E6EA]">
              <Img src={PHOTOS.personCutout} alt="대표자" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[#111111] font-semibold text-sm">{company.name}</p>
              <p className="text-[#888888] text-xs font-mono">{company.bizNo}</p>
            </div>
          </div>
          {!editing ? (
            <div className="flex gap-2">
              <Link href="/onboarding?edit=1"
                className="text-xs font-semibold text-[#444444] bg-[#F5F6F8] border border-[#E4E6EA] px-3 py-1.5 rounded-xl hover:bg-[#E4E6EA] transition-colors cursor-pointer">
                상세 수정
              </Link>
              <button
                onClick={() => { setDraft(toDraft(profile!)); setEditing(true); }}
                className="text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#dddaf4] transition-colors cursor-pointer"
              >
                수정
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-xs font-semibold text-[#888888] bg-[#F5F6F8] border border-[#E4E6EA] px-3 py-1.5 rounded-xl hover:bg-[#E4E6EA] transition-colors cursor-pointer">취소</button>
              <button onClick={handleSave} className="text-xs font-semibold text-white bg-[#6E62C2] px-3 py-1.5 rounded-xl hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25">저장</button>
            </div>
          )}
        </div>

        {saved && (
          <div className="mx-5 mt-4 bg-[#EEF4F0] border border-[#B2D1BF] rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-[#3D7260] text-sm">✓</span>
            <p className="text-[#2A5A46] text-xs font-semibold">저장됐습니다. 변경된 항목으로 재판정을 실행합니다.</p>
          </div>
        )}

        <div className="px-5 py-4 grid grid-cols-2 gap-4">
          <Field label="업종" display={company.sector} editing={editing}>
            <select value={draft.industry_code} onChange={(e) => setDraft((d) => ({ ...d, industry_code: e.target.value }))} className={inputCls}>
              {INDUSTRIES.map((i) => <option key={i.code} value={i.code}>{i.label}</option>)}
            </select>
          </Field>
          <Field label="지역" display={company.region} editing={editing}>
            <select value={draft.region_code} onChange={(e) => setDraft((d) => ({ ...d, region_code: e.target.value }))} className={inputCls}>
              {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="개업일" display={company.foundedDate} editing={editing}>
            <input type="date" max={toIso(today)} value={draft.founded_at} onChange={(e) => setDraft((d) => ({ ...d, founded_at: e.target.value }))} className={inputCls} />
          </Field>
          {/* 사업자번호는 디자인대로 읽기 전용 */}
          <Field label="사업자번호" display={company.bizNo} editing={false} />
          <Field label="상시근로자 수" display={`${company.employees}인`} editing={editing}>
            <input type="number" min={0} max={999} value={draft.employee_count}
              onChange={(e) => setDraft((d) => ({ ...d, employee_count: Math.max(0, Number(e.target.value)) }))} className={inputCls} />
          </Field>
          {/* 저장 필드는 ceo_birth_date, 표시는 만 나이 (§4.5-14) */}
          <Field label="대표자 연령" display={company.ceoAge === null ? "미입력" : `만 ${company.ceoAge}세`} editing={editing}>
            <input type="date" max={toIso(today)} value={draft.ceo_birth_date ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, ceo_birth_date: e.target.value || null }))} className={inputCls} />
          </Field>
          {profile?.business_direction && (
            <div className="col-span-2">
              <Field label="사업 방향 (AI 대화에서 정리)" display={profile.business_direction} editing={false} />
            </div>
          )}
        </div>

        {editing && (
          <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <p className="text-amber-700 text-xs">직원 수·업종·지역이 바뀌면 저장 후 자동으로 재판정이 실행됩니다.</p>
          </div>
        )}
      </div>

      {/* ── 알림 설정 ── */}
      <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-[#E4E6EA]">
          <h2 className="text-[#111111] font-semibold text-sm">알림 설정</h2>
          <p className="text-[11px] text-[#888888] mt-1">현재 버전은 대시보드 배너로 알립니다. 이메일·푸시 발송은 제공 예정입니다.</p>
        </div>

        {/* 채널 */}
        <div className="px-5 py-4 border-b border-[#F5F6F8]">
          <p className="text-[#888888] text-[11px] font-medium mb-3">수신 채널</p>
          <div className="flex gap-3">
            {(["email", "push"] as const).map((ch) => (
              <button key={ch} onClick={() => toggleChannel(ch)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${settings.channels[ch] ? "bg-[#6E62C2] text-white border-[#6E62C2] shadow-md shadow-[#6E62C2]/20" : "bg-[#F5F6F8] text-[#888888] border-[#E4E6EA] hover:border-[#6E62C2]/30"}`}>
                <span>{ch === "email" ? "✉" : "🔔"}</span>
                {ch === "email" ? "이메일" : "앱 푸시"}
              </button>
            ))}
          </div>
        </div>

        {/* 항목별 토글 */}
        <div className="px-5 py-2 divide-y divide-[#F5F6F8]">
          {notifItems.map((item) => (
            <div key={item.key} className="flex items-center gap-4 py-3">
              <div className="flex-1">
                <p className="text-[#111111] text-sm font-medium">{item.label}</p>
                <p className="text-[#888888] text-xs mt-0.5">{item.desc}</p>
              </div>
              <button onClick={() => toggleItem(item.key)}
                className={`w-10 h-6 rounded-full transition-all cursor-pointer relative shrink-0 ${settings.items[item.key] ? "bg-[#6E62C2]" : "bg-[#D0D3DA]"}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.items[item.key] ? "left-5" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── 판정 이력 ── */}
      <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-[#E4E6EA] flex items-center justify-between">
          <h2 className="text-[#111111] font-semibold text-sm">판정 이력</h2>
          <button onClick={exportCsv} disabled={historyRows.length === 0}
            className="text-xs font-semibold text-[#6E62C2] bg-[#f0eef9] border border-[#dddaf4] px-3 py-1.5 rounded-xl hover:bg-[#dddaf4] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">엑셀 내보내기</button>
        </div>
        <div className="divide-y divide-[#F5F6F8]">
          {historyRows.length === 0 && (
            <p className="px-5 py-6 text-center text-[#888888] text-xs">아직 이력이 없습니다.</p>
          )}
          {historyRows.map((row, i) => (
            <div key={`${row.date}-${i}`} className="flex items-center gap-4 px-5 py-3.5">
              <span className="text-[#888888] text-xs font-mono shrink-0 w-20">{row.date}</span>
              <div className="flex-1">
                <p className="text-[#111111] text-sm font-medium">{row.event}</p>
                <p className="text-[#888888] text-xs mt-0.5">{row.result}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 데이터 관리 (§4.5-11) ── */}
      <div className="bg-white border border-[#E4E6EA] rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-[#E4E6EA]">
          <h2 className="text-[#111111] font-semibold text-sm">데이터 관리</h2>
        </div>
        <div className="px-5 py-3 space-y-1">
          <div className="relative">
            <button onClick={() => setDemoOpen((v) => !v)}
              className="w-full text-left text-sm px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[#444444] hover:bg-[#F5F6F8]">
              데모 프로필 전환
            </button>
            {demoOpen && (
              <div className="mt-1 border border-[#E4E6EA] rounded-2xl overflow-hidden">
                {demoProfiles.map((p) => (
                  <button key={p.id} onClick={() => applyDemo(p.id)}
                    className="w-full text-left px-4 py-3 hover:bg-[#F5F6F8] transition-colors cursor-pointer border-b border-[#F5F6F8] last:border-0">
                    <p className="text-[#111111] text-xs font-semibold">{p.demo_label}</p>
                    <p className="text-[#888888] text-[10px] mt-0.5">{p.name} · {p.region_label} · 직원 {p.employee_count}인</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {user && (
            <div className="px-3 py-2.5 text-sm text-[#444444] flex items-center gap-2 flex-wrap">
              <span className="text-[#888888] text-xs">로그인 계정</span>
              <span className="font-semibold text-[#111111]">{user.loginId}</span>
              <span className="text-[#888888] text-xs font-mono">{formatBizNo(user.bizNo)}</span>
            </div>
          )}
          {user && (
            <p className="px-3 text-[10px] text-[#888888]">
              {sync.pushing ? "서버에 저장 중…" : sync.error ? `저장 오류: ${sync.error}` : sync.lastSyncedAt ? `서버 저장 ${new Date(sync.lastSyncedAt).toLocaleString("ko-KR")}` : "서버 저장 기록 없음"}
            </p>
          )}
          <button onClick={async () => { await logoutAndClear(); router.replace("/login"); }}
            className="w-full text-left text-sm px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[#444444] hover:bg-[#F5F6F8]">
            로그아웃 <span className="text-[#888888] text-xs">— 회사 정보는 계정에 저장되어 있습니다</span>
          </button>

          <button onClick={exportJson}
            className="w-full text-left text-sm px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-[#444444] hover:bg-[#F5F6F8]">
            내 데이터 내보내기 (JSON)
          </button>

          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)}
              className="w-full text-left text-sm px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-rose-600 hover:bg-rose-50">
              프로필 초기화
            </button>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 space-y-2">
              <p className="text-rose-700 text-xs font-semibold">계정에 저장된 프로필·할 일·설정·이력·초안이 모두 삭제됩니다. 계정은 남습니다.</p>
              <div className="flex gap-2">
                <button onClick={doReset} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer">삭제하고 처음부터</button>
                <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 rounded-lg bg-white border border-[#E4E6EA] text-[#444444] text-xs font-semibold hover:bg-[#F5F6F8] cursor-pointer">취소</button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
