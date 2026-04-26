import { auth } from '../../../auth';
import { db, customerAddresses } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export default async function EnderecosPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const tid = tenantId();

  const addresses = userId
    ? await db.select().from(customerAddresses).where(
        and(eq(customerAddresses.tenantId, tid), eq(customerAddresses.userId, userId))
      )
    : [];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 32 }}>Endereços</h1>

      {addresses.length === 0 && (
        <div style={{ padding: '32px 0' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Nenhum endereço salvo ainda.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Seus endereços serão salvos automaticamente ao finalizar um pedido.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {addresses.map(addr => (
          <div key={addr.id} style={{ border: '1px solid var(--divider)', borderRadius: 8, padding: '16px 20px' }}>
            {addr.label && <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{addr.label}</p>}
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{addr.recipientName}</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {addr.street}, {addr.number}{addr.complement ? `, ${addr.complement}` : ''}<br />
              {addr.neighborhood && `${addr.neighborhood}, `}{addr.city} — {addr.state}<br />
              CEP {addr.postalCode}
            </p>
            {addr.phone && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{addr.phone}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
