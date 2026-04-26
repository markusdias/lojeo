import { MetadataRoute } from 'next';

const BASE_URL = process.env.STOREFRONT_URL ?? 'https://joias.lojeo.com.br';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/carrinho', '/conta/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
