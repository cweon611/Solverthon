import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse(pdfjs)·jszip은 번들에 넣지 않고 런타임에 node_modules에서 읽는다.
  // 번들에 들어가면 pdfjs가 청크 평가 시점에 브라우저 전역(DOMMatrix)을 찾다가 라우트 전체를 죽인다.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "jszip"],
  // pdfjs는 텍스트 추출 때 pdf.worker.mjs를 동적 import한다. 경로가 계산식이라 파일 추적에 잡히지 않아
  // Vercel 번들에서 빠졌다(실측: "Cannot find module .../pdf.worker.mjs"). 첨부파일을 읽는 라우트에 명시적으로 포함한다.
  outputFileTracingIncludes: {
    "/api/ingest": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs"],
    "/api/admin/attachment-test": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs"],
  },
};

export default nextConfig;
