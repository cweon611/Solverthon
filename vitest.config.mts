import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    // components/ui/*-variants.ts 는 JSX 없는 순수 문자열 테이블이라 node 환경으로 검증한다
    include: [
      "lib/**/__tests__/**/*.test.ts",
      "components/**/__tests__/**/*.test.ts",
    ],
    environment: "node",
  },
  resolve: {
    // tsconfig의 paths "@/*" → "./*" 와 동일하게 맞춘다
    alias: [{ find: /^@\//, replacement: root }],
  },
});
