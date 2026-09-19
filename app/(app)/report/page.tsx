// 매칭 품질 리포트 — docs/matching/REPORT.md(npm run match:report 산출물)를 빌드 때 읽어 그대로 보여준다.
// 숫자를 여기서 다시 계산하지 않는다: 리포트 파일이 단일 출처다.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata: Metadata = { title: "매칭 품질 리포트 — 비즈버디" };
export const dynamic = "force-static";

export default function ReportPage() {
  const md = readFileSync(join(process.cwd(), "docs/matching/REPORT.md"), "utf8");
  return (
    <div className="p-6 max-w-5xl">
      <article className="text-sm text-[#444444] leading-relaxed">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: (p) => <h1 className="text-2xl font-display font-bold text-[#111111] mb-3" {...p} />,
            h2: (p) => <h2 className="text-lg font-display font-bold text-[#111111] mt-8 mb-3 pb-1 border-b border-[#E4E6EA]" {...p} />,
            p: (p) => <p className="my-2" {...p} />,
            blockquote: (p) => <blockquote className="my-3 border-l-2 border-[#6E62C2]/40 bg-[#6E62C2]/[0.04] px-4 py-2 text-xs text-[#47408E] [&_p]:my-1" {...p} />,
            ul: (p) => <ul className="my-2 list-disc pl-5 space-y-1" {...p} />,
            code: (p) => <code className="font-mono text-[12px] bg-[#F5F6F8] rounded px-1" {...p} />,
            strong: (p) => <strong className="font-semibold text-[#111111]" {...p} />,
            table: (p) => (
              <div className="my-3 overflow-x-auto border border-[#E4E6EA] rounded-xl">
                <table className="w-full text-xs" {...p} />
              </div>
            ),
            thead: (p) => <thead className="bg-[#F5F6F8] text-[#888888]" {...p} />,
            th: (p) => <th className="px-3 py-2 font-semibold text-left whitespace-nowrap" {...p} />,
            td: (p) => <td className="px-3 py-2 border-t border-[#E4E6EA] align-top" {...p} />,
          }}
        >
          {md}
        </Markdown>
      </article>
    </div>
  );
}
