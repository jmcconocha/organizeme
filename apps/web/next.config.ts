import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@organizeme/shared', '@organizeme/ui'],
};

export default nextConfig;
