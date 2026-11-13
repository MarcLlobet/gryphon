import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

/**
 * Next's own rules (React, hooks, accessibility, Core Web Vitals) plus TypeScript's,
 * with formatting left entirely to Prettier.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // Leading underscore marks a value that is deliberately unused, e.g. a field
      // destructured away to leave the rest.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "coverage/**", "next-env.d.ts", "public/mockServiceWorker.js"]),
]);
