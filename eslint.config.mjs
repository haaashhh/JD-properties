import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // React 19's `react-hooks/set-state-in-effect` triggers on the standard
      // controlled-input sync pattern (mirror an external `value` prop into a
      // local display string). The shadcn-generated use-mobile.ts also trips
      // it. The behaviour is intentional and well-understood, so warn instead
      // of erroring.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
