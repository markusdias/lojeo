import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, giftCards } from '@lojeo/db';
import { and, eq } from 'drizzle-orm';
import { CopyCodeButton } from './copy-code-button';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d: Date | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

interface Props {
  params: Promise<{ code: string }>;
}

export default async function GiftCardSuccessPage({ params }: Props) {
  const { code } = await params;
  const card = await db.query.giftCards.findFirst({
    where: and(eq(giftCards.tenantId, TENANT_ID), eq(giftCards.code, code.toUpperCase())),
  });
  if (!card) notFound();

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '64px var(--container-pad, 24px) 96px',
        textAlign: 'center',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--accent-soft, rgba(201,168,92,0.18))',
          color: 'var(--accent, #C9A85C)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <p
        style={{
          fontSize: 12,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--text-muted, #6B6055)',
          margin: '0 0 12px',
        }}
      >
        Vale-presente gerado
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-display, serif)',
          fontSize: 36,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          margin: '0 0 16px',
          color: 'var(--text-primary, #14110F)',
        }}
      >
        Seu presente está pronto
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-secondary, #3D352F)', margin: '0 0 40px' }}>
        Enviamos o código por email para <strong>{card.recipientEmail}</strong>. Guarde também a confirmação abaixo.
      </p>

      <section
        style={{
          background: 'var(--surface, #fafaf7)',
          border: '1px solid var(--border, rgba(0,0,0,0.08))',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: 32,
          marginBottom: 24,
        }}
      >
        <p
          style={{
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--text-muted, #6B6055)',
            margin: '0 0 8px',
          }}
        >
          Código do vale
        </p>
        <p
          style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 28,
            letterSpacing: '0.08em',
            color: 'var(--text-primary, #14110F)',
            margin: '0 0 24px',
            wordBreak: 'break-all',
          }}
        >
          {card.code}
        </p>
        <CopyCodeButton code={card.code} />

        <dl
          style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
            textAlign: 'left',
          }}
        >
          <div>
            <dt style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted, #6B6055)', marginBottom: 4 }}>
              Valor
            </dt>
            <dd style={{ margin: 0, fontFamily: 'var(--font-display, serif)', fontSize: 22, color: 'var(--text-primary, #14110F)' }}>
              {fmtBRL(card.initialValueCents)}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted, #6B6055)', marginBottom: 4 }}>
              Saldo atual
            </dt>
            <dd style={{ margin: 0, fontFamily: 'var(--font-display, serif)', fontSize: 22, color: 'var(--text-primary, #14110F)' }}>
              {fmtBRL(card.currentBalanceCents)}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted, #6B6055)', marginBottom: 4 }}>
              Validade
            </dt>
            <dd style={{ margin: 0, fontSize: 14, color: 'var(--text-primary, #14110F)' }}>
              {fmtDate(card.expiresAt)}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted, #6B6055)', marginBottom: 4 }}>
              Status
            </dt>
            <dd style={{ margin: 0, fontSize: 14, color: 'var(--text-primary, #14110F)', textTransform: 'capitalize' }}>
              {card.status === 'active' ? 'Ativo' : card.status === 'pending_payment' ? 'Aguardando pagamento' : card.status}
            </dd>
          </div>
        </dl>

        {card.message && (
          <blockquote
            style={{
              marginTop: 24,
              padding: '16px 20px',
              borderLeft: '3px solid var(--accent, #C9A85C)',
              background: 'var(--bg, #fff)',
              fontStyle: 'italic',
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--text-secondary, #3D352F)',
              textAlign: 'left',
            }}
          >
            “{card.message}”
            {card.senderName && (
              <footer style={{ marginTop: 8, fontStyle: 'normal', fontSize: 12, color: 'var(--text-muted, #6B6055)' }}>
                — {card.senderName}
              </footer>
            )}
          </blockquote>
        )}
      </section>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/produtos"
          style={{
            padding: '12px 24px',
            background: 'var(--text-primary, #14110F)',
            color: 'var(--paper, #fff)',
            borderRadius: 'var(--radius-md, 10px)',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Explorar produtos
        </Link>
        <Link
          href="/presente"
          style={{
            padding: '12px 24px',
            background: 'transparent',
            color: 'var(--text-primary, #14110F)',
            borderRadius: 'var(--radius-md, 10px)',
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'underline',
            border: '1px solid var(--border, rgba(0,0,0,0.12))',
          }}
        >
          Comprar outro
        </Link>
      </div>
    </main>
  );
}
