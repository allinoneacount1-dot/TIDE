import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Shim missing @x402 modules that coinbase cdp-sdk tries to import but we don't use
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core/client": false,
      "@x402/evm/upto/client": false,
      "@x402/evm/exact/client": false,
      "@x402/svm/upto/client": false,
      "@x402/svm/exact/client": false,
    };
    return config;
  },
  // don't try to bundle these server-only deps
  experimental: {
    optimizePackageImports: ["@rainbow-me/rainbowkit"],
  },
};

export default nextConfig;
