import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: resolve(__dirname, '../..'),
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  transpilePackages: [
    '@lojeo/db',
    '@lojeo/engine',
    '@lojeo/logger',
    '@lojeo/template-jewelry-v1',
    '@lojeo/tracking',
    '@lojeo/ui',
  ],
  async redirects() {
    return [
      { source: '/login', destination: '/entrar', permanent: true },
      { source: '/minha-conta', destination: '/conta', permanent: true },
      { source: '/account', destination: '/conta', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },
};

export default nextConfig;
