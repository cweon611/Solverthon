"use client";

// 대화형 온보딩 — LLM이 질문하고 창업가가 답하면 회사 정보와 사업 방향을 정리한다.
// 만들어진 프로필은 계정(app_profiles)에 저장된다. 대화 자체는 AI 응답 생성을 위해 서버를 거치지만 저장·기록하지 않는다.
// 추출값은 코드가 검증한다(코드표·날짜·범위). 자격 판정은 여기서 하지 않는다 (§0.1-1).

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { ChatTurn } from "@/lib/ai/gemini";
import { useSession } from "@/lib/auth/AuthProvider";
import { formatBizNo } from "@/lib/auth/bizNo";
import { EMPTY_EXTRACT, extractToProfile, mergeExtract, missingRequired, type InterviewExtract } from "@/lib/ai/interviewCoerce";
import { CERT_LABEL, INDUSTRIES, REGIONS } from "@/lib/constants";
import { fmtDate, fromIso, isoToDot } from "@/lib/engine/format";
import { useHistory, useProfile, useToday } from "@/lib/store/hooks";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, cardTitleClass } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function fieldRows(ex: InterviewExtract): { label: string; value: string | null; required: boolean }[] {
  const industry = INDUSTRIES.find((i) => i.code === ex.industry_code)?.label ?? null;
  const region = REGIONS.find((r) => r.code === ex.region_code)?.label ?? null;
  return [
    { label: "사업자 형태", value: ex.business_type === null ? null : ex.business_type === "corporation" ? "법인사업자" : "개인사업자", required: true },
    { label: "업종", value: industry, required: true },
    { label: "지역", value: region, required: true },
    { label: "개업일", value: ex.founded_at ? isoToDot(ex.founded_at) : null, required: true },
    { label: "상시근로자", value: ex.employee_count === null ? null : `${ex.employee_count}인`, required: true },
    { label: "회사명", value: ex.name, required: false },
    { label: "대표자 생년월일", value: ex.ceo_birth_date ? isoToDot(ex.ceo_birth_date) : null, required: false },
    { label: "대표자 성별", value: ex.ceo_gender === null ? null : ex.ceo_gender === "female" ? "여성" : "남성", required: false },
    { label: "연매출", value: ex.annual_revenue_krw === null ? null : `${(ex.annual_revenue_krw / 100_000_000).toLocaleString("ko-KR")}억원`, required: false },
    { label: "채용 예정", value: ex.hiring_planned === null ? null : ex.hiring_planned ? "예" : "아니오", required: false },
    { label: "온라인 판매", value: ex.has_online_sales === null ? null : ex.has_online_sales ? "예" : "아니오", required: false },
    { label: "개인정보 처리", value: ex.handles_personal_data === null ? null : ex.handles_personal_data ? "예" : "아니오", required: false },
    { label: "식품 취급", value: ex.is_food_business === null ? null : ex.is_food_business ? "예" : "아니오", required: false },
    { label: "보유 인증", value: ex.certifications.length ? ex.certifications.map((c) => CERT_LABEL[c]).join(", ") : null, required: false },
  ];
}

