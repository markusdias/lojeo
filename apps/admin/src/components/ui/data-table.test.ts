import { describe, expect, it } from 'vitest';
import type { DataTableColumn, DataTableProps } from './data-table';

/**
 * Smoke test do contrato de DataTable.
 *
 * Vitest está em ambiente node sem JSX runtime — não importamos o módulo .tsx
 * em runtime. Validamos só os tipos exportados (compilação) + invariantes.
 */
describe('data-table component contract', () => {
  type DemoRow = { id: string; total: number; customer: string };

  it('aceita columns + rows tipadas', () => {
    const columns: DataTableColumn<DemoRow>[] = [
      { key: 'id', label: 'Pedido', mono: true },
      { key: 'customer', label: 'Cliente' },
      { key: 'total', label: 'Total', align: 'right', mono: true, sortable: true },
    ];
    const rows: DemoRow[] = [
      { id: '#1', total: 100, customer: 'Marina' },
      { id: '#2', total: 200, customer: 'Lucas' },
    ];
    const p: DataTableProps<DemoRow> = { columns, rows };
    expect(p.columns).toHaveLength(3);
    expect(p.rows).toHaveLength(2);
  });

  it('column custom render recebe row tipada', () => {
    const col: DataTableColumn<DemoRow> = {
      key: 'total',
      label: 'Total',
      render: (r) => `R$ ${r.total.toFixed(2)}`,
    };
    const rendered = col.render!({ id: '#1', total: 99, customer: 'A' });
    expect(rendered).toBe('R$ 99.00');
  });

  it('sortValue permite ordenar por valor derivado', () => {
    const col: DataTableColumn<DemoRow> = {
      key: 'total',
      label: 'Total',
      sortable: true,
      sortValue: (r) => r.total,
    };
    expect(col.sortValue!({ id: 'x', total: 42, customer: 'a' })).toBe(42);
  });
});
