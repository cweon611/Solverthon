// lib/ai/rateLimit.ts — IP당 분당 호출 제한 (§7.1 가드레일)
// 인메모리라 인스턴스 로컬이다. 데모 수준의 방어이며 분산 환경에서는 동작하지 않는다.

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= limit) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    hits.set(key, recent);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }

  recent.push(now);
  hits.set(key, recent);

  // 오래된 키는 흘려보낸다 (메모리 누수 방지)
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return { ok: true, retryAfter: 0 };
}

/** 프록시 뒤에서도 대략의 클라이언트 IP를 얻는다 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
