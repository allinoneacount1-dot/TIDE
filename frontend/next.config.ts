import type { NextConfig } from "next";

/**
 * The previous config disabled ESLint and TypeScript at build time. That is
 * gone: a build that cannot typecheck is not a build that should reach
 * production.
 *
 * The `@x402/*` aliases below are kept, and they are not a hack we chose. The
 * `wagmi/connectors` entry point is a barrel that re-exports every connector,
 * so importing `injected` alone still drags in `@base-org/account` →
 * `@coinbase/cdp-sdk`, which declares imports of `@x402/core/client` and four
 * sibling subpaths that its published package does not actually ship. It is an
 * upstream packaging bug in a transitive dependency. Aliasing the three package
 * roots covers every subpath, since webpack matches aliases on module
 * boundaries.
 *
 * TIDE does not use the Coinbase connector or x402 payments, so this code is
 * unreachable at runtime. Aliasing the five broken specifiers to `false` lets
 * the bundler prune the dead branch instead of failing resolution on it. Both
 * bundlers are configured because dev runs Turbopack and build runs webpack.
 */
const UNRESOLVABLE_X402 = ["@x402/core", "@x402/evm", "@x402/svm"] as const;
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // wagmi/viem ship modern ESM with deep import trees. This trims what lands in
  // the client bundle without hand-maintaining a barrel file.
  experimental: {
    optimizePackageImports: ["wagmi", "viem", "@tanstack/react-query", "lightweight-charts"],
  },

  turbopack: {
    resolveAlias: Object.fromEntries(
      UNRESOLVABLE_X402.map((id) => [id, { browser: "./src/lib/empty-module.ts" }])
    ),
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(UNRESOLVABLE_X402.map((id) => [id, false])),
    };
    return config;
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
