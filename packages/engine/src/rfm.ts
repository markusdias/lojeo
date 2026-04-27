export type RfmInput = {
  email: string;
  userId?: string | null;
  orderCount: number;
  totalCents: number;
  lastOrderAt: Date;
  firstOrderAt: Date;
};

export type RfmScore = {
  recency: number;
  frequency: number;
  monetary: number;
};

export type RfmSegment =
  | 'champions'
  | 'loyal'
  | 'at_risk'
  | 'lost'
  | 'new'
  | 'promising'
  | 'other';

export type CustomerProfile = RfmInput & {
  rfm: RfmScore;
  segment: RfmSegment;
  daysSinceLastOrder: number;
};

function quintile(values: number[], value: number): number {
  // Fallback singular: scoreCustomers chamado com 1 input só não tem distribuição.
  // Retorna 3 (mediana) em vez de 1 (sempre min) — evita falso "Lost/New" quando
  // page de detalhe consulta apenas 1 customer.
  if (values.length <= 1) return 3;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = sorted.findIndex(v => v >= value);
  const pct = rank / (sorted.length - 1);
  return Math.min(5, Math.max(1, Math.ceil(pct * 5)));
}

// Recency: lower days = better score (invert quintile).
// Cap superior 5 (sem cap, pct=0 retornava 6 — overflow visível em /clientes/[email]).
function recencyScore(allDays: number[], days: number): number {
  if (allDays.length <= 1) return 3;
  const sorted = [...allDays].sort((a, b) => a - b);
  const rank = sorted.findIndex(v => v >= days);
  const pct = rank / (sorted.length - 1);
  return Math.min(5, Math.max(1, 6 - Math.ceil(pct * 5)));
}

export function segment(rfm: RfmScore): RfmSegment {
  const { recency: r, frequency: f, monetary: m } = rfm;
  if (r >= 4 && f >= 4 && m >= 4) return 'champions';
  if (r >= 3 && f >= 4) return 'loyal';
  if (r <= 2 && f >= 3) return 'at_risk';
  if (r === 1 && f >= 2) return 'lost';
  if (r >= 4 && f === 1) return 'new';
  if (r >= 3 && f === 2) return 'promising';
  return 'other';
}

export function scoreCustomers(inputs: RfmInput[], now = new Date()): CustomerProfile[] {
  if (inputs.length === 0) return [];

  const days = inputs.map(c =>
    Math.floor((now.getTime() - c.lastOrderAt.getTime()) / 86_400_000)
  );
  const frequencies = inputs.map(c => c.orderCount);
  const monetaries = inputs.map(c => c.totalCents);

  return inputs.map((c, i) => {
    const d = days[i] ?? 0;
    const rfm: RfmScore = {
      recency: recencyScore(days, d),
      frequency: quintile(frequencies, c.orderCount),
      monetary: quintile(monetaries, c.totalCents),
    };
    return {
      ...c,
      rfm,
      segment: segment(rfm),
      daysSinceLastOrder: d,
    };
  });
}

export const SEGMENT_LABELS: Record<RfmSegment, string> = {
  champions: 'Campeões',
  loyal: 'Fiéis',
  at_risk: 'Em risco',
  lost: 'Perdidos',
  new: 'Novos',
  promising: 'Promissores',
  other: 'Outros',
};
