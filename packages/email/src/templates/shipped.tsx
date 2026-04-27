import { EmailShell, btnPrimary } from './_shell';
import { tokens as t } from './_tokens';

export type ShippedStatus = 'done' | 'current' | 'future';

export interface ShippedStop {
  status: ShippedStatus;
  label: string;
  date: string; // "16 abr · São Paulo"
}

export interface ShippingNotificationProps {
  storeName: string;
  estimatedDelivery: string; // "22 abr"
  trackingCode: string;      // "BR123456789"
  trackingUrl: string;
  stops: ShippedStop[];
  storeDocument?: string;
  storeAddress?: string;
  supportEmail?: string;
  unsubscribeUrl?: string;
  privacyUrl?: string;
}

function ShippedLine({ stop }: { stop: ShippedStop }) {
  const c =
    stop.status === 'done'
      ? t.accent
      : stop.status === 'current'
        ? t.textPrimary
        : t.textMuted;
  return (
    <table cellPadding={0} cellSpacing={0} style={{ width: '100%', marginBottom: 8 }}>
      <tbody>
        <tr>
          <td style={{ width: 16 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: stop.status === 'future' ? 'transparent' : c,
                border: `1.5px solid ${c}`,
              }}
            />
          </td>
          <td
            style={{
              fontSize: t.fsSmall,
              color: stop.status === 'future' ? t.textMuted : t.textPrimary,
              fontWeight: stop.status === 'current' ? 500 : 400,
            }}
          >
            {stop.label}
          </td>
          <td style={{ fontSize: t.fsCaption, color: t.textMuted, textAlign: 'right' }}>
            {stop.date}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function ShippingNotification({
  storeName,
  estimatedDelivery,
  trackingCode,
  trackingUrl,
  stops,
  storeDocument,
  storeAddress,
  supportEmail,
  unsubscribeUrl,
  privacyUrl,
}: ShippingNotificationProps) {
  return (
    <EmailShell
      preview="Sua peça saiu da bancada"
      storeName={storeName}
      storeDocument={storeDocument}
      storeAddress={storeAddress}
      supportEmail={supportEmail}
      unsubscribeUrl={unsubscribeUrl}
      privacyUrl={privacyUrl}
    >
      <tr>
        <td style={{ padding: '40px 40px 24px' }}>
          <div
            style={{
              fontFamily: t.fontDisplay,
              fontSize: t.fsH2,
              lineHeight: 1.2,
              marginBottom: 12,
            }}
          >
            Sua peça está a caminho.
          </div>
          <div style={{ fontSize: t.fsSmall, color: t.textSecondary }}>
            Embalada com cuidado · previsão de entrega {estimatedDelivery}.
          </div>
        </td>
      </tr>
      <tr>
        <td style={{ padding: '0 40px 24px' }}>
          <table
            cellPadding={0}
            cellSpacing={0}
            style={{ width: '100%', background: t.surface, borderRadius: t.rMd }}
          >
            <tbody>
              <tr>
                <td style={{ padding: 24, textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: t.fsEyebrow,
                      letterSpacing: t.eyebrowTracking,
                      textTransform: 'uppercase',
                      color: t.textMuted,
                    }}
                  >
                    Código de rastreio
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 22, marginTop: 6 }}>
                    {trackingCode}
                  </div>
                  <a href={trackingUrl} style={{ ...btnPrimary, marginTop: 18 }}>
                    Acompanhar entrega
                  </a>
                </td>
              </tr>
              <tr>
                <td style={{ padding: 24, borderTop: `1px solid ${t.divider}` }}>
                  <div
                    style={{
                      fontSize: t.fsEyebrow,
                      letterSpacing: t.eyebrowTracking,
                      textTransform: 'uppercase',
                      color: t.textMuted,
                      marginBottom: 14,
                    }}
                  >
                    Trajeto
                  </div>
                  {stops.map((stop, i) => (
                    <ShippedLine key={i} stop={stop} />
                  ))}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </EmailShell>
  );
}
