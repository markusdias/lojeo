import { EmailShell, Line, btnPrimary } from './_shell';
import { tokens as t } from './_tokens';

export interface BoletoGeneratedProps {
  storeName: string;
  boletoUrl: string;          // PDF download externo (MP)
  barcode: string;            // linha digitável "23793.39001 60000.000000…"
  amount: string;             // "R$ 2.776,90"
  expiresInLabel?: string;    // "3 dias úteis"
  storeDocument?: string;
  storeAddress?: string;
  supportEmail?: string;
  unsubscribeUrl?: string;
  privacyUrl?: string;
}

export function BoletoGenerated({
  storeName,
  boletoUrl,
  barcode,
  amount,
  expiresInLabel = '3 dias úteis',
  storeDocument,
  storeAddress,
  supportEmail,
  unsubscribeUrl,
  privacyUrl,
}: BoletoGeneratedProps) {
  return (
    <EmailShell
      preview={`Seu boleto está pronto · vence em ${expiresInLabel}`}
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
            Seu boleto está pronto.
          </div>
          <div style={{ fontSize: t.fsSmall, color: t.textSecondary }}>
            Pague em qualquer banco ou app. Após confirmação (1–2 dias úteis), separamos seu pedido.
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
                  <a href={boletoUrl} style={btnPrimary}>
                    Baixar boleto (PDF)
                  </a>
                </td>
              </tr>
              {barcode && (
                <tr>
                  <td style={{ padding: '0 24px 24px' }}>
                    <div
                      style={{
                        fontSize: t.fsEyebrow,
                        letterSpacing: t.eyebrowTracking,
                        textTransform: 'uppercase',
                        color: t.textMuted,
                      }}
                    >
                      ou copie a linha digitável
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 11,
                        padding: 12,
                        background: t.surfaceSunken,
                        borderRadius: t.rMd,
                        marginTop: 8,
                        wordBreak: 'break-all',
                      }}
                    >
                      {barcode}
                    </div>
                  </td>
                </tr>
              )}
              <tr>
                <td
                  style={{
                    padding: 20,
                    borderTop: `1px solid ${t.divider}`,
                    fontSize: t.fsSmall,
                  }}
                >
                  <Line k="Valor" v={amount} />
                  <Line k="Vencimento" v={expiresInLabel} bold />
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td style={{ padding: '0 40px 32px' }}>
          <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.6 }}>
            Pagamentos via boleto levam 1–2 dias úteis para compensar. Se preferir mais rápido,
            cancele este pedido e refaça com Pix (compensação imediata).
          </div>
        </td>
      </tr>
    </EmailShell>
  );
}
