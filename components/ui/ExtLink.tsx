import type { ReactNode } from "react";

// 외부 링크 버튼 (§4.5-8): apply_url ?? original_url을 새 탭으로 연다.
// URL이 없으면 aria-disabled + 회색 처리 + title="원문 링크 없음". 시각 클래스는 호출부(디자인)가 그대로 넘긴다.
export function ExtLink({ href, className, children }: { href?: string | null; className: string; children: ReactNode }) {
  if (!href) {
    return (
      <a aria-disabled="true" title="원문 링크 없음" className={`${className} opacity-50 cursor-not-allowed pointer-events-none`}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
