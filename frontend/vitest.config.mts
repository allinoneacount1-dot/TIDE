import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite resolves the `@/*` alias from tsconfig natively; the plugin that used
  // to do this is no longer needed.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: { reporter: ["text", "lcov"], include: ["src/lib/**"] },
  },
});
