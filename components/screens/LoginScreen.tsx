"use client";

// 로그인 — 아이디·비밀번호·사업자번호 세 가지가 모두 맞아야 한다. 계정은 Supabase app_users에 있다.
// 로그인하면 계정에 저장된 프로필·할 일·설정을 서버에서 내려받는다(sync.ts). 없으면 AI 대화로 만든다.

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useSession } from "@/lib/auth/AuthProvider";
import { formatBizNo } from "@/lib/auth/bizNo";
import { STORAGE_KEYS, readJson } from "@/lib/store/storage";
import { logoutAndClear, waitForSync } from "@/lib/store/sync";
import type { CompanyProfile } from "@/lib/types";

const INPUT = "w-full border border-[#E4E6EA] rounded-xl px-4 py-2.5 text-sm text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#6E62C2] focus:ring-2 focus:ring-[#6E62C2]/10 disabled:bg-[#F5F6F8]";
const LABEL = "text-[11px] font-semibold text-[#444444] mb-1 block";

export function LoginScreen() {
  const router = useRouter();
  const { status, user, unavailableMessage, refresh } = useSession();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [bizNo, setBizNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const afterLogin = async () => {
    await waitForSync(); // 서버에 저장된 데이터를 먼저 내려받는다
    const profile = readJson<CompanyProfile | null>(STORAGE_KEYS.profile, null);
    router.replace(profile ? "/dashboard" : "/onboarding/chat");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password, bizNo }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? `로그인 실패 (${res.status})`);
      await refresh();
      if (body?.user?.isAdmin) router.replace("/admin");
      else await afterLogin();
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
            <span className="ml-auto text-[9px] font-mono text-[#6E62C2] bg-[#f0eef9] px-1.5 py-0.5 rounded-full font-semibold">BETA</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#111111] mt-5">로그인</h1>
          <p className="text-[#888888] text-sm mt-1">받을 수 있는 지원사업과 지켜야 할 의무를 회사 기준으로 정리해 드립니다.</p>
        </div>

        <div className="px-7 py-6 space-y-5">
          {status === "unavailable" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-amber-800 text-xs font-semibold">인증 서버 준비 중</p>
              <p className="text-amber-700 text-[11px] mt-0.5">{unavailableMessage}</p>
            </div>
          )}

          {status === "authed" && user ? (
            <div className="space-y-3">
              <div className="bg-[#EEF4F0] border border-[#B2D1BF] rounded-2xl px-4 py-3">
                <p className="text-[10px] font-semibold text-[#2A5A46] uppercase tracking-wide">로그인되어 있습니다</p>
                <p className="text-[#111111] text-sm font-semibold mt-1">{user.loginId}</p>
                <p className="text-[#888888] text-[11px] font-mono">{formatBizNo(user.bizNo)}</p>
              </div>
              <button onClick={() => (user.isAdmin ? router.replace("/admin") : void afterLogin())}
                className="w-full px-5 py-3 rounded-2xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25">
                계속하기 →
              </button>
              <button onClick={() => void logoutAndClear()}
                className="w-full px-5 py-2.5 rounded-2xl border border-[#E4E6EA] text-[#444444] text-xs font-semibold hover:bg-[#F5F6F8] cursor-pointer">
                다른 계정으로 로그인
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className={LABEL} htmlFor="loginId">아이디</label>
                <input id="loginId" className={INPUT} autoComplete="username" placeholder="영문 소문자·숫자 4~20자"
                  value={loginId} onChange={(e) => setLoginId(e.target.value)} disabled={busy || status === "loading"} required />
              </div>
              <div>
                <label className={LABEL} htmlFor="password">비밀번호</label>
                <input id="password" type="password" className={INPUT} autoComplete="current-password" placeholder="8자 이상"
                  value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy || status === "loading"} required />
              </div>
              <div>
                <label className={LABEL} htmlFor="bizNo">사업자등록번호</label>
                <input id="bizNo" className={`${INPUT} font-mono`} inputMode="numeric" placeholder="000-00-00000"
                  value={bizNo} onChange={(e) => setBizNo(e.target.value)} disabled={busy || status === "loading"} required />
              </div>
              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5"><p className="text-rose-700 text-xs">{error}</p></div>
              )}
              <button type="submit" disabled={busy || status === "loading" || status === "unavailable"}
                className="w-full px-5 py-3 rounded-2xl bg-[#6E62C2] text-white text-sm font-semibold hover:bg-[#5a50a8] transition-colors cursor-pointer shadow-md shadow-[#6E62C2]/25 disabled:opacity-50 disabled:cursor-not-allowed">
                {busy ? "확인 중…" : "로그인"}
              </button>
            </form>
          )}

          {status !== "authed" && (
            <div className="pt-1 border-t border-[#E4E6EA]">
              <p className="text-[11px] text-[#888888] text-center mt-4 mb-2">처음이신가요?</p>
              <Link href="/signup"
                className="block w-full text-center px-5 py-3 rounded-2xl bg-[#f0eef9] text-[#6E62C2] border border-[#dddaf4] text-sm font-semibold hover:bg-[#dddaf4] transition-colors">
                회원가입
              </Link>
              <p className="text-[10px] text-[#888888] text-center mt-2">가입 뒤에는 폼 대신 AI와 대화하며 회사 정보를 만듭니다.</p>
            </div>
          )}
        </div>

        <div className="px-7 py-4 border-t border-[#E4E6EA] bg-[#FAFAFB]">
          <p className="text-[10px] text-[#888888] leading-relaxed">
            계정과 회사 프로필·할 일·설정은 계정에 저장되어 로그인하면 어느 기기에서든 같은 화면이 복원됩니다. 비밀번호는 해시로만 저장합니다. ·{" "}
            <Link href="/about" className="hover:text-[#6E62C2] hover:underline">데이터 출처·면책</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
