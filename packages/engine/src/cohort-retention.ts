// Cohort retention — agrupa clientes por mês do primeiro pedido,
// calcula taxa de retenção em meses subsequentes.
//
// Helper puro recebe orders (já filtrados por tenant) e retorna matriz cohort.
// Caller faz query no DB e passa orders.

export interface CohortOrder {
  customerEmail: string | null;
  createdAt: Date;
  totalCents?: number;
}

export interface CohortRow {
  /** Mês do primeiro pedido (YYYY-MM). */
  cohortMonth: string;
  /** Clientes únicos que entraram nesse mês. */
  cohortSize: number;
  /** retentionByOffset[N] = clientes que voltaram no mês cohort + N. */
  retentionByOffset: number[];
  /** Taxa % por offset (retentionByOffset[N] / cohortSize * 100). */
  retentionPctByOffset: number[];
}

function ymKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty! - fy!) * 12 + (tm! - fm!);
}

/**
 * Computa cohort retention. monthsBack = quantos meses olhar pra trás
 * a partir de hoje (ex: 12 = último ano).
 */
export function cohortRetention(orders: CohortOrder[], monthsBack: number, now: Date = new Date()): CohortRow[] {
  const startCutoff = new Date(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1);

  // Por cliente: mês do primeiro pedido e meses ativos.
  const customers = new Map<string, { firstMonth: string; activeMonths: Set<string> }>();
  for (const o of orders) {
    if (!o.customerEmail) continue;
    if (o.createdAt.getTime() < startCutoff.getTime()) continue;
    const month = ymKey(o.createdAt);
    const existing = customers.get(o.customerEmail);
    if (!existing) {
      customers.set(o.customerEmail, {
        firstMonth: month,
        activeMonths: new Set([month]),
      });
    } else {
      if (month < existing.firstMonth) existing.firstMonth = month;
      existing.activeMonths.add(month);
    }
  }

  // Agrupa por cohort month.
  const cohorts = new Map<string, { customers: string[]; activeByCustomer: Map<string, Set<string>> }>();
  for (const [email, info] of customers) {
    let cohort = cohorts.get(info.firstMonth);
    if (!cohort) {
      cohort = { customers: [], activeByCustomer: new Map() };
      cohorts.set(info.firstMonth, cohort);
    }
    cohort.customers.push(email);
    cohort.activeByCustomer.set(email, info.activeMonths);
  }

  const sortedCohorts = [...cohorts.keys()].sort();

  // Pra cada cohort, calcula retention por offset 0..maxOffset.
  const todayMonth = ymKey(now);
  const rows: CohortRow[] = sortedCohorts.map((cohortMonth) => {
    const cohort = cohorts.get(cohortMonth)!;
    const cohortSize = cohort.customers.length;
    const maxOffset = monthDiff(cohortMonth, todayMonth);
    const retentionByOffset: number[] = new Array(maxOffset + 1).fill(0);

    for (const email of cohort.customers) {
      const active = cohort.activeByCustomer.get(email)!;
      for (const m of active) {
        const offset = monthDiff(cohortMonth, m);
        if (offset >= 0 && offset <= maxOffset) {
          retentionByOffset[offset]!++;
        }
      }
    }

    const retentionPctByOffset = retentionByOffset.map(
      (v) => (cohortSize > 0 ? Math.round((v / cohortSize) * 1000) / 10 : 0),
    );

    return { cohortMonth, cohortSize, retentionByOffset, retentionPctByOffset };
  });

  return rows;
}
