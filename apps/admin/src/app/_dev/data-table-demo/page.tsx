'use client';

/**
 * Demo de DataTable — referência viva do componente.
 *
 * Acessar em /_dev/data-table-demo. Não exposto na sidebar.
 * Spec: docs/design-system/project/preview/components-table.html
 */

import { DataTable } from '../../../components/ui/data-table';
import type { DataTableColumn } from '../../../components/ui/data-table';

interface DemoOrder {
  id: string;
  orderNumber: string;
  customer: string;
  status: 'pago' | 'envio' | 'transito';
  totalCents: number;
}

const STATUS_BADGE: Record<DemoOrder['status'], { label: string; className: string }> = {
  pago:     { label: 'Pago',             className: 'lj-badge lj-badge-success' },
  envio:    { label: 'Aguardando envio', className: 'lj-badge lj-badge-warning' },
  transito: { label: 'Em trânsito',      className: 'lj-badge lj-badge-info' },
};

const ROWS: DemoOrder[] = [
  { id: '1', orderNumber: '#PED-00184', customer: 'Marina Castro',  status: 'pago',     totalCents: 249000 },
  { id: '2', orderNumber: '#PED-00183', customer: 'Lucas Andrade',  status: 'envio',    totalCents: 48000  },
  { id: '3', orderNumber: '#PED-00182', customer: 'Beatriz Lima',   status: 'transito', totalCents: 118090 },
];

function fmtBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const COLUMNS: DataTableColumn<DemoOrder>[] = [
  { key: 'orderNumber', label: 'Pedido', mono: true, sortable: true },
  { key: 'customer',    label: 'Cliente', sortable: true },
  {
    key: 'status',
    label: 'Status',
    render: (r) => {
      const b = STATUS_BADGE[r.status];
      return <span className={b.className}>{b.label}</span>;
    },
  },
  {
    key: 'total',
    label: 'Total',
    align: 'right',
    mono: true,
    sortable: true,
    sortValue: (r) => r.totalCents,
    render: (r) => fmtBrl(r.totalCents),
  },
];

export default function DataTableDemoPage() {
  return (
    <main style={{ padding: 'var(--space-8)', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-2)' }}>
          DataTable demo
        </h1>
        <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>
          Referência viva do componente. Clique nos cabeçalhos com <code className="mono">sortable: true</code> pra alternar asc → desc → off.
        </p>
      </header>

      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(r) => r.id}
        emptyState={<p>Nenhum pedido.</p>}
      />

      <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-medium)', marginTop: 'var(--space-8)', marginBottom: 'var(--space-3)' }}>
        Empty state
      </h2>
      <DataTable<DemoOrder>
        columns={COLUMNS}
        rows={[]}
        emptyState={<p>Nenhum pedido ainda — sua loja vai começar a registrar tudo aqui.</p>}
      />
    </main>
  );
}
