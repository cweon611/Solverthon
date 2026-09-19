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
import { cn } from "@/lib/utils";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { button } from "@/components/ui/button-variants";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    router.replace(profile ? "/dashboard" : "/onboarding");
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
      <Card radius="3xl" clip className="w-full max-w-md">
        <CardHeader size="auth">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/logo.png" alt="비즈버디" width={176} height={56} priority className="h-11 w-auto" />
            <Badge size="xs" weight="monoSemibold" bordered={false} tone="brandPlain" className="ml-auto">BETA</Badge>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#111111] mt-5">로그인</h1>
          <p className="text-[#888888] text-sm mt-1">받을 수 있는 지원사업과 지켜야 할 의무를 회사 기준으로 정리해 드립니다.</p>
        </CardHeader>

        <div className="px-7 py-6 space-y-5">
          {status === "unavailable" && (
            <Alert tone="warning" pad="lg">
              <p className="text-amber-800 text-xs font-semibold">인증 서버 준비 중</p>
              <p className="text-amber-700 text-[11px] mt-0.5">{unavailableMessage}</p>
            </Alert>
          )}

          {status === "authed" && user ? (
            <div className="space-y-3">
              <Alert tone="success" radius="2xl" pad="lg">
                <p className="text-[10px] font-semibold text-[#2A5A46] uppercase tracking-wide">로그인되어 있습니다</p>
                <p className="text-[#111111] text-sm font-semibold mt-1">{user.loginId}</p>
                <p className="text-[#888888] text-[11px] font-mono">{formatBizNo(user.bizNo)}</p>
              </Alert>
              <Button onClick={() => (user.isAdmin ? router.replace("/admin") : void afterLogin())}
                variant="primary" pad="5x3" text="sm" radius="2xl" elevate="brand" motion="colors" block>
                계속하기 →
              </Button>
              <Button onClick={() => void logoutAndClear()}
                variant="outline" pad="5x2.5" text="xs" radius="2xl" block>
                다른 계정으로 로그인
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label variant="field" htmlFor="loginId">아이디</Label>
                <Input id="loginId" variant="authLg" autoComplete="username" placeholder="영문 소문자·숫자 4~20자"
                  value={loginId} onChange={(e) => setLoginId(e.target.value)} disabled={busy || status === "loading"} required />
              </div>
              <div>
                <Label variant="field" htmlFor="password">비밀번호</Label>
                <Input id="password" type="password" variant="authLg" autoComplete="current-password" placeholder="8자 이상"
                  value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy || status === "loading"} required />
              </div>
              <div>
                <Label variant="field" htmlFor="bizNo">사업자등록번호</Label>
                <Input id="bizNo" variant="authLg" mono inputMode="numeric" placeholder="000-00-00000"
                  value={bizNo} onChange={(e) => setBizNo(e.target.value)} disabled={busy || status === "loading"} required />
              </div>
              {error && (
                <Alert><p className="text-rose-700 text-xs">{error}</p></Alert>
              )}
              <Button type="submit" disabled={busy || status === "loading" || status === "unavailable"}
                variant="primary" pad="5x3" text="sm" radius="2xl" elevate="brand" motion="colors" block off="o50">
                {busy ? "확인 중…" : "로그인"}
              </Button>
            </form>
          )}

          {status !== "authed" && (
            <div className="pt-1 border-t border-[#E4E6EA]">
              <p className="text-[11px] text-[#888888] text-center mt-4 mb-2">처음이신가요?</p>
              <Link href="/signup"
                className={cn(button({ variant: "soft", pad: "5x3", text: "sm", radius: "2xl", motion: "colors", block: true, hand: false }), "block text-center")}>
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
      </Card>
    </div>
  );
}
