import { EmailShell, Line, btnPrimary } from './_shell';
import { tokens as t } from './_tokens';

export interface DailyDigestProps {
  storeName: string;
  /** Data do digest no formato local (ex: "27 abr · seg" ou "Apr 27 · Mon") */
  dateLabel: string;
  ordersCount: number;
  revenueLabel: string;          // ja formatado (ex: "R$ 12.450,00" ou "$ 1,250.00")
  ticketsOpenCount: number;
  lowStockCount: number;
  criticalAlertsCount: number;
  /** URL do dashboard admin */
  dashboardUrl: string;
  locale?: 'pt-BR' | 'en-US';
  storeDocument?: string;
  storeAddress?: string;
  supportEmail?: string;
  unsubscribeUrl?: string;
  privacyUrl?: string;
}

export function DailyDigest({
  storeName,
  dateLabel,
  ordersCount,
  revenueLabel,
  ticketsOpenCount,
  lowStockCount,
  criticalAlertsCount,
  dashboardUrl,
  locale = 'pt-BR',
  storeDocument,
  storeAddress,
  supportEmail,
  unsubscribeUrl,
  privacyUrl,
}: DailyDigestProps) {
  const isPt = locale === 'pt-BR';
  const headline = isPt ? `Resumo de hoje · ${dateLabel}` : `Today's summary · ${dateLabel}`;
  const intro = isPt
    ? `Veja o que aconteceu na ${storeName} nas últimas 24 horas.`
    : `Here's what happened at ${storeName} in the last 24 hours.`;
  const labels = isPt
    ? {
        orders: 'Pedidos',
        revenue: 'Receita',
        tickets: 'Tickets abertos',
        lowStock: 'Estoque baixo',
        critical: 'Alertas críticos',
        cta: 'Abrir painel',
      }
    : {
        orders: 'Orders',
        revenue: 'Revenue',
        tickets: 'Open tickets',
        lowStock: 'Low stock items',
        critical: 'Critical alerts',
        cta: 'Open dashboard',
      };
  return (
    <EmailShell
      preview={headline}
      storeName={storeName}
      storeDocument={storeDocument}
      storeAddress={storeAddress}
      supportEmail={supportEmail}
      unsubscribeUrl={unsubscribeUrl}
      privacyUrl={privacyUrl}
    >
      <tr>
        <td style={{ padding: '40px 40px 16px' }}>
          <div style={{ fontFamily: t.fontDisplay, fontSize: t.fsH2, lineHeight: 1.2, marginBottom: 8 }}>
            {headline}
          </div>
          <div style={{ fontSize: t.fsSmall, color: t.textSecondary, lineHeight: 1.6 }}>
            {intro}
          </div>
        </td>
      </tr>
      <tr>
        <td style={{ padding: '8px 40px 8px' }}>
          <Line k={labels.orders} v={String(ordersCount)} bold />
          <Line k={labels.revenue} v={revenueLabel} />
          <Line k={labels.tickets} v={String(ticketsOpenCount)} />
          <Line k={labels.lowStock} v={String(lowStockCount)} />
          <Line k={labels.critical} v={String(criticalAlertsCount)} />
        </td>
      </tr>
      <tr>
        <td style={{ padding: '8px 40px 32px' }}>
          <a href={dashboardUrl} style={btnPrimary}>{labels.cta}</a>
        </td>
      </tr>
    </EmailShell>
  );
}
