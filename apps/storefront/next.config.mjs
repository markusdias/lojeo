/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@lojeo/db',
    '@lojeo/engine',
    '@lojeo/logger',
    '@lojeo/template-jewelry-v1',
    '@lojeo/tracking',
    '@lojeo/ui',
  ],
};

export default nextConfig;
