import { EmailShell, btnPrimary } from './_shell';
import { tokens as t } from './_tokens';

export interface WelcomeProps {
  storeName: string;
  customerName: string;
  loginUrl: string;
  storeDocument?: string;
  storeAddress?: string;
  supportEmail?: string;
  unsubscribeUrl?: string;
  privacyUrl?: string;
}

export function Welcome({
  storeName,
  customerName,
  loginUrl,
  storeDocument,
  storeAddress,
  supportEmail,
  unsubscribeUrl,
  privacyUrl,
}: WelcomeProps) {
  return (
    <EmailShell
      preview={`Bem-vinda à ${storeName}`}
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
            Bem-vinda, {customerName}.
          </div>
          <div style={{ fontSize: t.fsSmall, color: t.textSecondary, lineHeight: 1.6 }}>
            Sua conta na {storeName} está pronta. Acompanhe pedidos, salve favoritos e descubra
            peças feitas à mão na bancada.
          </div>
        </td>
      </tr>
      <tr>
        <td style={{ padding: '0 40px 32px' }}>
          <a href={loginUrl} style={btnPrimary}>
            Acessar minha conta
          </a>
        </td>
      </tr>
    </EmailShell>
  );
}
