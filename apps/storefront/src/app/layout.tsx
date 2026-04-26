import type { ReactNode } from 'react';
import { getActiveTemplate } from '../template';
import { TrackerProvider } from '../components/tracker-provider';
import { CartProvider } from '../components/cart/cart-provider';
import { ConsentBanner } from '../components/consent-banner';
import { Header } from '../components/layout/header';
import { Footer } from '../components/layout/footer';
import './globals.css';
import '@lojeo/template-jewelry-v1/tokens.css';

export const metadata = {
  title: 'Joias — Atelier',
  description: 'Joalheria contemporânea em ouro 18k e prata 925, com garantia de um ano.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const tpl = await getActiveTemplate();
  const tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
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
        <CartProvider>
          <TrackerProvider tenantId={tenantId} endpoint="/api/track">
            <Header storeName={tpl.name} />
            <main>{children}</main>
            <Footer storeName={tpl.name} />
            <ConsentBanner />
          </TrackerProvider>
        </CartProvider>
      </body>
    </html>
  );
}
