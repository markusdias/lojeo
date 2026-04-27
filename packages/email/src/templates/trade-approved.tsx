import { EmailShell, Step, btnPrimary } from './_shell';
import { tokens as t } from './_tokens';

export interface TradeApprovedProps {
  storeName: string;
  labelPdfUrl: string;
  daysToShip?: number;            // default 7
  processingDays?: number;        // default 3
  refundDays?: number;            // default 7
  storeDocument?: string;
  storeAddress?: string;
  supportEmail?: string;
  unsubscribeUrl?: string;
  privacyUrl?: string;
}

export function TradeApproved({
  storeName,
  labelPdfUrl,
  daysToShip = 7,
  processingDays = 3,
  refundDays = 7,
  storeDocument,
  storeAddress,
  supportEmail,
  unsubscribeUrl,
  privacyUrl,
}: TradeApprovedProps) {
  return (
    <EmailShell
      preview="Sua troca foi aprovada"
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
            Troca aprovada.
          </div>
          <div style={{ fontSize: t.fsSmall, color: t.textSecondary }}>
            Anexamos a etiqueta reversa. Basta levar a uma agência dos Correios.
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
                <td style={{ padding: 24 }}>
                  <div
                    style={{
                      fontSize: t.fsEyebrow,
                      letterSpacing: t.eyebrowTracking,
                      textTransform: 'uppercase',
                      color: t.textMuted,
                      marginBottom: 14,
                    }}
                  >
                    Como devolver
                  </div>
                  <Step
                    n="1"
                    title="Imprima a etiqueta"
                    description="Anexamos em PDF neste email"
                  />
                  <Step
                    n="2"
                    title="Embale a peça"
                    description="Use a embalagem original ou caixa similar"
                  />
                  <Step
                    n="3"
                    title="Leve aos Correios"
                    description={`Você tem ${daysToShip} dias para postar`}
                  />
                  <a href={labelPdfUrl} style={{ ...btnPrimary, marginTop: 14 }}>
                    Baixar etiqueta (PDF)
                  </a>
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: 20,
                    borderTop: `1px solid ${t.divider}`,
                    fontSize: 13,
                    color: t.textSecondary,
                    lineHeight: 1.7,
                  }}
                >
                  Após o recebimento, processamos a troca em até {processingDays} dias úteis. Em
                  caso de devolução, o reembolso aparece em até {refundDays} dias úteis.
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </EmailShell>
  );
}
