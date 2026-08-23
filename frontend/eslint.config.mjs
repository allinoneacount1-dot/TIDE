import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "src/lib/abi.generated.ts", "src/lib/deployments.generated.ts"],
  },
  {
    rules: {
      // Chain data is bigint-heavy and often typed loosely by upstream ABIs.
      // Warn rather than error so a genuine `any` is visible without blocking a
      // build for a cast that viem's inference cannot express.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];
