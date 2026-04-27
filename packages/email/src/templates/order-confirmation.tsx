import { EmailShell, Line, Step, btnPrimary } from './_shell';
import { tokens as t } from './_tokens';

export interface OrderItem {
  name: string;
  detail: string; // ex: "ouro 18k · aro 14 · 1×"
  price: string;  // formatado: "R$ 2.890,00"
  imageUrl?: string;
}

export interface OrderConfirmationProps {
  storeName: string;
  customerName: string;
  orderCode: string; // PED-184722
  items: OrderItem[];
  subtotal: string;
  shippingLabel: string; // "Frete (Sedex)"
  shippingValue: string;
  total: string;
  trackUrl: string;
  // Footer
  storeDocument?: string;
  storeAddress?: string;
  supportEmail?: string;
  unsubscribeUrl?: string;
  privacyUrl?: string;
}

export function OrderConfirmation({
  storeName,
  customerName,
  orderCode,
  items,
  subtotal,
  shippingLabel,
  shippingValue,
  total,
  trackUrl,
  storeDocument,
  storeAddress,
  supportEmail,
  unsubscribeUrl,
  privacyUrl,
}: OrderConfirmationProps) {
  return (
    <EmailShell
      preview={`Recebemos seu pedido ${orderCode}`}
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
            Recebemos seu pedido.
          </div>
          <div style={{ fontSize: t.fsSmall, color: t.textSecondary }}>
            {customerName}, obrigada pela compra. Já avisamos a bancada.
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
                <td style={{ padding: 20, borderBottom: `1px solid ${t.divider}` }}>
                  <div
                    style={{
                      fontSize: t.fsEyebrow,
                      letterSpacing: t.eyebrowTracking,
                      textTransform: 'uppercase',
                      color: t.textMuted,
                    }}
                  >
                    Pedido
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: t.fsBody, marginTop: 4 }}>
                    {orderCode}
                  </div>
                </td>
              </tr>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: 20 }}>
                    <table cellPadding={0} cellSpacing={0} style={{ width: '100%' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: 60, paddingRight: 14 }}>
                            <div
                              style={{
                                width: 60,
                                height: 60,
                                background: item.imageUrl
                                  ? `url(${item.imageUrl}) center/cover no-repeat`
                                  : t.surfaceSunken,
                                borderRadius: t.rMd,
                              }}
                            />
                          </td>
                          <td>
                            <div style={{ fontFamily: t.fontDisplay, fontSize: t.fsBody }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: t.fsCaption, color: t.textSecondary }}>
                              {item.detail}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontSize: t.fsSmall }}>{item.price}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              ))}
              <tr>
                <td
                  style={{
                    padding: 20,
                    borderTop: `1px solid ${t.divider}`,
                    fontSize: t.fsSmall,
                  }}
                >
                  <Line k="Subtotal" v={subtotal} />
                  <Line k={shippingLabel} v={shippingValue} />
                  <Line k="Total" v={total} bold />
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td style={{ padding: '0 40px 32px' }}>
          <div
            style={{
              fontSize: t.fsEyebrow,
              letterSpacing: t.eyebrowTracking,
              textTransform: 'uppercase',
              color: t.textMuted,
              marginBottom: 14,
            }}
          >
            Próximos passos
          </div>
          <Step n="1" title="Pagamento" description="Aguardamos confirmação" />
          <Step n="2" title="Produção" description="3-5 dias úteis · feita à mão" />
          <Step n="3" title="Envio" description="Você recebe o rastreio aqui" />
          <a href={trackUrl} style={btnPrimary}>
            Acompanhar pedido
          </a>
        </td>
      </tr>
    </EmailShell>
  );
}
