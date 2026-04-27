import { EmailShell, Line } from './_shell';
import { tokens as t } from './_tokens';

export interface PixGeneratedProps {
  storeName: string;
  qrImageUrl: string;        // PNG/SVG do QR code (gerado pelo gateway)
  pixCopyPaste: string;      // chave copia-e-cola
  amount: string;            // "R$ 2.776,90"
  discountLabel?: string;    // "Desconto Pix (5%)"
  discountValue?: string;    // "– R$ 145,10"
  expiresInLabel?: string;   // "30 minutos"
  storeDocument?: string;
  storeAddress?: string;
  supportEmail?: string;
  unsubscribeUrl?: string;
  privacyUrl?: string;
}

export function PixGenerated({
  storeName,
  qrImageUrl,
  pixCopyPaste,
  amount,
  discountLabel,
  discountValue,
  expiresInLabel = '30 minutos',
  storeDocument,
  storeAddress,
  supportEmail,
  unsubscribeUrl,
  privacyUrl,
}: PixGeneratedProps) {
  return (
    <EmailShell
      preview={`Seu Pix está pronto · expira em ${expiresInLabel}`}
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
            Seu Pix está pronto.
          </div>
          <div style={{ fontSize: t.fsSmall, color: t.textSecondary }}>
            Pague em qualquer banco — confirmação em segundos.
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
                  <img
                    src={qrImageUrl}
                    alt="QR Code Pix"
                    width={160}
                    height={160}
                    style={{
                      display: 'block',
                      margin: '0 auto',
                      border: `1px solid ${t.divider}`,
                      background: t.surface,
                    }}
                  />
                  <div
                    style={{
                      marginTop: 16,
                      fontSize: t.fsEyebrow,
                      letterSpacing: t.eyebrowTracking,
                      textTransform: 'uppercase',
                      color: t.textMuted,
                    }}
                  >
                    ou copie a chave
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
                    {pixCopyPaste}
                  </div>
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: 20,
                    borderTop: `1px solid ${t.divider}`,
                    fontSize: t.fsSmall,
                  }}
                >
                  <Line k="Valor" v={amount} />
                  {discountLabel && discountValue ? (
                    <Line k={discountLabel} v={discountValue} />
                  ) : null}
                  <Line k="Expira em" v={expiresInLabel} bold />
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td style={{ padding: '0 40px 32px' }}>
          <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.6 }}>
            Após o pagamento, sua peça começa a ser produzida em até 24h. Você recebe atualizações
            por aqui.
          </div>
        </td>
      </tr>
    </EmailShell>
  );
}
