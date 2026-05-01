import type { ReactNode } from 'react';

// Layout limpo (sem Header/Footer) — foco total na mensagem de manutenção.
// Padrão Shopify password page.
export default function MaintenanceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
