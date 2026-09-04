import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAttachmentText, isSupportedAttachment } from "@/lib/ingest/attachment";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(body: Buffer | null, status: number, contentDisposition = ""): void {
  const bytes = body ? new Uint8Array(body) : null;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(bytes, {
        status,
        headers: bytes
          ? { "content-disposition": contentDisposition, "content-length": String(bytes.length) }
          : undefined,
      }),
    ),
  );
}

describe("isSupportedAttachment", () => {
  it("hwpx·pdf만 지원한다", () => {
    expect(isSupportedAttachment("notice-2026.hwpx")).toBe(true);
    expect(isSupportedAttachment("공고문.PDF")).toBe(true);
    expect(isSupportedAttachment("notice.hwp")).toBe(false); // 옛 이진 형식은 미지원
    expect(isSupportedAttachment("공고문.docx")).toBe(false);
    expect(isSupportedAttachment(null)).toBe(false);
  });
});

describe("fetchAttachmentText", () => {
  it("hwpx의 <hp:t> 본문(문단·표 셀 포함)을 뽑는다", async () => {
    const zip = new JSZip();
    zip.file(
      "Contents/section0.xml",
      `<?xml version="1.0"?><hs:sec xmlns:hp="x"><hp:p><hp:run><hp:t>지원한도 최대 5백만원</hp:t></hp:run></hp:p>` +
        `<hp:tbl><hp:tr><hp:tc><hp:subList><hp:p><hp:run><hp:t>예산액</hp:t></hp:run></hp:p></hp:subList></hp:tc>` +
        `<hp:tc><hp:subList><hp:p><hp:run><hp:t>76,000,000원</hp:t></hp:run></hp:p></hp:subList></hp:tc></hp:tr></hp:tbl></hs:sec>`,
    );
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    mockFetch(buf, 200, 'attachment; filename="notice-2026.hwpx"');

    const text = await fetchAttachmentText("https://bizinfo.go.kr/cmm/fms/getImageFile.do?atchFileId=x");
    expect(text).toContain("지원한도 최대 5백만원");
    expect(text).toContain("76,000,000원"); // 표 셀 텍스트도 뽑힌다
  });

  it("여러 section 파일을 순서대로 합친다", async () => {
    const zip = new JSZip();
    zip.file("Contents/section0.xml", `<hp:p><hp:run><hp:t>첫 페이지</hp:t></hp:run></hp:p>`);
    zip.file("Contents/section1.xml", `<hp:p><hp:run><hp:t>둘째 페이지</hp:t></hp:run></hp:p>`);
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    mockFetch(buf, 200, 'attachment; filename="document.hwpx"');

    const text = await fetchAttachmentText("https://example.com/f");
    expect(text?.indexOf("첫 페이지")).toBeLessThan(text?.indexOf("둘째 페이지") ?? -1);
  });

  it("지원하지 않는 형식(.hwp)이면 null", async () => {
    mockFetch(Buffer.from("dummy"), 200, 'attachment; filename="notice.hwp"');
    expect(await fetchAttachmentText("https://example.com/f")).toBeNull();
  });

  it("HTTP 오류·형식 불명이면 null이고 던지지 않는다", async () => {
    mockFetch(null, 404);
    expect(await fetchAttachmentText("https://example.com/f")).toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(fetchAttachmentText("https://example.com/f")).resolves.toBeNull();
  });

  it("깨진 zip이어도 던지지 않고 null", async () => {
    mockFetch(Buffer.from("이건 zip이 아닙니다"), 200, 'attachment; filename="notice.hwpx"');
    expect(await fetchAttachmentText("https://example.com/f")).toBeNull();
  });
});
