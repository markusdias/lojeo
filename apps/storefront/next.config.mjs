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
    '@lojeo/template-coffee-v1',
    '@lojeo/tracking',
    '@lojeo/ui',
  ],
  // Webpack alias resolve `@lojeo/active-template-tokens.css` para o template ativo
  // baseado em TEMPLATE_ID env (build-time). Permite import unico em layout.tsx
  // sem code-splitting dinamico (Next CSS e static).
  webpack(config) {
    const tplId = process.env.TEMPLATE_ID || 'jewelry-v1';
    const safeTpl = ['jewelry-v1', 'coffee-v1'].includes(tplId) ? tplId : 'jewelry-v1';
    const aliasPath = resolve(__dirname, `../../templates/${safeTpl}/src/tokens.css`);
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@lojeo/active-template-tokens.css': aliasPath,
    };
    return config;
  },
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
          // X-Frame-Options omitido — substituído por CSP frame-ancestors abaixo (mais granular)
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://apps-lojeo-admin.m9axtw.easypanel.host https://*.lojeo.com https://*.lojeo.app",
          },
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