export function InterviewScreen() {
  const router = useRouter();
  const today = useToday();
  const { save } = useProfile();
  const { push } = useHistory();
  const { status, user } = useSession();

  // 회원가입(계정) 뒤에만 들어올 수 있다
  useEffect(() => {
    if (status === "anon" || status === "unavailable") router.replace("/login");
  }, [status, router]);

  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<InterviewExtract>(EMPTY_EXTRACT);
  const [done, setDone] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const doneToasted = useRef(false); // 대화 종료 알림은 한 번만

  const missing = missingRequired(extracted);
  const canFinish = missing.length === 0;

  const scrollDown = () => requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; });

  const ask = async (history: ChatTurn[]) => {
    setLoading(true); setError(null);
    // 첫 질문만 몇 초 더 걸린다 — 이 턴에만 진행 중 토스트를 붙인다(매 턴이면 시끄럽다)
    const tid = history.length === 0 ? toast.loading("비즈버디가 첫 질문을 준비하는 중…") : null;
    try {
      const res = await fetch("/api/ai/interview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? `요청 실패 (${res.status})`);
      setMessages([...history, { role: "model", text: body.reply as string }]);
      setExtracted((prev) => mergeExtract(prev, body.extracted as InterviewExtract));
      if (body.done) setDone(true);
      scrollDown();
      if (tid !== null) {
        toast.success("대화를 시작했습니다", { id: tid, description: "질문에 편하게 답해 주세요. 모르는 건 모른다고 하셔도 됩니다." });
      }
      // 대화가 끝났다는 신호는 오른쪽 패널 한 줄뿐이라 놓치기 쉽다
      if (body.done && !doneToasted.current) {
        doneToasted.current = true;
        const left = missingRequired(mergeExtract(extracted, body.extracted as InterviewExtract));
        if (left.length === 0) {
          toast.success("필수 정보 5가지를 모두 확인했습니다", {
            description: "오른쪽 아래 “이 정보로 판정 시작”을 누르면 계정에 저장됩니다.",
          });
        } else {
          toast.warning("대화는 끝났지만 빠진 항목이 있습니다", { description: `아직 필요: ${left.join(", ")}` });
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(message);
      if (tid !== null) toast.dismiss(tid);
      toast.error("비즈버디가 답하지 못했습니다", {
        description: message,
        action: { label: "다시 시도", onClick: () => void ask(history) },
      });
    } finally {
      setLoading(false);
    }
  };

  const start = () => { setStarted(true); void ask([]); };

  const send = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, text }];
    setMessages(next);
    scrollDown();
    void ask(next);
  };

  const finish = (thenEdit: boolean) => {
    const profile = extractToProfile(extracted);
    if (!profile) {
      // 예전에는 버튼을 눌러도 아무 일도 일어나지 않았다
      toast.error("아직 저장할 수 없습니다", {
        description: missing.length ? `필수 항목이 비어 있습니다: ${missing.join(", ")}` : "필수 항목을 다시 확인해 주세요.",
      });
      return;
    }
    const answers = messages.filter((m) => m.role === "user").length;
    // 사업자번호는 가입 때 받은 계정 값을 쓴다
    save({ ...profile, biz_no: user ? formatBizNo(user.bizNo) : null });
    push({ date: fmtDate(today), event: "AI 대화로 회원가입", result: `${profile.name} · ${answers}개 답변` });
    // 토스터는 최상위에 있어 화면을 옮겨도 이 알림이 남는다
    toast.success(`${profile.name} 정보를 계정에 저장했습니다`, {
      description: `답변 ${answers}개로 정리 · ${thenEdit ? "세부 정보 수정 화면으로 이동합니다" : "판정 화면으로 이동합니다"}`,
    });
    router.replace(thenEdit ? "/onboarding?edit=1" : "/dashboard");
  };

  const rows = fieldRows(extracted);
  const founded = extracted.founded_at ? fromIso(extracted.founded_at) : null;

  return (
    <div className="min-h-full bg-[#F5F6F8] flex items-center justify-center p-6">
      <Card radius="3xl" clip className="w-full max-w-4xl grid md:grid-cols-[1fr_300px]">

        {/* 왼쪽: 대화 */}
        <div className="flex flex-col min-h-[560px] max-h-[80vh]">
          <CardHeader size="chat" className="flex items-center gap-2.5">
            <Image src="/brand/mark.png" alt="비즈버디" width={36} height={36} className="w-9 h-9 rounded-xl" />
            <div className="flex-1">
              <p className="text-[#111111] font-display font-bold text-base leading-tight">회원가입 — 비즈버디와 대화하기</p>
              <p className="text-[10px] text-[#888888]">{user ? `${user.loginId} · ${formatBizNo(user.bizNo)} · ` : ""}질문에 편하게 답해 주세요. 모르는 건 &quot;모른다&quot;고 하셔도 됩니다.</p>
            </div>
            <Link href="/login" className="text-[11px] font-semibold text-[#888888] hover:text-[#6E62C2] transition-colors">
              ← 로그인으로
            </Link>
          </CardHeader>

          <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {!started && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-10">
                <div className="space-y-1.5">
                  <p className={cardTitleClass}>5분이면 됩니다</p>
                  <p className="text-[#888888] text-xs leading-relaxed max-w-sm">
                    사업자 형태·업종·지역·개업일·직원 수 다섯 가지를 묻고, 마지막에 앞으로의 사업 방향을 여쭙습니다.<br />
                    정리된 회사 정보는 계정에 저장되어 다른 기기에서도 복원됩니다. 대화 내용 자체는 저장하지 않습니다.
                  </p>
                </div>
                <Button onClick={start} variant="primary" pad="5x2.5" text="sm" radius="xl" elevate="brand" motion="colors">
                  ✦ 대화 시작
                </Button>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-[#6E62C2] text-white rounded-br-md" : "bg-[#F5F6F8] text-[#111111] rounded-bl-md"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#F5F6F8] rounded-2xl rounded-bl-md px-4 py-2.5 text-xs text-[#888888]">입력 중…</div>
              </div>
            )}
            {error && (
              <Alert className="flex items-center justify-between gap-3">
                <p className="text-rose-700 text-xs">{error}</p>
                <Button onClick={() => void ask(messages)} variant="linkDanger" text="xs">다시 시도</Button>
              </Alert>
            )}
          </div>

          <div className="px-6 py-4 border-t border-[#E4E6EA]">
            <div className="flex gap-2">
              <Input
                variant="chatLg"
                placeholder={started ? "답변을 입력하고 Enter" : "먼저 대화를 시작해 주세요"}
                value={input}
                disabled={!started || loading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) send(); }}
              />
              <Button onClick={send} disabled={!started || loading || !input.trim()}
                variant="primary" pad="4x2.5" text="sm" radius="xl" motion="colors" off="o40">
                보내기
              </Button>
            </div>
            <p className="text-[10px] text-[#888888] mt-2">
              AI는 질문만 합니다. 자격 판정·지원금 계산은 이 서비스의 코드가 합니다. ·{" "}
              <Link href="/about" className="hover:text-[#6E62C2] hover:underline">데이터 출처·면책</Link>
            </p>
          </div>
        </div>

        {/* 오른쪽: 채워지는 프로필 */}
        <aside className="border-t md:border-t-0 md:border-l border-[#E4E6EA] bg-[#FAFAFB] flex flex-col">
          <div className="px-5 pt-5 pb-3">
            <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wide">지금까지 파악한 정보</p>
            <p className="text-[10px] text-[#888888] mt-1">* 표시는 판정에 꼭 필요한 항목</p>
          </div>
          <div className="flex-1 overflow-y-auto px-5 space-y-2">
            {rows.map((r) => (
              <div key={r.label} className={`rounded-xl px-3 py-2 border ${r.value ? "bg-white border-[#E4E6EA]" : r.required ? "bg-amber-50/60 border-amber-200 border-dashed" : "bg-transparent border-[#E4E6EA] border-dashed"}`}>
                <p className="text-[10px] text-[#888888]">{r.label}{r.required && <span className="text-amber-600"> *</span>}</p>
                <p className={`text-xs font-medium ${r.value ? "text-[#111111]" : "text-[#888888]"}`}>{r.value ?? "—"}</p>
              </div>
            ))}
            {founded && (
              <p className="text-[10px] text-[#6E62C2] font-semibold px-1">업력 약 {Math.floor(((today.getTime() - founded.getTime()) / 86_400_000) / 365.25 * 12 / 12)}년</p>
            )}
            <div className="rounded-xl px-3 py-2 border bg-white border-[#E4E6EA]">
              <p className="text-[10px] text-[#888888]">사업 방향</p>
              <p className={`text-xs leading-relaxed ${extracted.business_direction ? "text-[#111111]" : "text-[#888888]"}`}>{extracted.business_direction ?? "—"}</p>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-[#E4E6EA] space-y-2">
            {!canFinish && started && (
              <p className="text-[10px] text-amber-700">아직 필요: {missing.join(", ")}</p>
            )}
            {done && canFinish && (
              <p className="text-[10px] text-[#2A5A46] font-semibold">필수 정보가 모두 채워졌습니다.</p>
            )}
            <Button onClick={() => finish(false)} disabled={!canFinish}
              variant="primary" pad="4x2.5" text="sm" radius="xl" elevate="brand" motion="colors" block off="o40flat">
              이 정보로 판정 시작
            </Button>
            <Button onClick={() => finish(true)} disabled={!canFinish}
              variant="outline" pad="4x2" text="xs" radius="xl" block off="o40">
              저장 후 세부 정보 직접 수정
            </Button>
          </div>
        </aside>
      </Card>
    </div>
  );
}
