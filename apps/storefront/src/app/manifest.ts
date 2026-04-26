import type { MetadataRoute } from 'next';
import { getActiveTemplate } from '../template';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const tpl = await getActiveTemplate();

  return {
    name: tpl.name,
    short_name: tpl.name.split(' ')[0] ?? 'Loja',
    description: 'Joalheria contemporânea em ouro 18k e prata 925.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAF7',
    theme_color: '#1A1A1A',
    orientation: 'portrait',
    lang: tpl.locale,
    icons: [
      {
        src: '/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    categories: ['shopping', 'lifestyle'],
  };
}
