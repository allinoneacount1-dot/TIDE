import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  webpack: (config) => {
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
  experimental: {
    optimizePackageImports: ["@rainbow-me/rainbowkit"],
  },
};

export default nextConfig;
