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
    // Capacitor / Gradle output — not part of the Next.js app source.
    "android/**",
  ]),
  {
    rules: {
      // Stricter than many existing patterns (ref sync in render, setState in effects); keep as warnings so CI stays green while patterns are migrated.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  /* Dynamic poster URLs (TMDB) + blur layer — not a good fit for `next/image` without a custom loader. */
  {
    files: ["src/components/poster-backdrop.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  /* TanStack Virtual API is intentionally “incompatible” with React Compiler heuristics; safe to ignore. */
  {
    files: ["src/components/virtual-scroll-list.tsx"],
    rules: { "react-hooks/incompatible-library": "off" },
  },
]);

export default eslintConfig;
