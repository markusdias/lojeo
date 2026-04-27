import { EmailShell, btnPrimary } from './_shell';
import { tokens as t } from './_tokens';

export interface NpsSurveyProps {
  storeName: string;
  customerName?: string;
  orderCode?: string;
  /** URL com query ?token=... + score=... pra capturar resposta. */
  surveyBaseUrl: string;
  locale?: 'pt-BR' | 'en-US';
  storeDocument?: string;
  storeAddress?: string;
  supportEmail?: string;
  unsubscribeUrl?: string;
  privacyUrl?: string;
}

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function NpsSurvey({
  storeName,
  customerName,
  orderCode,
  surveyBaseUrl,
  locale = 'pt-BR',
  storeDocument,
  storeAddress,
  supportEmail,
  unsubscribeUrl,
  privacyUrl,
}: NpsSurveyProps) {
  const isPt = locale === 'pt-BR';
  const greeting = customerName
    ? isPt ? `Olá, ${customerName}` : `Hi, ${customerName}`
    : isPt ? 'Olá' : 'Hi';
  const headline = isPt
    ? 'Como foi sua experiência?'
    : 'How was your experience?';
  const intro = isPt
    ? `Recomendaria a ${storeName} a um amigo? Sua resposta nos ajuda a melhorar.${orderCode ? ` (Pedido ${orderCode})` : ''}`
    : `Would you recommend ${storeName} to a friend? Your answer helps us improve.${orderCode ? ` (Order ${orderCode})` : ''}`;
  const scaleLow = isPt ? 'Nada provável' : 'Not at all likely';
  const scaleHigh = isPt ? 'Muito provável' : 'Extremely likely';

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
            {greeting}.
          </div>
          <div style={{ fontFamily: t.fontDisplay, fontSize: 22, lineHeight: 1.3, marginBottom: 12 }}>
            {headline}
          </div>
          <div style={{ fontSize: t.fsSmall, color: t.textSecondary, lineHeight: 1.6 }}>
            {intro}
          </div>
        </td>
      </tr>
      <tr>
        <td style={{ padding: '8px 24px 16px', textAlign: 'center' }}>
          <table cellPadding={0} cellSpacing={0} style={{ margin: '0 auto' }}>
            <tbody>
              <tr>
                {SCORES.map((s) => (
                  <td key={s} style={{ padding: '0 2px' }}>
                    <a
                      href={`${surveyBaseUrl}&score=${s}`}
                      style={{
                        display: 'inline-block',
                        width: 32,
                        textAlign: 'center',
                        padding: '8px 0',
                        background: s >= 9 ? '#1a8056' : s >= 7 ? '#d4a04c' : '#b94a4a',
                        color: '#fff',
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        borderRadius: 4,
                      }}
                    >
                      {s}
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 380, margin: '8px auto 0', fontSize: 11, color: t.textSecondary }}>
            <span>{scaleLow}</span>
            <span>{scaleHigh}</span>
          </div>
        </td>
      </tr>
      <tr>
        <td style={{ padding: '8px 40px 32px', textAlign: 'center' }}>
          <a href={surveyBaseUrl} style={btnPrimary}>
            {isPt ? 'Abrir pesquisa completa' : 'Open full survey'}
          </a>
        </td>
      </tr>
    </EmailShell>
  );
}
