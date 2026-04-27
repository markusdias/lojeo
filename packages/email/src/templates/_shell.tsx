import { Html, Head, Preview, Body } from '@react-email/components';
import type { ReactNode } from 'react';
import { tokens as t } from './_tokens';

export interface ShellProps {
  preview: string;
  storeName: string;
  storeDocument?: string;
  storeAddress?: string;
  supportEmail?: string;
  supportHours?: string;
  unsubscribeUrl?: string;
  privacyUrl?: string;
  children: ReactNode;
}

/**
 * EmailShell — layout table-based email-safe espelhando
 * docs/design-system-jewelry-v1/project/ui_kits/storefront/Emails.jsx
 *
 * Estrutura: <Html><Body><table>: header (logo serif) → preview text
 * oculto → conteúdo → footer (atendimento + endereço + unsubscribe)
 */
export function EmailShell({
  preview,
  storeName,
  storeDocument,
  storeAddress,
  supportEmail,
  supportHours = 'seg–sex 9h–18h',
  unsubscribeUrl = '#',
  privacyUrl = '#',
  children,
}: ShellProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          background: '#E8E2D6',
          fontFamily: t.fontBody,
          color: t.textPrimary,
        }}
      >
        <table
          cellPadding={0}
          cellSpacing={0}
          align="center"
          style={{
            width: t.emailWidth,
            maxWidth: '100%',
            background: t.bg,
            margin: '0 auto',
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  padding: '32px 40px',
                  borderBottom: `1px solid ${t.divider}`,
                }}
              >
                <div
                  style={{
                    fontFamily: t.fontDisplay,
                    fontSize: 22,
                    letterSpacing: t.displayTracking,
                  }}
                >
                  {storeName}
                </div>
              </td>
            </tr>
            {children}
            <tr>
              <td
                style={{
                  padding: '32px 40px',
                  background: t.surfaceSunken,
                  fontSize: t.fsCaption,
                  color: t.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                {supportEmail ? (
                  <>
                    Atendimento: {supportEmail} · {supportHours}
                    <br />
                  </>
                ) : null}
                {storeName}
                {storeDocument ? ` · ${storeDocument}` : ''}
                {storeAddress ? ` · ${storeAddress}` : ''}
                <br />
                <a href={unsubscribeUrl} style={{ color: t.textSecondary }}>
                  Cancelar inscrição
                </a>
                {' · '}
                <a href={privacyUrl} style={{ color: t.textSecondary }}>
                  Política de privacidade
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// Atoms compartilhados (Line / Step / btn) — espelho da ref
// ---------------------------------------------------------------------------

export function Line({
  k,
  v,
  bold = false,
}: {
  k: string;
  v: string;
  bold?: boolean;
}) {
  return (
    <table cellPadding={0} cellSpacing={0} style={{ width: '100%' }}>
      <tbody>
        <tr>
          <td
            style={{
              padding: '4px 0',
              color: bold ? t.textPrimary : t.textSecondary,
              fontSize: bold ? t.fsBody : t.fsSmall,
              fontFamily: bold ? t.fontDisplay : t.fontBody,
            }}
          >
            {k}
          </td>
          <td
            style={{
              padding: '4px 0',
              textAlign: 'right',
              fontSize: bold ? 18 : t.fsSmall,
              fontFamily: bold ? t.fontDisplay : t.fontBody,
            }}
          >
            {v}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function Step({
  n,
  title,
  description,
}: {
  n: string;
  title: string;
  description: string;
}) {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      style={{ width: '100%', marginBottom: 10 }}
    >
      <tbody>
        <tr>
          <td
            style={{
              width: 28,
              fontFamily: t.fontDisplay,
              fontSize: 18,
              color: t.accent,
              verticalAlign: 'top',
            }}
          >
            {n}
          </td>
          <td>
            <div style={{ fontWeight: 500, fontSize: t.fsSmall }}>{title}</div>
            <div style={{ fontSize: t.fsCaption, color: t.textSecondary }}>
              {description}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export const btnPrimary = {
  display: 'inline-block',
  padding: '12px 22px',
  background: t.textPrimary,
  color: t.textOnDark,
  textDecoration: 'none',
  fontSize: t.fsSmall,
  fontFamily: t.fontBody,
  borderRadius: t.rSm,
  marginTop: 18,
} as const;
