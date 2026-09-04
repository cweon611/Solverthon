// GET /api/programs — 카탈로그 조회 (디버그·외부 연동) · §9
// embedding·raw_text는 응답에 넣지 않는다. loadCatalog가 이미 그 컬럼을 빼고 읽는다.

import { loadCatalog } from "@/lib/data/repository";
import { announcementStatus } from "@/lib/view/toAnnouncement";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const field = url.searchParams.get("field");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.trim().toLowerCase();
  const includeClosed = url.searchParams.get("includeClosed") === "true";

  const today = new Date();
  const { programs } = await loadCatalog(today);

  const filtered = programs.filter((p) => {
    const s = announcementStatus(p, today);
    if (!includeClosed && s === "closed") return false;
    if (status && s !== status) return false;
    if (field && p.support_field !== field) return false;
    if (q && !`${p.title} ${p.organization}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return Response.json(filtered);
}
