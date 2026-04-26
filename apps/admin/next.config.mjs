import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: resolve(__dirname, '../..'),
  transpilePackages: [
    '@lojeo/db',
    '@lojeo/engine',
    '@lojeo/logger',
    '@lojeo/storage',
    '@lojeo/tracking',
    '@lojeo/ai',
    '@lojeo/ui',
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
