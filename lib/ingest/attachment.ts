// lib/ingest/attachment.ts — 공고 원문(hwpx·pdf) 본문 발췌 (§0.1-5의 예외 범위)
//
// 기관 누리집을 긁지 않는다는 원칙(§0.1-5)은 지킨다. 여기서 받는 URL은 사람이 찾은 링크가 아니라
// 기업마당 공식 오픈 API의 JSON 응답이 printFlpthNm 필드로 직접 내려준 파일 링크다. HTML을 파싱하지 않고
// API가 준 파일을 그대로 받아 텍스트만 뽑는다.
//
// 옛 이진 .hwp는 신뢰할 수 있는 파서가 없어 다루지 않는다. 실패는 전부 삼키고 null을 돌려준다 —
// 첨부파일 하나가 안 읽힌다고 수집 전체가 막히면 안 된다.

// jszip·pdf-parse는 정적으로 import하지 않는다. pdf-parse(pdfjs)는 모듈 평가 시점에 브라우저 API(DOMMatrix 등)를
// 찾는데, Vercel Node 런타임에는 없어 라우트 모듈 전체가 500으로 죽는다(실측 2026-09-04). 필요할 때만 불러오고
// 실패하면 null을 돌려 수집 파이프라인 자체는 계속 돌게 한다.

/** pdfjs가 모듈 평가 때 참조하는 브라우저 전용 전역. 텍스트 추출에는 쓰이지 않으므로 빈 껍데기로 채운다 */
function polyfillBrowserGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      constructor(_init?: unknown) { void _init; }
    };
  }
  if (typeof g.ImageData === "undefined") {
    g.ImageData = class ImageData {
      constructor(public width = 0, public height = 0) {}
    };
  }
  if (typeof g.Path2D === "undefined") {
    g.Path2D = class Path2D {
      constructor(_d?: unknown) { void _d; }
    };
  }
}

async function loadJSZip() {
  const mod = await import("jszip");
  return mod.default;
}

async function loadPdfParse() {
  polyfillBrowserGlobals();
  const mod = await import("pdf-parse");
  return mod.PDFParse;
}

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 8_000_000; // 8MB 이상은 다루지 않는다
export const ATTACHMENT_TEXT_MAX_CHARS = 6_000; // Claude 입력에 얹을 발췌 상한

function stripEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/** hwpx는 zip 안에 Contents/section{N}.xml — 문단·표 셀 텍스트가 전부 <hp:t> 태그에 담긴다 */
async function extractHwpxText(buf: Buffer): Promise<Extracted> {
  try {
    const JSZip = await loadJSZip();
    const zip = await JSZip.loadAsync(buf);
    const sectionNames = Object.keys(zip.files)
      .filter((n) => /^Contents\/section\d+\.xml$/.test(n))
      .sort();
    if (sectionNames.length === 0) return { text: null, error: "Contents/section*.xml 없음" };

    const parts: string[] = [];
    for (const name of sectionNames) {
      const xml = await zip.files[name].async("string");
      const runs = [...xml.matchAll(/<hp:t[^>]*>([\s\S]*?)<\/hp:t>/g)].map((m) =>
        stripEntities(m[1].replace(/<[^>]+>/g, "")).trim(),
      );
      const text = runs.filter(Boolean).join(" ");
      if (text) parts.push(text);
    }
    const joined = parts.join("\n").replace(/[ \t]{2,}/g, " ").trim();
    return { text: joined ? joined.slice(0, ATTACHMENT_TEXT_MAX_CHARS) : null, error: joined ? null : "빈 텍스트" };
  } catch (e) {
    return { text: null, error: `hwpx 해제 실패 — ${describe(e)}` };
  }
}

interface Extracted { text: string | null; error: string | null }
const describe = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message.slice(0, 200)}` : String(e));

async function extractPdfText(buf: Buffer): Promise<Extracted> {
  let parser: { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> };
  try {
    const PDFParse = await loadPdfParse();
    parser = new PDFParse({ data: buf });
  } catch (e) {
    return { text: null, error: `pdf-parse 로드 실패 — ${describe(e)}` };
  }
  try {
    const result = await parser.getText();
    const text = result.text.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    return { text: text ? text.slice(0, ATTACHMENT_TEXT_MAX_CHARS) : null, error: text ? null : "빈 텍스트" };
  } catch (e) {
    return { text: null, error: `getText 실패 — ${describe(e)}` };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

function detectExt(contentDisposition: string): "hwpx" | "pdf" | null {
  const m = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const name = m?.[1]?.toLowerCase() ?? "";
  if (name.endsWith(".hwpx")) return "hwpx";
  if (name.endsWith(".pdf")) return "pdf";
  return null;
}

/** URL의 확장자만으로 지원 형식인지 미리 거른다 (수집기 쪽에서 불필요한 다운로드를 피한다) */
export function isSupportedAttachment(filename: string | null): boolean {
  const s = (filename ?? "").toLowerCase();
  return s.endsWith(".hwpx") || s.endsWith(".pdf");
}

export interface AttachmentDetail {
  text: string | null;
  stage: "fetch" | "size" | "ext" | "extract" | "ok" | "error";
  error: string | null;
  bytes: number;
  ext: "hwpx" | "pdf" | null;
  ms: number;
}

/** 진단용: 어느 단계에서 왜 실패했는지까지 돌려준다. 관리자 라우트가 쓴다 */
export async function fetchAttachmentDetail(url: string): Promise<AttachmentDetail> {
  const started = Date.now();
  const done = (d: Omit<AttachmentDetail, "ms">): AttachmentDetail => ({ ...d, ms: Date.now() - started });
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return done({ text: null, stage: "fetch", error: `HTTP ${res.status}`, bytes: 0, ext: null });
    const len = Number(res.headers.get("content-length") ?? "0");
    if (len > MAX_BYTES) return done({ text: null, stage: "size", error: `${len} bytes`, bytes: len, ext: null });

    const ext = detectExt(res.headers.get("content-disposition") ?? "");
    if (!ext) return done({ text: null, stage: "ext", error: `미지원 형식 (${res.headers.get("content-disposition") ?? "content-disposition 없음"})`, bytes: len, ext: null });

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) return done({ text: null, stage: "size", error: `${buf.length} bytes`, bytes: buf.length, ext });

    const r = ext === "hwpx" ? await extractHwpxText(buf) : await extractPdfText(buf);
    return done({ text: r.text, stage: r.text ? "ok" : "extract", error: r.error, bytes: buf.length, ext });
  } catch (e) {
    return done({ text: null, stage: "error", error: describe(e), bytes: 0, ext: null });
  }
}

/** 첨부파일에서 본문 텍스트를 뽑는다. 무엇이 잘못되든 null — 절대 던지지 않는다 */
export async function fetchAttachmentText(url: string): Promise<string | null> {
  const d = await fetchAttachmentDetail(url);
  if (!d.text) console.warn(`[attachment] ${d.stage}: ${d.error} · ${url.slice(0, 120)}`);
  return d.text;
}
