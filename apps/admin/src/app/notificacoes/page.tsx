import Link from 'next/link';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { db, sellerNotifications } from '@lojeo/db';
import { auth } from '../../auth';
import { TENANT_ID } from '../../lib/roles';
import { redirect } from 'next/navigation';
import { NotificacoesActions } from './notificacoes-actions';

export const dynamic = 'force-dynamic';

const SEVERITY_DOT: Record<string, string> = {
  info: 'var(--accent, #C9A85C)',
  warning: '#E8A33D',
  critical: '#D14A3A',
};

const SEVERITY_LABEL: Record<string, string> = {
  info: 'Info',
  warning: 'Atenção',
  critical: 'Urgente',
};

function fmtDate(iso: Date): string {
  return iso.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default async function NotificacoesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/login');

  const params = await searchParams;
  const onlyUnread = params.filter === 'unread';

  const baseScope = and(
    eq(sellerNotifications.tenantId, TENANT_ID),
    or(eq(sellerNotifications.userId, userId), isNull(sellerNotifications.userId)),
  );
  const where = onlyUnread ? and(baseScope, isNull(sellerNotifications.readAt)) : baseScope;

  const rows = await db
    .select()
    .from(sellerNotifications)
    .where(where)
    .orderBy(desc(sellerNotifications.createdAt))
    .limit(200);

  const unreadCount = rows.filter((r) => !r.readAt).length;

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 980, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
            Central de avisos
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 600, color: 'var(--fg)' }}>Notificações</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg-secondary)' }}>
            {rows.length} {rows.length === 1 ? 'aviso' : 'avisos'}
            {unreadCount > 0 && ` · ${unreadCount} não ${unreadCount === 1 ? 'lida' : 'lidas'}`}
          </p>
        </div>
        <NotificacoesActions onlyUnread={onlyUnread} unreadCount={unreadCount} />
      </header>

      <nav aria-label="Filtros" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Link
          href="/notificacoes"
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 13,
            border: '1px solid var(--border)',
            background: !onlyUnread ? 'var(--fg)' : 'transparent',
            color: !onlyUnread ? '#fff' : 'var(--fg)',
            textDecoration: 'none',
          }}
        >
          Todas
        </Link>
        <Link
          href="/notificacoes?filter=unread"
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 13,
            border: '1px solid var(--border)',
            background: onlyUnread ? 'var(--fg)' : 'transparent',
            color: onlyUnread ? '#fff' : 'var(--fg)',
            textDecoration: 'none',
          }}
        >
          Não lidas{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Link>
      </nav>

      {rows.length === 0 ? (
        <div style={{
          padding: 48,
          textAlign: 'center',
          border: '1px dashed var(--border)',
          borderRadius: 12,
          color: 'var(--fg-muted)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>
            {onlyUnread ? 'Tudo em dia.' : 'Nenhuma notificação ainda.'}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>
            Pedidos, pagamentos, devoluções e alertas críticos aparecem aqui automaticamente.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((n) => {
            const Inner = (
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: 16,
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  background: n.readAt ? 'transparent' : 'var(--neutral-50, #fafaf8)',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: SEVERITY_DOT[n.severity] ?? SEVERITY_DOT.info,
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                    <strong style={{ fontSize: 14, color: 'var(--fg)' }}>{n.title}</strong>
                    <span style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                      {fmtDate(n.createdAt)}
                    </span>
                  </div>
                  {n.body && (
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
                      {n.body}
                    </p>
                  )}
                  <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: 'var(--fg-muted)' }}>
                    <span>{SEVERITY_LABEL[n.severity] ?? 'Info'}</span>
                    <span>·</span>
                    <span>{n.type}</span>
                    {!n.readAt && (
                      <>
                        <span>·</span>
                        <span style={{ color: 'var(--accent, #C9A85C)', fontWeight: 600 }}>Não lida</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} prefetch={false} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    {Inner}
                  </Link>
                ) : (
                  Inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
