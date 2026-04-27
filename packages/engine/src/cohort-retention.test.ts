import { describe, it, expect } from 'vitest';
import { cohortRetention, type CohortOrder } from './cohort-retention';

describe('cohortRetention', () => {
  const now = new Date('2026-04-27T00:00:00Z');

  it('vazio retorna []', () => {
    expect(cohortRetention([], 12, now)).toEqual([]);
  });

  it('cohort 1 cliente 1 mês', () => {
    const orders: CohortOrder[] = [
      { customerEmail: 'a@x.com', createdAt: new Date('2026-04-15T00:00:00Z') },
    ];
    const r = cohortRetention(orders, 12, now);
    expect(r).toHaveLength(1);
    expect(r[0]!.cohortMonth).toBe('2026-04');
    expect(r[0]!.cohortSize).toBe(1);
    expect(r[0]!.retentionByOffset[0]).toBe(1);
    expect(r[0]!.retentionPctByOffset[0]).toBe(100);
  });

  it('mesmo cliente 2 pedidos em meses diferentes', () => {
    const orders: CohortOrder[] = [
      { customerEmail: 'a@x.com', createdAt: new Date('2026-01-15T00:00:00Z') },
      { customerEmail: 'a@x.com', createdAt: new Date('2026-03-10T00:00:00Z') },
    ];
    const r = cohortRetention(orders, 12, now);
    expect(r).toHaveLength(1);
    expect(r[0]!.cohortMonth).toBe('2026-01');
    expect(r[0]!.retentionByOffset[0]).toBe(1);
    expect(r[0]!.retentionByOffset[2]).toBe(1); // janeiro+2 = março
  });

  it('2 cohorts distintos', () => {
    const orders: CohortOrder[] = [
      { customerEmail: 'a@x.com', createdAt: new Date('2026-01-10T00:00:00Z') },
      { customerEmail: 'b@x.com', createdAt: new Date('2026-02-10T00:00:00Z') },
      { customerEmail: 'b@x.com', createdAt: new Date('2026-04-10T00:00:00Z') },
    ];
    const r = cohortRetention(orders, 12, now);
    expect(r).toHaveLength(2);
    const cohortFeb = r.find((c) => c.cohortMonth === '2026-02');
    expect(cohortFeb?.cohortSize).toBe(1);
    expect(cohortFeb?.retentionByOffset[0]).toBe(1);
    expect(cohortFeb?.retentionByOffset[2]).toBe(1);
  });

  it('cohort com 50% retention mês seguinte', () => {
    const orders: CohortOrder[] = [
      { customerEmail: 'a@x.com', createdAt: new Date('2026-03-01T00:00:00Z') },
      { customerEmail: 'b@x.com', createdAt: new Date('2026-03-15T00:00:00Z') },
      { customerEmail: 'a@x.com', createdAt: new Date('2026-04-10T00:00:00Z') }, // a volta
    ];
    const r = cohortRetention(orders, 12, now);
    const c = r.find((x) => x.cohortMonth === '2026-03');
    expect(c?.cohortSize).toBe(2);
    expect(c?.retentionPctByOffset[0]).toBe(100);
    expect(c?.retentionPctByOffset[1]).toBe(50);
  });

  it('orders fora do range monthsBack são ignorados', () => {
    const orders: CohortOrder[] = [
      { customerEmail: 'a@x.com', createdAt: new Date('2025-01-01T00:00:00Z') }, // > 12 meses atrás
      { customerEmail: 'b@x.com', createdAt: new Date('2026-04-01T00:00:00Z') },
    ];
    const r = cohortRetention(orders, 12, now);
    expect(r).toHaveLength(1);
    expect(r[0]!.cohortMonth).toBe('2026-04');
  });

  it('orders sem customerEmail ignorados', () => {
    const orders: CohortOrder[] = [
      { customerEmail: null, createdAt: new Date('2026-04-10T00:00:00Z') },
    ];
    expect(cohortRetention(orders, 12, now)).toEqual([]);
  });
});
