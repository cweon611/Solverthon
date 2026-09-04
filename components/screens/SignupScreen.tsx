"use client";

// 회원가입 — 아이디·비밀번호·사업자번호만 받는다. 회사 정보는 다음 단계에서 AI와 대화해 만든다 (폼 없음).

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useSession } from "@/lib/auth/AuthProvider";
import { bizNoChecksumOk, normalizeBizNo } from "@/lib/auth/bizNo";

const INPUT = "w-full border border-[#E4E6EA] rounded-xl px-4 py-2.5 text-sm text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#6E62C2] focus:ring-2 focus:ring-[#6E62C2]/10 disabled:bg-[#F5F6F8]";
const LABEL = "text-[11px] font-semibold text-[#444444] mb-1 block";

export function SignupScreen() {
  const router = useRouter();
  const { status, unavailableMessage, refresh } = useSession();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [bizNo, setBizNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = normalizeBizNo(bizNo);
  const bizWarn = digits !== null && !bizNoChecksumOk(digits);
  const idOk = /^[a-z0-9_.-]{4,20}$/.test(loginId.trim().toLowerCase());
  const canSubmit = idOk && password.length >= 8 && password === password2 && digits !== null && !busy;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: loginId.trim().toLowerCase(), password, bizNo }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? `가입 실패 (${res.status})`);
      await refresh();
      router.replace("/onboarding/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F5F6F8] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-[#E4E6EA] rounded-3xl shadow-sm overflow-hidden">
        <div className="px-7 pt-7 pb-5 border-b border-[#E4E6EA]">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/logo.png" alt="비즈버디" width={176} height={56} priority className="h-11 w-auto" />
            <Link href="/login" className="ml-auto text-[11px] font-semibold text-[#888888] hover:text-[#6E62C2]">← 로그인</Link>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#111111] mt-5">회원가입</h1>
          <p className="text-[#888888] text-sm mt-1">계정 세 가지만 정하면 됩니다. 회사 정보는 다음 단계에서 AI와 대화하며 만듭니다.</p>
        </div>

        <form onSubmit={submit} className="px-7 py-6 space-y-3">
          {status === "unavailable" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-amber-800 text-xs font-semibold">인증 서버 준비 중</p>
              <p className="text-amber-700 text-[11px] mt-0.5">{unavailableMessage}</p>
            </div>
          )}
          <div>
            <label className={LABEL} htmlFor="loginId">아이디</label>
            <input id="loginId" className={INPUT} autoComplete="username" placeholder="영문 소문자·숫자·_ . - 4~20자"
              value={loginId} onChange={(e) => setLoginId(e.target.value)} disabled={busy} required />
            {loginId && !idOk && <p className="text-[11px] text-amber-700 mt-1">영문 소문자·숫자·_ . - 로 4~20자</p>}
          </div>
          <div>
            <label className={LABEL} htmlFor="password">비밀번호</label>
            <input id="password" type="password" className={INPUT} autoComplete="new-password" placeholder="8자 이상"
              value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} required />
          </div>
          <div>
            <label className={LABEL} htmlFor="password2">비밀번호 확인</label>
            <input id="password2" type="password" className={INPUT} autoComplete="new-password"
              value={password2} onChange={(e) => setPassword2(e.target.value)} disabled={busy} required />
            {password2 && password !== password2 && <p className="text-[11px] text-amber-700 mt-1">비밀번호가 서로 다릅니다.</p>}
          </div>
          <div>
            <label className={LABEL} htmlFor="bizNo">사업자등록번호</label>
            <input id="bizNo" className={`${INPUT} font-mono`} inputMode="numeric" placeholder="000-00-00000"
              value={bizNo} onChange={(e) => setBizNo(e.target.value)} disabled={busy} required />
            {bizNo && digits === null && <p className="text-[11px] text-amber-700 mt-1">숫자 10자리여야 합니다.</p>}
            {bizWarn && <p className="text-[11px] text-amber-700 mt-1">검증 숫자가 맞지 않습니다. 오타가 아닌지 확인해 주세요 (그대로 진행할 수 있습니다).</p>}
            <p className="text-[10px] text-[#888888] mt-1">국세청 조회는 하지 않습니다. 형식만 확인합니다.</p>
          </div>

          {error && <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5"><p className="text-rose-700 text-xs">{error}</p></div>}

          <button type="submit" disabled={!canSubmit || status === "unavailable"}
            className="w-full mt-2 px-5 py-3 rounded-2xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? "만드는 중…" : "가입하고 AI와 대화 시작 →"}
          </button>
        </form>

        <div className="px-7 py-4 border-t border-[#E4E6EA] bg-[#FAFAFB]">
          <p className="text-[10px] text-[#888888] leading-relaxed">
            비밀번호는 해시로만 저장되며 복구할 수 없습니다. 다음 단계에서 만드는 회사 프로필은 계정에 저장되어 다른 기기에서도 복원됩니다. ·{" "}
            <Link href="/about" className="hover:text-[#6E62C2] hover:underline">데이터 출처·면책</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
