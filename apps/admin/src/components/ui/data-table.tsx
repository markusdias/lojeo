'use client';

/**
 * DataTable — tabela genérica reutilizável com sort client-side opcional.
 *
 * Spec base: docs/design-system/project/preview/components-table.html
 * Tokens: var(--bg-subtle) thead, border-bottom rows, padding tokens, .mono em colunas numéricas.
 *
 * Uso:
 *   <DataTable
 *     columns={[
 *       { key: 'orderNumber', label: 'Pedido', mono: true },
 *       { key: 'customer', label: 'Cliente' },
 *       { key: 'total', label: 'Total', align: 'right', mono: true, sortable: true },
 *     ]}
 *     rows={orders}
 *     emptyState={<p>Sem pedidos.</p>}
 *   />
 */

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type CellAlign = 'left' | 'right' | 'center';

export interface DataTableColumn<Row> {
  /** chave da coluna — usada como key React e default accessor da row[key] */
  key: string;
  /** texto exibido no thead */
  label: string;
  /** alinhamento do cell e header (default: left) */
  align?: CellAlign;
  /** renderiza com font mono + tabular-nums (use pra colunas numéricas / IDs) */
  mono?: boolean;
  /** se true habilita ordenação por essa coluna */
  sortable?: boolean;
  /** customiza render da célula. Default: String(row[key]) */
  render?: (row: Row) => ReactNode;
  /** customiza valor usado para sort. Default: row[key] */
  sortValue?: (row: Row) => string | number | Date;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  /** mostrado quando rows.length === 0 (default: texto neutro). */
  emptyState?: ReactNode;
  /** chave única para React. Default: index. */
  rowKey?: (row: Row, index: number) => string;
  /** className passada no wrapper externo (lj-card) */
  className?: string;
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

function defaultAccessor<Row>(row: Row, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
}

export function DataTable<Row>({
  columns,
  rows,
  emptyState,
  rowKey,
  className,
}: DataTableProps<Row>) {
  const [sort, setSort] = useState<SortState>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find(c => c.key === sort.key);
    if (!col) return rows;
    const accessor = col.sortValue ?? ((r: Row) => defaultAccessor(r, sort.key) as string | number | Date);
    const sorted = [...rows].sort((a, b) => compareValues(accessor(a), accessor(b)));
    return sort.dir === 'desc' ? sorted.reverse() : sorted;
  }, [rows, sort, columns]);

  const toggleSort = (key: string) => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  if (rows.length === 0 && emptyState !== undefined) {
    return (
      <div className={`lj-card ${className ?? ''}`} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--fg-secondary)' }}>
        {emptyState}
      </div>
    );
  }

  return (
    <div className={`lj-card ${className ?? ''}`} style={{ overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
            {columns.map(col => {
              const align = col.align ?? 'left';
              const active = sort?.key === col.key;
              const arrow = active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
              return (
                <th
                  key={col.key}
                  scope="col"
                  style={{
                    textAlign: align,
                    padding: 'var(--space-3) var(--space-4)',
                    fontWeight: 'var(--w-medium)',
                    color: 'var(--fg-secondary)',
                    fontSize: 'var(--text-caption)',
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--track-wide, 0.04em)',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : col.sortable ? 'none' : undefined}
                >
                  {col.label}{arrow}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr
              key={rowKey ? rowKey(row, i) : i}
              style={{ borderBottom: i === sortedRows.length - 1 ? 'none' : '1px solid var(--border)' }}
            >
              {columns.map(col => {
                const align = col.align ?? 'left';
                const content = col.render ? col.render(row) : String(defaultAccessor(row, col.key) ?? '');
                return (
                  <td
                    key={col.key}
                    className={col.mono ? 'numeric' : undefined}
                    style={{
                      textAlign: align,
                      padding: 'var(--space-3) var(--space-4)',
                      fontFamily: col.mono ? 'var(--font-mono)' : undefined,
                      fontVariantNumeric: col.mono ? 'tabular-nums' : undefined,
                    }}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
