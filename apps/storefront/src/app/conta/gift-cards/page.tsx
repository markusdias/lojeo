import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db, giftCards } from '@lojeo/db';
import { eq, and, or, desc, isNotNull } from 'drizzle-orm';
import { auth } from '../../../auth';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export const dynamic = 'force-dynamic';

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d: Date | string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  used: 'Resgatado',
  expired: 'Expirado',
};

export default async function ContaGiftCardsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/entrar?next=/conta/gift-cards');
  }

  const email = session.user.email!.toLowerCase();

  const cards = await db
    .select({
      id: giftCards.id,
      code: giftCards.code,
      initialValueCents: giftCards.initialValueCents,
      currentBalanceCents: giftCards.currentBalanceCents,
      expiresAt: giftCards.expiresAt,
      status: giftCards.status,
      recipientEmail: giftCards.recipientEmail,
      buyerUserId: giftCards.buyerUserId,
      createdAt: giftCards.createdAt,
    })
    .from(giftCards)
    .where(
      and(
        eq(giftCards.tenantId, TENANT_ID),
        or(
          eq(giftCards.recipientEmail, email),
          isNotNull(giftCards.buyerUserId),
        ),
      ),
    )
    .orderBy(desc(giftCards.createdAt))
    .limit(50);

  const totalActive = cards.filter(c => c.status === 'active' && c.currentBalanceCents > 0).reduce((sum, c) => sum + c.currentBalanceCents, 0);

  return (
    <main className="section" style={{ paddingTop: 60 }}>
      <p className="eyebrow" style={{ marginBottom: 8, color: 'var(--text-muted)' }}>
        <Link href="/conta" style={{ color: 'inherit', textDecoration: 'none' }}>Conta</Link>
        <span style={{ margin: '0 6px' }}>·</span>
        <span>Gift cards</span>
      </p>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 400, margin: '0 0 8px' }}>
        Seus gift cards
      </h1>

      {totalActive > 0 ? (
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 32 }}>
          Saldo total ativo: <strong style={{ color: 'var(--text-primary)' }}>{fmt(totalActive)}</strong>
        </p>
      ) : (
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 32 }}>
          Você ainda não tem gift cards. <Link href="/gift-cards" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Comprar um</Link> ou aguarde devoluções aprovadas como crédito.
        </p>
      )}

      {cards.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', borderTop: '1px solid var(--divider)' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Sem gift cards no histórico. <Link href="/gift-cards" style={{ color: 'var(--accent)', borderBottom: '1px solid currentColor' }}>Comprar um</Link>.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {cards.map(card => {
            const isActive = card.status === 'active' && card.currentBalanceCents > 0;
            const isExpired = card.expiresAt && new Date(card.expiresAt) < new Date();
            const computedStatus = isExpired ? 'expired' : (card.currentBalanceCents === 0 ? 'used' : card.status);
            const statusColor = computedStatus === 'active' ? 'var(--success)' : computedStatus === 'expired' ? '#B91C1C' : 'var(--text-muted)';
            return (
              <article
                key={card.id}
                style={{
                  border: '1px solid var(--divider)',
                  borderRadius: 8,
                  padding: 24,
                  background: isActive ? 'var(--surface-warm)' : 'var(--surface-sunken)',
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div>
                    <p className="mono" style={{ fontSize: 18, fontWeight: 500, marginBottom: 4, letterSpacing: '0.04em' }}>
                      {card.code}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Emitido em {fmtDate(card.createdAt)}
                      {card.expiresAt && <> · expira em {fmtDate(card.expiresAt)}</>}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: statusColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: `1px solid ${statusColor}`,
                  }}>
                    {STATUS_LABELS[computedStatus] ?? computedStatus}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 32, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
                      Saldo disponível
                    </p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400 }}>
                      {fmt(card.currentBalanceCents)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
                      Valor original
                    </p>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                      {fmt(card.initialValueCents)}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--divider)' }}>
                    Use o código <strong className="mono" style={{ color: 'var(--text-primary)' }}>{card.code}</strong> no checkout para abater do total.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
