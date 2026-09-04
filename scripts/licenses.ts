// scripts/licenses.ts — 의존성의 라이선스 목록을 public/licenses.json으로 생성한다 (§8 S12 · §13.1)
// 실행: npm run licenses
//
// 대회 규정이 오픈소스 라이선스 고지를 요구한다. 추측하지 않고 각 패키지의
// package.json에 적힌 값만 읽는다. 읽지 못한 항목은 "확인 필요"로 남긴다 (§0.1-8).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

interface Entry {
  name: string;
  version: string;
  license: string;
  kind: "runtime" | "dev";
  homepage: string | null;
}

function readPackage(dir: string): Record<string, unknown> | null {
  const file = resolve(dir, "package.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** license 필드는 문자열, 객체, 배열 어느 형태로든 온다 */
function licenseOf(pkg: Record<string, unknown>): string {
  const l = pkg.license ?? pkg.licenses;
  if (typeof l === "string") return l;
  if (Array.isArray(l)) {
    const names = l.map((x) => (typeof x === "string" ? x : (x as { type?: string })?.type)).filter(Boolean);
    if (names.length > 0) return names.join(", ");
  }
  if (l && typeof l === "object" && typeof (l as { type?: string }).type === "string") {
    return (l as { type: string }).type;
  }
  return "확인 필요";
}

function homepageOf(pkg: Record<string, unknown>): string | null {
  if (typeof pkg.homepage === "string") return pkg.homepage;
  const repo = pkg.repository;
  const url = typeof repo === "string" ? repo : (repo as { url?: string })?.url;
  if (!url) return null;
  return url.replace(/^git\+/, "").replace(/\.git$/, "").replace(/^git:\/\//, "https://");
}

function main() {
  const root = process.cwd();
  const self = readPackage(root);
  if (!self) throw new Error("package.json을 읽을 수 없습니다.");

  const groups: [Record<string, string>, Entry["kind"]][] = [
    [(self.dependencies ?? {}) as Record<string, string>, "runtime"],
    [(self.devDependencies ?? {}) as Record<string, string>, "dev"],
  ];

  const entries: Entry[] = [];
  let unknown = 0;

  for (const [deps, kind] of groups) {
    for (const name of Object.keys(deps).sort()) {
      const pkg = readPackage(resolve(root, "node_modules", name));
      if (!pkg) {
        entries.push({ name, version: deps[name], license: "확인 필요", kind, homepage: null });
        unknown += 1;
        continue;
      }
      const license = licenseOf(pkg);
      if (license === "확인 필요") unknown += 1;
      entries.push({
        name,
        version: typeof pkg.version === "string" ? pkg.version : deps[name],
        license,
        kind,
        homepage: homepageOf(pkg),
      });
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    note: "각 패키지의 package.json에 기재된 라이선스를 그대로 옮긴 것입니다.",
    entries,
  };

  const out = resolve(root, "public/licenses.json");
  writeFileSync(out, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`public/licenses.json 생성 — ${entries.length}개 패키지`);
  const byLicense = new Map<string, number>();
  for (const e of entries) byLicense.set(e.license, (byLicense.get(e.license) ?? 0) + 1);
  for (const [license, count] of [...byLicense].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${license.padEnd(16)} ${count}개`);
  }
  if (unknown > 0) console.log(`\n라이선스를 읽지 못한 항목 ${unknown}개는 "확인 필요"로 표시했습니다.`);
}

main();
