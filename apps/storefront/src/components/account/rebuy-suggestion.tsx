interface OrderLike {
  id: string;
  status: string;
  createdAt: string | Date;
  deliveredAt: string | Date | null;
}

interface ItemLike {
  orderId: string;
  productName: string;
  sku: string | null;
  variantId: string | null;
}

interface ProductLookupRow {
  productName: string;
  warrantyMonths: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sugere recompra com base em ciclo de consumo simples:
 * - Para joias, ciclo padrão = warrantyMonths * 0.85 (esperando comprar antes da garantia expirar)
 * - "Está na hora" se distância da última compra >= ciclo - 30d
 */
export function RebuySuggestion({
  orders, items, products,
}: {
  orders: OrderLike[];
  items: ItemLike[];
  products: ProductLookupRow[];
}) {
  const now = new Date();
  // Agrupar items por nome de produto, escolhendo o mais antigo (primeira compra)
  const earliestByProduct = new Map<string, { date: Date; orderId: string }>();
  for (const it of items) {
    const order = orders.find(o => o.id === it.orderId);
    if (!order || order.status === 'cancelled') continue;
    const date = new Date(order.deliveredAt ?? order.createdAt);
    const existing = earliestByProduct.get(it.productName);
    if (!existing || date < existing.date) {
      earliestByProduct.set(it.productName, { date, orderId: it.orderId });
    }
  }

  const suggestions: Array<{
    productName: string;
    daysSinceFirst: number;
    cycleDays: number;
    daysUntilDue: number;
    status: 'due_now' | 'soon' | 'far';
  }> = [];

  for (const [productName, { date }] of earliestByProduct) {
    const product = products.find(p => p.productName === productName);
    const warrantyMonths = product?.warrantyMonths ?? 12;
    const cycleDays = Math.round(warrantyMonths * 30 * 0.85);
    const daysSince = Math.floor((now.getTime() - date.getTime()) / DAY_MS);
    const daysUntilDue = cycleDays - daysSince;

    let status: 'due_now' | 'soon' | 'far';
    if (daysUntilDue <= 0) status = 'due_now';
    else if (daysUntilDue <= 60) status = 'soon';
    else continue; // não sugerir produtos com ciclo longe

    suggestions.push({ productName, daysSinceFirst: daysSince, cycleDays, daysUntilDue, status });
  }

  if (suggestions.length === 0) return null;

  return (
    <section style={{ marginTop: 48, padding: 24, background: 'var(--surface)', border: '1px solid var(--divider)', borderRadius: 8 }}>
      <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
        Sugestão pra você
      </p>
      <h2 style={{ fontSize: 20, fontWeight: 400, fontFamily: 'var(--font-display)', marginBottom: 16 }}>
        Está na hora de repor?
      </h2>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 0, listStyle: 'none' }}>
        {suggestions.slice(0, 3).map(s => (
          <li key={s.productName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: 'var(--bg)', borderRadius: 4 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{s.productName}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {s.status === 'due_now'
                  ? `Comprado há ${s.daysSinceFirst} dias — ciclo recomendado de ${s.cycleDays} dias.`
                  : `Próxima recompra sugerida em ${s.daysUntilDue} dias.`}
              </p>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
              background: s.status === 'due_now' ? '#FFF7ED' : '#F0FDF4',
              color: s.status === 'due_now' ? '#92400E' : '#166534',
            }}>
              {s.status === 'due_now' ? 'Hora de repor' : 'Em breve'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
