import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    include: ["lib/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    // tsconfig의 paths "@/*" → "./*" 와 동일하게 맞춘다
    alias: [{ find: /^@\//, replacement: root }],
  },
});
