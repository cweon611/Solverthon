import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // PRD §4.1·§3.5: design/은 시각 디자인의 "참조용 원본"이며 앱 코드에서 import하지 않고 수정하지도 않는다.
    // 이 파일에는 §4.5-2(폼 컴포넌트 렌더 중 생성)·§4.5-21(미사용 변수)의 알려진 이슈가 그대로 남아 있고,
    // 그 수정본은 components/ui/TaskForm.tsx · MiniForm.tsx 등 분해된 컴포넌트에 반영돼 있다.
    // 원본을 보존하면서 §4.6 린트 게이트를 만족시키기 위해 린트 대상에서 제외한다.
    "design/**",
  ]),
]);

export default eslintConfig;
