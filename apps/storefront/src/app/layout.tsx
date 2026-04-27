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
import { db, tenants } from '@lojeo/db';
import { eq } from 'drizzle-orm';
import { auth } from '../auth';
import { getHreflangAlternates } from '../lib/hreflang';

const STOREFRONT_URL = process.env.STOREFRONT_URL ?? 'https://joias.lojeo.com.br';
import './globals.css';
import '@lojeo/template-jewelry-v1/tokens.css';

// Hreflang base no <head> do root layout — cobre TODAS as páginas (Next.js
// Metadata API herda alternates.languages quando rotas filhas não sobrescrevem).
// Hoje só temos pt-BR + x-default; Fase 1.2 com coffee-v1 expande automaticamente
// via getHreflangAlternates (ver apps/storefront/src/lib/hreflang.ts).
export const metadata = {
  title: 'Joias — Atelier',
  description: 'Joalheria contemporânea em ouro 18k e prata 925, com garantia de um ano.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default' as const, title: 'Atelier' },
  alternates: {
    languages: getHreflangAlternates('/'),
  },
};

export const viewport = {
  themeColor: '#1A1A1A',
  width: 'device-width',
  initialScale: 1,
};

interface PixelConfig {
  gtmId?: string;
  gaTrackingId?: string;
  metaPixelId?: string;
  tiktokPixelId?: string;
  clarityProjectId?: string;
  googleAdsConversionId?: string;
}

interface AppearanceConfig {
  typo?: string;
  accent?: string;
  bgTone?: string;
  imgRadius?: '0' | '8' | '16';
  typeScale?: 'default' | 'larger' | 'smaller';
}

interface TenantRuntimeConfig {
  pixels: PixelConfig;
  appearance: AppearanceConfig;
}

async function getTenantRuntimeConfig(tenantId: string): Promise<TenantRuntimeConfig> {
  try {
    const [tenant] = await db.select({ config: tenants.config }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const cfg = (tenant?.config ?? {}) as { pixels?: PixelConfig; appearance?: AppearanceConfig };
    return { pixels: cfg.pixels ?? {}, appearance: cfg.appearance ?? {} };
  } catch {
    return { pixels: {}, appearance: {} };
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const tpl = await getActiveTemplate();
  const tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const { pixels: pixelConfig, appearance } = await getTenantRuntimeConfig(tenantId);
  const typo = appearance.typo ?? 'a';
  const accent = appearance.accent ?? 'champagne';
  const bgTone = appearance.bgTone ?? 'warm';
  const imgRadius = appearance.imgRadius ?? '8';
  const typeScale = appearance.typeScale ?? 'default';
  return (
    <html
      lang={tpl.locale}
      data-typo={typo}
      data-accent={accent}
      data-bg-tone={bgTone}
      data-img-radius={imgRadius}
      data-type-scale={typeScale}
    >
      <body>
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo principal
        </a>
        <SiteJsonLd
          baseUrl={STOREFRONT_URL}
          storeName={tpl.name}
          description="Joalheria contemporânea em ouro 18k e prata 925, com garantia de um ano."
        />
        <Pixels config={pixelConfig} />
        <ServiceWorkerRegister />
        <WishlistProvider>
        <CartProvider>
          <TrackerProvider tenantId={tenantId} endpoint="/api/track" userId={userId}>
            <Header storeName={tpl.name} />
            <main id="main-content">{children}</main>
            <Footer storeName={tpl.name} />
            <CookieBanner />
            <ChatWidget />
          </TrackerProvider>
        </CartProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}
