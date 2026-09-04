// GET /api/programs/[id] — 단건 조회 · §9
// Next 16에서 ctx.params는 Promise다. 반드시 await 한다 (§2.1).

import { loadCatalog } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/programs/[id]">) {
  const { id } = await ctx.params;
  const { programs } = await loadCatalog(new Date());
  const program = programs.find((p) => p.id === id);

  if (!program) {
    return Response.json({ error: { code: "not_found", message: "해당 공고를 찾을 수 없습니다." } }, { status: 404 });
  }
  return Response.json(program);
}
