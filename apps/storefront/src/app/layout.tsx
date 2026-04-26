import type { ReactNode } from 'react';
import { getActiveTemplate } from '../template';
import './globals.css';
import '@lojeo/template-jewelry-v1/tokens.css';

export const metadata = {
  title: 'Joias — em breve',
  description: 'Loja de joias premium',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const tpl = await getActiveTemplate();
  return (
    <html lang={tpl.locale} data-typography={tpl.typography.default}>
      <body>{children}</body>
    </html>
  );
}
