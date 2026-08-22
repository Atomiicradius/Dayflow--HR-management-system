import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external hosts (local IP and localtunnel URL) to load Next.js hot-reloaded dev chunks
  allowedDevOrigins: [
    '10.118.108.154',
    'localhost:3000',
    'grumpy-bears-wash.loca.lt',
  ],
} as any;

export default nextConfig;
