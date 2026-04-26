import type { ReactNode } from 'react';
import { getActiveTemplate } from '../template';
import { TrackerProvider } from '../components/tracker-provider';
import { CartProvider } from '../components/cart/cart-provider';
import { WishlistProvider } from '../components/wishlist/wishlist-provider';
import { ConsentBanner } from '../components/consent-banner';
import { Header } from '../components/layout/header';
import { Footer } from '../components/layout/footer';
import { Pixels } from '../components/marketing/pixels';
import { ServiceWorkerRegister } from '../components/pwa/sw-register';
import { db, tenants } from '@lojeo/db';
import { eq } from 'drizzle-orm';
import './globals.css';
import '@lojeo/template-jewelry-v1/tokens.css';

export const metadata = {
  title: 'Joias — Atelier',
  description: 'Joalheria contemporânea em ouro 18k e prata 925, com garantia de um ano.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default' as const, title: 'Atelier' },
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

async function getPixelConfig(tenantId: string): Promise<PixelConfig> {
  try {
    const [tenant] = await db.select({ config: tenants.config }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const cfg = (tenant?.config ?? {}) as { pixels?: PixelConfig };
    return cfg.pixels ?? {};
  } catch {
    return {};
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const tpl = await getActiveTemplate();
  const tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  const pixelConfig = await getPixelConfig(tenantId);
  return (
    <html
      lang={tpl.locale}
      data-typo="a"
      data-accent="champagne"
      data-bg-tone="warm"
      data-img-radius="8"
      data-type-scale="default"
    >
      <body>
        <Pixels config={pixelConfig} />
        <ServiceWorkerRegister />
        <WishlistProvider>
        <CartProvider>
          <TrackerProvider tenantId={tenantId} endpoint="/api/track">
            <Header storeName={tpl.name} />
            <main>{children}</main>
            <Footer storeName={tpl.name} />
            <ConsentBanner />
          </TrackerProvider>
        </CartProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}
