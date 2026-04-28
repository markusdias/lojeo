import type { ReactNode } from 'react';
import { getActiveTemplate } from '../template';
import { TrackerProvider } from '../components/tracker-provider';
import { CartProvider } from '../components/cart/cart-provider';
import { WishlistProvider } from '../components/wishlist/wishlist-provider';
import { CookieBanner } from '../components/marketing/cookie-banner';
import { ChatWidget } from '../components/chat/chat-widget';
import { Header } from '../components/layout/header';
import { Footer } from '../components/layout/footer';
import { Pixels } from '../components/marketing/pixels';
import { ServiceWorkerRegister } from '../components/pwa/sw-register';
import { SiteJsonLd } from '../components/seo/site-jsonld';
import { auth } from '../auth';
import { getHreflangAlternates } from '../lib/hreflang';

const STOREFRONT_URL = process.env.STOREFRONT_URL ?? 'https://joias.lojeo.com.br';
import './globals.css';
// Tokens.css condicional por TEMPLATE_ID (build-time, via webpack alias).
// Ver next.config.mjs `webpack(config)` resolve.alias '@lojeo/active-template-tokens.css'.
// jewelry-v1 (default) ou coffee-v1.
import '@lojeo/active-template-tokens.css';

// Hreflang base no <head> do root layout — cobre TODAS as páginas (Next.js
// Metadata API herda alternates.languages quando rotas filhas não sobrescrevem).
// Hoje só temos pt-BR + x-default; Fase 1.2 com coffee-v1 expande automaticamente
// via getHreflangAlternates (ver apps/storefront/src/lib/hreflang.ts).
//
// generateMetadata permite tpl-conditional (description vem do template config).
export async function generateMetadata() {
  const tpl = await getActiveTemplate();
  const { appearance } = await getTenantRuntimeConfig();
  const slogan = appearance.slogan?.trim();
  const tagline = appearance.tagline?.trim();
  const title = slogan ? `${tpl.name} — ${slogan}` : tpl.name;
  const description = tagline || tpl.description || '';
  return {
    title,
    description,
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, statusBarStyle: 'default' as const, title: tpl.name },
    alternates: {
      languages: getHreflangAlternates('/'),
    },
  };
}

export const viewport = {
  themeColor: '#1A1A1A',
  width: 'device-width',
  initialScale: 1,
};

import { getTenantRuntimeConfig } from '../lib/tenant-config';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const tpl = await getActiveTemplate();
  const tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const { pixels: pixelConfig, appearance } = await getTenantRuntimeConfig();
  const typo = appearance.typo ?? 'a';
  const accent = appearance.accent ?? 'champagne';
  const bgTone = appearance.bgTone ?? 'warm';
  const imgRadius = appearance.imgRadius ?? '8';
  const typeScale = appearance.typeScale ?? 'default';
  const photoStyle = appearance.photoStyle ?? 'isolated';
  return (
    <html
      lang={tpl.locale}
      data-template={tpl.id}
      data-typo={typo}
      data-accent={accent}
      data-bg-tone={bgTone}
      data-img-radius={imgRadius}
      data-type-scale={typeScale}
      data-photo-style={photoStyle}
    >
      <body>
        <a href="#main-content" className="skip-link">
          {tpl.locale.startsWith('pt') ? 'Pular para o conteúdo principal' : 'Skip to main content'}
        </a>
        <SiteJsonLd
          baseUrl={STOREFRONT_URL}
          storeName={tpl.name}
          description={appearance.tagline?.trim() || tpl.description || ''}
        />
        <Pixels config={pixelConfig} />
        <ServiceWorkerRegister />
        <WishlistProvider>
        <CartProvider>
          <TrackerProvider tenantId={tenantId} endpoint="/api/track" userId={userId}>
            <Header storeName={tpl.name} isAuthenticated={!!session} />
            <main id="main-content">{children}</main>
            <Footer storeName={tpl.name} tagline={appearance.tagline?.trim()} />
            <CookieBanner />
            <ChatWidget />
          </TrackerProvider>
        </CartProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}
