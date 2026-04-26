import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Lojeo Admin',
  description: 'Painel administrativo Lojeo',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
