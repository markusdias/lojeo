import type { ReactNode } from 'react';
import './globals.css';
import { Sidebar } from '../components/layout/sidebar';
import { Topbar } from '../components/layout/topbar';
import { ToastProvider } from '../components/ui/toast';
import { auth } from '../auth';

export const metadata = {
  title: 'Lojeo Admin',
  description: 'Painel administrativo Lojeo',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const userName = session?.user?.name ?? undefined;
  const userEmail = session?.user?.email ?? undefined;

  return (
    <html lang="pt-BR">
      <body style={{ display: 'flex', minHeight: '100vh', margin: 0 }}>
        <ToastProvider>
          <Sidebar userName={userName} userEmail={userEmail} tenantLabel="Atelier Verde" tenantPlan="MEI" />
          <div style={{ flex: 1, minWidth: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            <Topbar userName={userName} userEmail={userEmail} />
            <main style={{ flex: 1 }}>
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
