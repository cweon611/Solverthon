"use client";

// design/BizBuddyPage.tsx 1470–1683행 MyPage.
// 대표자 연령 → 생년월일 date 입력(§4.5-14) · 개업일 date, 업력은 계산(§4.5-15) · 판정 이력 useHistory()(§4.5-10)
// · 엑셀 내보내기 P0 disabled(§4.5-12) · 계정 관리 → 데이터 관리(§4.5-11). 스타일 동일.

import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

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
import { cn } from "@/lib/utils";

import { Alert } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, cardTitleClass } from "@/components/ui/card";
import { selectField } from "@/components/ui/field-variants";
import { Img } from "@/components/ui/Img";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

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
    a.download = `bizbuddy-history-${toIso(today)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bizbuddy-export-${toIso(today)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 확인 대화상자를 통과한 뒤에만 불린다. 결과를 화면 밖으로 보내 버리므로(라우트 이동)
  // 무슨 일이 일어났는지는 토스트로만 남는다 — Toaster는 루트 레이아웃에 있어 이동 후에도 살아 있다.
  const doReset = async () => {
    try {
      await resetAll(); // 서버 원본과 이 기기 사본을 모두 비운다. 계정은 남는다
      toast.success("프로필을 초기화했습니다.", { description: "처음 화면부터 다시 시작합니다." });
      router.replace("/onboarding");
    } catch {
      toast.error("초기화하지 못했습니다.", { description: "잠시 후 다시 시도해 주세요." });
    }
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
      <Card clip>
        <CardHeader layout="between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#E4E6EA]">
              <Img src={PHOTOS.personCutout} alt="대표자" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className={cardTitleClass}>{company.name}</p>
              <p className="text-[#888888] text-xs font-mono">{company.bizNo}</p>
            </div>
          </div>
          {!editing ? (
            <div className="flex gap-2">
              {/* <Link>라 asChild 없이 button()으로 className만 만든다 */}
              <Link href="/onboarding?edit=1"
                className={cn(button({ variant: "muted", pad: "3x1.5", text: "xs", radius: "xl", motion: "colors" }), "text-[#444444]")}>
                상세 수정
              </Link>
              <Button
                variant="soft" pad="3x1.5" text="xs" radius="xl" motion="colors"
                onClick={() => { setDraft(toDraft(profile!)); setEditing(true); }}
              >
                수정
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="muted" pad="3x1.5" text="xs" radius="xl" motion="colors" onClick={() => setEditing(false)}>취소</Button>
              <Button variant="primary" pad="3x1.5" text="xs" radius="xl" elevate="brand" motion="colors" onClick={handleSave}>저장</Button>
            </div>
          )}
        </CardHeader>

        {saved && (
          <Alert tone="success" pad="sm" className="mx-5 mt-4 flex items-center gap-2">
            <span className="text-[#3D7260] text-sm">✓</span>
            <p className="text-[#2A5A46] text-xs font-semibold">저장됐습니다. 변경된 항목으로 재판정을 실행합니다.</p>
          </Alert>
        )}

        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="업종" display={company.sector} editing={editing}>
            {/* select인데 input 문자열을 입은 두 곳 — selectField.asInput */}
            <select value={draft.industry_code} onChange={(e) => setDraft((d) => ({ ...d, industry_code: e.target.value }))} className={selectField({ variant: "asInput" })}>
              {INDUSTRIES.map((i) => <option key={i.code} value={i.code}>{i.label}</option>)}
            </select>
          </Field>
          <Field label="지역" display={company.region} editing={editing}>
            <select value={draft.region_code} onChange={(e) => setDraft((d) => ({ ...d, region_code: e.target.value }))} className={selectField({ variant: "asInput" })}>
              {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="개업일" display={company.foundedDate} editing={editing}>
            <Input variant="fieldSm" type="date" max={toIso(today)} value={draft.founded_at} onChange={(e) => setDraft((d) => ({ ...d, founded_at: e.target.value }))} />
          </Field>
          {/* 사업자번호는 디자인대로 읽기 전용 */}
          <Field label="사업자번호" display={company.bizNo} editing={false} />
          <Field label="상시근로자 수" display={`${company.employees}인`} editing={editing}>
            <Input variant="fieldSm" type="number" min={0} max={999} value={draft.employee_count}
              onChange={(e) => setDraft((d) => ({ ...d, employee_count: Math.max(0, Number(e.target.value)) }))} />
          </Field>
          {/* 저장 필드는 ceo_birth_date, 표시는 만 나이 (§4.5-14) */}
          <Field label="대표자 연령" display={company.ceoAge === null ? "미입력" : `만 ${company.ceoAge}세`} editing={editing}>
            <Input variant="fieldSm" type="date" max={toIso(today)} value={draft.ceo_birth_date ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, ceo_birth_date: e.target.value || null }))} />
          </Field>
          {profile?.business_direction && (
            <div className="col-span-2">
              <Field label="사업 방향 (설문에서 입력)" display={profile.business_direction} editing={false} />
            </div>
          )}
        </CardContent>

        {editing && (
          <Alert tone="warning" pad="sm" className="mx-5 mb-4">
            <p className="text-amber-700 text-xs">직원 수·업종·지역이 바뀌면 저장 후 자동으로 재판정이 실행됩니다.</p>
          </Alert>
        )}
      </Card>

      {/* ── 알림 설정 ── */}
      <Card>
        <CardHeader>
          <h2 className={cardTitleClass}>알림 설정</h2>
          <p className="text-[11px] text-[#888888] mt-1">현재 버전은 대시보드 배너로 알립니다. 이메일·푸시 발송은 제공 예정입니다.</p>
        </CardHeader>

        {/* 채널 — 아래 테두리 색이 카드 헤더 표와 달라 인라인 유지 */}
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

        {/* 항목별 토글 — 위아래 여백이 본문 표에 없는 값이라 인라인 유지.
            손수 만든 <button> 알약을 <Switch>로 교체했다. 그림은 그대로고(같은 문자열),
            스페이스바·화살표 조작과 role=switch·aria-checked가 새로 생긴다.
            제목·설명 문단에 id를 붙여 스위치의 이름과 설명으로 연결한다 — 눈에 보이는 글자가
            이미 라벨 노릇을 하고 있어 화면에 없는 문구를 새로 지어내지 않는다. */}
        <div className="px-5 py-2 divide-y divide-[#F5F6F8]">
          {notifItems.map((item) => (
            <div key={item.key} className="flex items-center gap-4 py-3">
              <div className="flex-1">
                <p id={`notif-${item.key}`} className="text-[#111111] text-sm font-medium">{item.label}</p>
                <p id={`notif-${item.key}-desc`} className="text-[#888888] text-xs mt-0.5">{item.desc}</p>
              </div>
              <Switch
                checked={settings.items[item.key]}
                onCheckedChange={() => toggleItem(item.key)}
                aria-labelledby={`notif-${item.key}`}
                aria-describedby={`notif-${item.key}-desc`}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* ── 판정 이력 ── */}
      <Card>
        <CardHeader layout="between">
          <h2 className={cardTitleClass}>판정 이력</h2>
          <Button variant="soft" pad="3x1.5" text="xs" radius="xl" motion="colors" off="o50"
            onClick={exportCsv} disabled={historyRows.length === 0}>엑셀 내보내기</Button>
        </CardHeader>
        <CardContent size="none" list>
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
        </CardContent>
      </Card>

      {/* ── 데이터 관리 (§4.5-11) ── */}
      <Card>
        <CardHeader>
          <h2 className={cardTitleClass}>데이터 관리</h2>
        </CardHeader>
        <CardContent size="tight" className="space-y-1">
          <div className="relative">
            <Button variant="ghostRow" pad="3x2.5" text="sm" radius="xl" block motion="colors"
              onClick={() => setDemoOpen((v) => !v)}>
              데모 프로필 전환
            </Button>
            {demoOpen && (
              /* 흰 배경이 없어 카드 셸 표와 어긋난다 — 인라인 유지 */
              <div className="mt-1 border border-[#E4E6EA] rounded-2xl overflow-hidden">
                {demoProfiles.map((p) => (
                  <Button key={p.id} variant="menuItem" pad="4x3" block motion="colors" onClick={() => applyDemo(p.id)}>
                    <p className="text-[#111111] text-xs font-semibold">{p.demo_label}</p>
                    <p className="text-[#888888] text-[10px] mt-0.5">{p.name} · {p.region_label} · 직원 {p.employee_count}인</p>
                  </Button>
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
          <Button variant="ghostRow" pad="3x2.5" text="sm" radius="xl" block motion="colors"
            onClick={async () => { await logoutAndClear(); router.replace("/login"); }}>
            로그아웃 <span className="text-[#888888] text-xs">— 회사 정보는 계정에 저장되어 있습니다</span>
          </Button>

          <Button variant="ghostRow" pad="3x2.5" text="sm" radius="xl" block motion="colors" onClick={exportJson}>
            내 데이터 내보내기 (JSON)
          </Button>

          {/* 되돌릴 수 없는 조작이라 카드 안에서 펼쳐지던 확인 띠를 모달 확인 대화상자로 바꿨다.
              바깥 클릭·ESC로 닫히지 않고, DOM 순서상 첫 초점이 [취소]라 실수로 엔터를 눌러도 안전하다. */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghostRowDanger" pad="3x2.5" text="sm" radius="xl" block motion="colors">
                프로필 초기화
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia className="border-rose-200 bg-rose-50 text-rose-600">
                  <TriangleAlertIcon />
                </AlertDialogMedia>
                <AlertDialogTitle>프로필을 초기화할까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  계정에 저장된 프로필·할 일·설정·판정 이력·초안이 모두 삭제됩니다. 되돌릴 수 없습니다.
                  {user ? <> 로그인 계정 <span className="font-semibold text-ink">{user.loginId}</span>은(는) 남고, </> : " 계정은 남고, "}
                  초기화 후 처음 화면부터 다시 시작합니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={doReset}>삭제하고 처음부터</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

    </div>
  );
}
