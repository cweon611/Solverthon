// GET /api/health — 상태 확인 · §9
// 키 값은 절대 노출하지 않는다. 존재 여부만 알린다 (§0.1-3).

import { getModel, hasAnthropicKey } from "@/lib/ai/claude";
import { getEmbedModel, hasVoyageKey } from "@/lib/ai/voyage";
import { getDataMode, isPublicDemo } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    dataMode: getDataMode(),
    publicDemo: isPublicDemo(),
    adapters: {
      kstartup: Boolean(process.env.DATA_GO_KR_SERVICE_KEY),
      bizinfo: Boolean(process.env.BIZINFO_API_KEY),
    },
    ai: { parse: hasAnthropicKey(), embed: hasVoyageKey() },
    model: { parse: getModel(), embed: getEmbedModel() },
  });
}
