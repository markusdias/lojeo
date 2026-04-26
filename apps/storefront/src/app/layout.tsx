import type { ReactNode } from 'react';
import { getActiveTemplate } from '../template';
import { TrackerProvider } from '../components/tracker-provider';
import { ConsentBanner } from '../components/consent-banner';
import './globals.css';
import '@lojeo/template-jewelry-v1/tokens.css';

export const metadata = {
  title: 'Joias — em breve',
  description: 'Loja de joias premium',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const tpl = await getActiveTemplate();
  const tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  return (
    <html lang={tpl.locale} data-typography={tpl.typography.default}>
      <body>
        <TrackerProvider tenantId={tenantId} endpoint="/api/track">
          {children}
          <ConsentBanner />
        </TrackerProvider>
      </body>
    </html>
  );
}
