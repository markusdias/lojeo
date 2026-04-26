/** @type {import('next').NextConfig} */
const nextConfig = {
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
