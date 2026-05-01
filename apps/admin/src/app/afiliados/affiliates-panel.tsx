'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface AffiliateRow {
  id: string;
  affiliateName: string;
  affiliateEmail: string | null;
  code: string;
  commissionBps: number;
  cookieDays: number;
  maxUses: number | null;
  expiresAt: string | null;
  tag: string | null;
  clicks: number;
  conversions: number;
  payoutCents: number;
  pendingCents: number;
  active: boolean;
  archivedAt: string | null;
  lastClickAt: string | null;
  lastConversionAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface Meta {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  sort: string;
  dir: string;
  status: string;
  q: string;
  tag: string | null;
  tagFacets: Array<{ tag: string | null; n: number }>;
}

interface Props {
  initial: AffiliateRow[];
  initialMeta: Meta;
  storefrontOrigin: string;
}

const TAG_OPTIONS = [
  { value: 'influencer', label: 'Influenciador' },
  { value: 'ambassador', label: 'Embaixador' },
  { value: 'partner', label: 'Parceiro' },
  { value: 'vip', label: 'VIP' },
  { value: 'staff', label: 'Staff/interno' },
  { value: 'campaign', label: 'Campanha' },
  { value: 'outro', label: 'Outro' },
];

const COMMISSION_PRESETS = [5, 10, 15, 20, 25, 30, 40, 50];
const COOKIE_PRESETS = [
  { value: 7, label: '7 dias' },
  { value: 15, label: '15 dias' },
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' },
  { value: 120, label: '120 dias' },
];

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: 'active', label: 'Ativos' },
  { value: 'paused', label: 'Pausados' },
  { value: 'archived', label: 'Arquivados' },
  { value: 'all', label: 'Todos' },
];

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'created', label: 'Mais recentes' },
  { value: 'name', label: 'Nome (A-Z)' },
  { value: 'conversions', label: 'Mais conversões' },
  { value: 'pending', label: 'Maior pendente' },
  { value: 'paid', label: 'Maior pago' },
  { value: 'clicks', label: 'Mais cliques' },
  { value: 'lastClick', label: 'Click recente' },
  { value: 'lastConversion', label: 'Conversão recente' },
];

const SORT_DEFAULT_DIR: Record<string, 'asc' | 'desc'> = {
  created: 'desc',
  name: 'asc',
  conversions: 'desc',
  pending: 'desc',
  paid: 'desc',
  clicks: 'desc',
  lastClick: 'desc',
  lastConversion: 'desc',
};

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function bpsToPercent(bps: number): number {
  return Math.round((bps / 100) * 10) / 10;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return '—';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} mês`;
  return `${Math.floor(mo / 12)} ano`;
}

function statusOf(r: AffiliateRow): 'active' | 'paused' | 'archived' {
  if (r.archivedAt) return 'archived';
  if (!r.active) return 'paused';
  return 'active';
}

const STATUS_BADGE: Record<'active' | 'paused' | 'archived', { label: string; bg: string; fg: string }> = {
  active: { label: 'Ativo', bg: 'var(--success-soft)', fg: 'var(--success)' },
  paused: { label: 'Pausado', bg: 'var(--warning-soft)', fg: 'var(--warning)' },
  archived: { label: 'Arquivado', bg: 'var(--neutral-100)', fg: 'var(--fg-muted)' },
};

interface FormState {
  affiliateName: string;
  affiliateEmail: string;
  code: string;
  commissionPercent: string;
  customPercent: boolean;
  cookieDays: number;
  maxUsesEnabled: boolean;
  maxUses: string;
  expiresAt: string;
  tag: string;
  notes: string;
  // Modelo 1 — cupom dedicado amarrado ao afiliado.
  // Quando ligado, cliente que digita o código no checkout ganha desconto E
  // a venda é atribuída automaticamente ao afiliado (sem cookie).
  generateCoupon: boolean;
  couponDiscountPercent: string;
}

const EMPTY_FORM: FormState = {
  affiliateName: '',
  affiliateEmail: '',
  code: '',
  commissionPercent: '10',
  customPercent: false,
  cookieDays: 30,
  maxUsesEnabled: false,
  maxUses: '',
  expiresAt: '',
  tag: '',
  notes: '',
  generateCoupon: false,
  couponDiscountPercent: '10',
};

export function AffiliatesPanel({ initial, initialMeta, storefrontOrigin }: Props) {
  const [rows, setRows] = useState<AffiliateRow[]>(initial);
  const [meta, setMeta] = useState<Meta>(initialMeta);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Filtros — controlled
  const [search, setSearch] = useState(initialMeta.q);
  const [status, setStatus] = useState(initialMeta.status);
  const [tag, setTag] = useState<string>(initialMeta.tag ?? '');
  const [sort, setSort] = useState(initialMeta.sort);
  const [dir, setDir] = useState(initialMeta.dir);
  const [page, setPage] = useState(initialMeta.page);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const refetch = useCallback(async (overrides?: Partial<{ q: string; status: string; tag: string; sort: string; dir: string; page: number }>) => {
    setLoading(true);
    const params = new URLSearchParams();
    const q = overrides?.q ?? search;
    const st = overrides?.status ?? status;
    const tg = overrides?.tag ?? tag;
    const so = overrides?.sort ?? sort;
    const di = overrides?.dir ?? dir;
    const pg = overrides?.page ?? page;
    if (q) params.set('q', q);
    if (st) params.set('status', st);
    if (tg) params.set('tag', tg);
    if (so) params.set('sort', so);
    if (di) params.set('dir', di);
    params.set('page', String(pg));
    params.set('pageSize', String(meta.pageSize));
    try {
      const res = await fetch(`/api/affiliates?${params.toString()}`);
      const data = (await res.json()) as { affiliates: AffiliateRow[]; meta: Meta };
      setRows(data.affiliates);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, [search, status, tag, sort, dir, page, meta.pageSize]);

  // Search debounce
  function onSearchChange(v: string) {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      void refetch({ q: v, page: 1 });
    }, 300);
  }

  function applyStatus(s: string) {
    setStatus(s);
    setPage(1);
    void refetch({ status: s, page: 1 });
  }

  function applyTag(t: string) {
    setTag(t);
    setPage(1);
    void refetch({ tag: t, page: 1 });
  }

  function applySort(value: string) {
    const newDir = SORT_DEFAULT_DIR[value] ?? 'desc';
    setSort(value);
    setDir(newDir);
    setPage(1);
    void refetch({ sort: value, dir: newDir, page: 1 });
  }

  function goPage(p: number) {
    if (p < 1 || p > meta.pages) return;
    setPage(p);
    void refetch({ page: p });
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(r: AffiliateRow) {
    setEditingId(r.id);
    const pct = bpsToPercent(r.commissionBps);
    setForm({
      affiliateName: r.affiliateName,
      affiliateEmail: r.affiliateEmail ?? '',
      code: r.code,
      commissionPercent: String(pct),
      customPercent: !COMMISSION_PRESETS.includes(pct),
      cookieDays: r.cookieDays ?? 30,
      maxUsesEnabled: r.maxUses != null,
      maxUses: r.maxUses != null ? String(r.maxUses) : '',
      expiresAt: r.expiresAt ? r.expiresAt.slice(0, 10) : '',
      tag: r.tag ?? '',
      notes: r.notes ?? '',
      // Edição: cupom já criado (ou não); toggle não aparece em edit. Default safe values.
      generateCoupon: false,
      couponDiscountPercent: '10',
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const pct = parseFloat(form.commissionPercent.replace(',', '.'));
    if (!isFinite(pct) || pct < 0 || pct > 100) {
      setFormError('Comissão deve ser entre 0% e 100%');
      setSubmitting(false);
      return;
    }
    const commissionBps = Math.round(pct * 100);

    let maxUses: number | null = null;
    if (form.maxUsesEnabled) {
      const n = parseInt(form.maxUses, 10);
      if (!isFinite(n) || n <= 0) {
        setFormError('Limite de usos deve ser número positivo');
        setSubmitting(false);
        return;
      }
      maxUses = n;
    }

    let couponDiscount: { type: 'percent'; value: number; minOrderCents: number } | null = null;
    if (form.generateCoupon && !editingId) {
      const couponPct = parseFloat(form.couponDiscountPercent.replace(',', '.'));
      if (!isFinite(couponPct) || couponPct < 1 || couponPct > 100) {
        setFormError('Desconto do cupom deve ser entre 1% e 100%');
        setSubmitting(false);
        return;
      }
      couponDiscount = { type: 'percent', value: Math.round(couponPct), minOrderCents: 0 };
    }

    const payload = {
      affiliateName: form.affiliateName.trim(),
      affiliateEmail: form.affiliateEmail.trim() || null,
      code: form.code.toUpperCase(),
      commissionBps,
      cookieDays: form.cookieDays,
      maxUses,
      expiresAt: form.expiresAt ? new Date(form.expiresAt + 'T23:59:59').toISOString() : null,
      tag: form.tag || null,
      notes: form.notes.trim() || null,
      ...(couponDiscount ? { couponDiscount } : {}),
    };

    try {
      const url = editingId ? `/api/affiliates/${editingId}` : '/api/affiliates';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { affiliate?: AffiliateRow; error?: string };
      if (!res.ok) {
        if (data.error === 'code_already_exists') {
          setFormError('Já existe um afiliado com este código');
        } else if (data.error === 'coupon_code_already_exists') {
          setFormError('Já existe um cupom com este código. Escolha outro código de afiliado ou desligue "cupom dedicado".');
        } else if (data.error === 'validation_error') {
          setFormError('Preencha os campos obrigatórios corretamente');
        } else {
          setFormError(data.error ?? `HTTP ${res.status}`);
        }
        return;
      }
      closeForm();
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'erro');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(row: AffiliateRow) {
    const archive = !row.archivedAt;
    const label = archive ? 'arquivar' : 'desarquivar';
    if (!confirm(`Deseja ${label} ${row.affiliateName}?`)) return;
    const res = await fetch(`/api/affiliates/${row.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ archived: archive }),
    });
    if (res.ok) await refetch();
  }

  async function handleTogglePause(row: AffiliateRow) {
    if (row.archivedAt) return;
    const res = await fetch(`/api/affiliates/${row.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: !row.active }),
    });
    if (res.ok) await refetch();
  }

  async function handlePayout(row: AffiliateRow) {
    if (row.pendingCents <= 0) return;
    if (!confirm(`Marcar ${fmtBRL(row.pendingCents)} como pago para ${row.affiliateName}?`)) return;
    const res = await fetch(`/api/affiliates/${row.id}/payout`, { method: 'POST' });
    if (res.ok) await refetch();
  }

  function copyLink(code: string) {
    const url = `${storefrontOrigin}/r/${code}`;
    navigator.clipboard?.writeText(url).catch(() => {
      // fallback silencioso
    });
  }

  // Resumo cards top
  const summary = useMemo(() => {
    const totalActive = rows.filter((r) => statusOf(r) === 'active').length;
    const totalPending = rows.reduce((acc, r) => acc + r.pendingCents, 0);
    const totalConversions = rows.reduce((acc, r) => acc + r.conversions, 0);
    const totalClicks = rows.reduce((acc, r) => acc + r.clicks, 0);
    return { totalActive, totalPending, totalConversions, totalClicks };
  }, [rows]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        <SummaryCard label="Nesta página" value={String(rows.length)} hint={`de ${meta.total} ${meta.status === 'all' ? '' : `· filtro: ${STATUS_TABS.find((t) => t.value === meta.status)?.label ?? meta.status}`}`} />
        <SummaryCard label="Comissão pendente" value={fmtBRL(summary.totalPending)} hint="soma da página" highlight={summary.totalPending > 0} />
        <SummaryCard label="Conversões" value={String(summary.totalConversions)} hint={`${summary.totalClicks} cliques`} />
        <SummaryCard label="Ativos" value={String(summary.totalActive)} hint="hoje" />
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 240 }}>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar nome, email ou código…"
            aria-label="Buscar afiliado"
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              fontSize: 'var(--text-body-s)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg)',
              color: 'var(--fg)',
              outline: 'none',
            }}
          />
        </div>

        <div role="tablist" aria-label="Status" style={{ display: 'inline-flex', gap: 2, background: 'var(--neutral-50)', padding: 2, borderRadius: 'var(--radius-md)' }}>
          {STATUS_TABS.map((t) => {
            const active = status === t.value;
            return (
              <button
                key={t.value}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => applyStatus(t.value)}
                style={{
                  padding: 'var(--space-1) var(--space-3)',
                  fontSize: 'var(--text-caption)',
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--fg)' : 'var(--fg-secondary)',
                  background: active ? 'var(--bg-elevated)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  boxShadow: active ? 'var(--shadow-xs)' : 'none',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <select
          value={tag}
          onChange={(e) => applyTag(e.target.value)}
          aria-label="Filtrar por tag"
          style={{
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--text-caption)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg)',
            color: 'var(--fg)',
            cursor: 'pointer',
          }}
        >
          <option value="">Todas as tags</option>
          {TAG_OPTIONS.map((o) => {
            const facet = meta.tagFacets.find((f) => f.tag === o.value);
            return (
              <option key={o.value} value={o.value}>
                {o.label}{facet ? ` (${facet.n})` : ''}
              </option>
            );
          })}
        </select>

        <select
          value={sort}
          onChange={(e) => applySort(e.target.value)}
          aria-label="Ordenar"
          style={{
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--text-caption)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg)',
            color: 'var(--fg)',
            cursor: 'pointer',
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={openCreate}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-body-s)',
            fontWeight: 600,
            color: 'var(--fg-on-accent)',
            background: 'var(--neutral-900)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          + Novo afiliado
        </button>
      </div>

      {/* Form modal-style inline */}
      {showForm && (
        <FormCard
          form={form}
          setForm={setForm}
          editing={!!editingId}
          submitting={submitting}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      {/* Table */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 120ms',
        }}
      >
        {rows.length === 0 ? (
          <EmptyState onCreate={openCreate} hasFilter={!!(search || status !== 'active' || tag)} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: 'var(--text-body-s)', tableLayout: 'auto' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--bg-subtle)' }}>
                  <Th>Afiliado</Th>
                  <Th>Código</Th>
                  <Th align="right">%</Th>
                  <Th align="right">Performance</Th>
                  <Th>Validade</Th>
                  <Th align="right">Comissão</Th>
                  <Th align="center">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = statusOf(r);
                  const badge = STATUS_BADGE[st];
                  const tagLabel = TAG_OPTIONS.find((o) => o.value === r.tag)?.label;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', opacity: st === 'archived' ? 0.6 : 1 }}>
                      <Td>
                        <div style={{ fontWeight: 500, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span>{r.affiliateName}</span>
                          <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 500, background: badge.bg, color: badge.fg }}>
                            {badge.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          {r.affiliateEmail && <span>{r.affiliateEmail}</span>}
                          {tagLabel && <span>· {tagLabel}</span>}
                        </div>
                      </Td>
                      <Td mono>
                        <button
                          type="button"
                          onClick={() => copyLink(r.code)}
                          title={`${storefrontOrigin}/r/${r.code} (clique pra copiar)`}
                          style={{
                            background: 'var(--neutral-50)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '2px var(--space-2)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            cursor: 'pointer',
                            color: 'var(--fg)',
                          }}
                        >
                          {r.code}
                        </button>
                      </Td>
                      <Td align="right">{bpsToPercent(r.commissionBps).toFixed(1)}%</Td>
                      <Td align="right" mono>
                        <div style={{ fontSize: 'var(--text-body-s)' }}>
                          {r.conversions}
                          {r.maxUses ? <span style={{ color: 'var(--fg-muted)' }}>/{r.maxUses}</span> : null}
                          <span style={{ color: 'var(--fg-muted)' }}> conv</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                          {r.clicks} click{r.clicks === 1 ? '' : 's'}
                        </div>
                      </Td>
                      <Td>
                        <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>{r.cookieDays}d cookie</div>
                        {r.expiresAt && (
                          <div style={{ fontSize: 11, color: new Date(r.expiresAt) < new Date() ? 'var(--error)' : 'var(--fg-muted)' }}>
                            até {new Date(r.expiresAt).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                          {r.lastConversionAt ? `conv ${fmtRelative(r.lastConversionAt)}` : (r.lastClickAt ? `click ${fmtRelative(r.lastClickAt)}` : 'sem atividade')}
                        </div>
                      </Td>
                      <Td align="right" mono>
                        <div style={{ color: r.pendingCents > 0 ? 'var(--accent)' : 'var(--fg)', fontWeight: r.pendingCents > 0 ? 600 : 400 }}>
                          {fmtBRL(r.pendingCents)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                          {fmtBRL(r.payoutCents)} pagos
                        </div>
                      </Td>
                      <Td align="center">
                        <RowActions
                          row={r}
                          onEdit={() => openEdit(r)}
                          onTogglePause={() => handleTogglePause(r)}
                          onArchive={() => handleArchive(r)}
                          onPayout={() => handlePayout(r)}
                          onCopy={() => copyLink(r.code)}
                        />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-1)' }}>
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>
            Página {meta.page} de {meta.pages} · {meta.total} resultado{meta.total === 1 ? '' : 's'}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <PageBtn disabled={meta.page <= 1} onClick={() => goPage(meta.page - 1)}>Anterior</PageBtn>
            <PageBtn disabled={meta.page >= meta.pages} onClick={() => goPage(meta.page + 1)}>Próxima</PageBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, hint, highlight }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <div style={{
      padding: 'var(--space-4)',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1)',
    }}>
      <div style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 'var(--text-h3)', fontWeight: 600, color: highlight ? 'var(--accent)' : 'var(--fg)', letterSpacing: 'var(--track-tight)' }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{hint}</div>}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th style={{
      textAlign: align ?? 'left',
      padding: 'var(--space-3)',
      fontWeight: 500,
      fontSize: 'var(--text-caption)',
      color: 'var(--fg-secondary)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--track-wide)',
    }}>
      {children}
    </th>
  );
}

function Td({ children, align, mono }: { children: React.ReactNode; align?: 'left' | 'right' | 'center'; mono?: boolean }) {
  return (
    <td style={{
      textAlign: align ?? 'left',
      padding: 'var(--space-3)',
      verticalAlign: 'middle',
      fontFamily: mono ? 'var(--font-mono)' : 'inherit',
      fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
    }}>
      {children}
    </td>
  );
}

function PageBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: 'var(--space-1) var(--space-3)',
        fontSize: 'var(--text-caption)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        background: disabled ? 'var(--neutral-50)' : 'var(--bg-elevated)',
        color: disabled ? 'var(--fg-muted)' : 'var(--fg)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function RowActions({ row, onEdit, onTogglePause, onArchive, onPayout, onCopy }: {
  row: AffiliateRow;
  onEdit: () => void;
  onTogglePause: () => void;
  onArchive: () => void;
  onPayout: () => void;
  onCopy: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function recalc() {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      // Posiciona menu alinhado à direita do botão, abaixo dele.
      // Usa documentElement.clientWidth (exclui scrollbar) — bate com getBoundingClientRect.
      const refWidth = document.documentElement.clientWidth;
      setPos({ top: rect.bottom + 4, right: refWidth - rect.right });
    }
    recalc();
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const archived = !!row.archivedAt;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ações"
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          padding: '4px 10px',
          fontSize: 14,
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          color: 'var(--fg)',
        }}
      >
        ⋯
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            minWidth: 200,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 1000,
            padding: 'var(--space-1)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <MenuItem onClick={() => { setOpen(false); onCopy(); }}>Copiar link</MenuItem>
          {!archived && <MenuItem onClick={() => { setOpen(false); onEdit(); }}>Editar</MenuItem>}
          {!archived && (
            <MenuItem onClick={() => { setOpen(false); onTogglePause(); }}>
              {row.active ? 'Pausar' : 'Reativar'}
            </MenuItem>
          )}
          {row.pendingCents > 0 && !archived && (
            <MenuItem onClick={() => { setOpen(false); onPayout(); }}>Marcar como pago</MenuItem>
          )}
          <div style={{ height: 1, background: 'var(--border)', margin: 'var(--space-1) 0' }} />
          <MenuItem onClick={() => { setOpen(false); onArchive(); }} danger={!archived}>
            {archived ? 'Desarquivar' : 'Arquivar'}
          </MenuItem>
        </div>,
        document.body,
      )}
    </>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--text-body-s)',
        border: 'none',
        background: 'transparent',
        color: danger ? 'var(--error)' : 'var(--fg)',
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

function EmptyState({ onCreate, hasFilter }: { onCreate: () => void; hasFilter: boolean }) {
  return (
    <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--fg-secondary)' }}>
      {hasFilter ? (
        <>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--fg)', marginBottom: 'var(--space-2)' }}>Nenhum afiliado bate com os filtros.</p>
          <p style={{ fontSize: 'var(--text-body-s)' }}>Limpe a busca ou troque o filtro de status.</p>
        </>
      ) : (
        <>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--fg)', marginBottom: 'var(--space-2)' }}>Nenhum afiliado cadastrado ainda.</p>
          <p style={{ fontSize: 'var(--text-body-s)', marginBottom: 'var(--space-4)' }}>Crie códigos com comissão personalizada para influenciadores, parceiros ou embaixadores.</p>
          <button
            type="button"
            onClick={onCreate}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--neutral-900)',
              color: 'var(--fg-on-accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Cadastrar primeiro afiliado
          </button>
        </>
      )}
    </div>
  );
}

function FormCard({
  form, setForm, editing, submitting, error, onSubmit, onCancel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  editing: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, letterSpacing: 'var(--track-tight)' }}>
          {editing ? 'Editar afiliado' : 'Novo afiliado'}
        </h2>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 'var(--text-body-s)' }}>Fechar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <Field label="Nome do afiliado" required>
          <Input value={form.affiliateName} onChange={(v) => setField('affiliateName', v)} placeholder="ex: Maria Silva" required minLength={2} maxLength={200} />
        </Field>
        <Field label="Email (opcional)" hint="Para enviar relatórios mensais">
          <Input type="email" value={form.affiliateEmail} onChange={(v) => setField('affiliateEmail', v)} placeholder="maria@exemplo.com" />
        </Field>

        <Field label="Código de divulgação" required hint="Letras maiúsculas, números, hífen. Ex: MARIA10">
          <Input
            value={form.code}
            onChange={(v) => setField('code', v.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            placeholder="MARIA10"
            required
            minLength={2}
            maxLength={32}
            mono
          />
        </Field>
        <Field label="Tag" hint="Categoriza para relatórios">
          <Select value={form.tag} onChange={(v) => setField('tag', v)}>
            <option value="">Sem tag</option>
            {TAG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Comissão por venda" required hint="Quanto o afiliado ganha em cada conversão atribuída">
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          {COMMISSION_PRESETS.map((p) => {
            const active = !form.customPercent && parseFloat(form.commissionPercent) === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => { setField('commissionPercent', String(p)); setField('customPercent', false); }}
                style={{
                  padding: 'var(--space-1) var(--space-3)',
                  fontSize: 'var(--text-body-s)',
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--fg-on-accent)' : 'var(--fg)',
                  background: active ? 'var(--accent)' : 'var(--bg-subtle)',
                  border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >{p}%</button>
            );
          })}
          <button
            type="button"
            onClick={() => setField('customPercent', !form.customPercent)}
            style={{
              padding: 'var(--space-1) var(--space-3)',
              fontSize: 'var(--text-body-s)',
              fontWeight: form.customPercent ? 600 : 500,
              color: form.customPercent ? 'var(--fg-on-accent)' : 'var(--fg)',
              background: form.customPercent ? 'var(--accent)' : 'var(--bg-subtle)',
              border: '1px solid ' + (form.customPercent ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >Outro %</button>
          {form.customPercent && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={form.commissionPercent}
                onChange={(e) => setField('commissionPercent', e.target.value)}
                style={{
                  width: 72,
                  padding: 'var(--space-1) var(--space-2)',
                  fontSize: 'var(--text-body-s)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  textAlign: 'right',
                }}
              />
              <span style={{ color: 'var(--fg-secondary)' }}>%</span>
            </div>
          )}
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <Field label="Janela de atribuição" hint="Cookie no navegador do cliente. Após este prazo, a venda não é mais atribuída ao afiliado.">
          <Select value={String(form.cookieDays)} onChange={(v) => setField('cookieDays', parseInt(v, 10))}>
            {COOKIE_PRESETS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>
        <Field label="Expiração do código" hint="Opcional. Após esta data o link para de gerar comissão.">
          <Input type="date" value={form.expiresAt} onChange={(v) => setField('expiresAt', v)} />
        </Field>
      </div>

      <Field label="Limite de conversões" hint="Quantas vendas o código pode gerar antes de parar de creditar comissão. Útil pra campanhas pontuais.">
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--text-body-s)' }}>
            <input
              type="radio"
              checked={!form.maxUsesEnabled}
              onChange={() => setField('maxUsesEnabled', false)}
            />
            Ilimitado
          </label>
          <label style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--text-body-s)' }}>
            <input
              type="radio"
              checked={form.maxUsesEnabled}
              onChange={() => setField('maxUsesEnabled', true)}
            />
            Limite
          </label>
          {form.maxUsesEnabled && (
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setField('maxUses', e.target.value)}
              placeholder="ex: 100"
              style={{
                width: 120,
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--text-body-s)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg)',
                color: 'var(--fg)',
              }}
            />
          )}
        </div>
      </Field>

      <Field label="Notas internas (opcional)" hint="Anote contato, contrato, condições. Não é exibido pro afiliado.">
        <textarea
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="ex: Influenciadora Instagram @maria, ROI alto em joias rosé"
          style={{
            width: '100%',
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--text-body-s)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg)',
            color: 'var(--fg)',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </Field>

      {!editing && (
        <div style={{
          padding: 'var(--space-4)',
          background: 'var(--surface-subtle, #FAF6EE)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
        }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.generateCoupon}
              onChange={(e) => setField('generateCoupon', e.target.checked)}
              style={{ marginTop: 4 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 'var(--text-body-s)' }}>
                Gerar cupom dedicado <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>(modelo Shopify Collabs)</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
                Cliente digita <code className="mono">{form.code || 'CODIGO'}</code> no checkout → ganha desconto E você atribui a comissão automaticamente. Não exige cookie.
                <br />
                <strong>Sempre exclusivo</strong>: o cupom não combina com gift card nem outro cupom (anti-prejuízo).
              </p>
            </div>
          </label>

          {form.generateCoupon && (() => {
            const couponPct = parseFloat(form.couponDiscountPercent.replace(',', '.')) || 0;
            const commPct = parseFloat(form.commissionPercent.replace(',', '.')) || 0;
            const totalCost = couponPct + commPct;
            const marginColor = totalCost >= 40 ? '#B91C1C' : totalCost >= 25 ? '#92400E' : '#166534';
            const marginLabel = totalCost >= 40 ? 'risco alto de prejuízo' : totalCost >= 25 ? 'verifique sua margem' : 'combinação saudável';
            return (
              <div style={{ marginTop: 'var(--space-3)', paddingLeft: 28 }}>
                <Field label="Desconto pro cliente (%)" hint="Quanto o cliente economiza ao usar o código.">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={form.couponDiscountPercent}
                    onChange={(e) => setField('couponDiscountPercent', e.target.value)}
                    style={{
                      width: 120,
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--text-body-s)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg)',
                      color: 'var(--fg)',
                    }}
                  />
                </Field>
                <div style={{
                  marginTop: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  background: 'var(--bg)',
                  border: `1px solid ${marginColor}40`,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  lineHeight: 1.6,
                }}>
                  <strong>Custo total por venda:</strong>{' '}
                  <span style={{ color: marginColor, fontWeight: 600 }}>
                    {totalCost.toFixed(1)}% do preço cheio
                  </span>{' '}
                  <span style={{ color: 'var(--fg-muted)' }}>
                    ({couponPct}% desconto + {commPct}% comissão) — {marginLabel}
                  </span>
                  <br />
                  <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>
                    Em produto de R$ 100 com margem 50%: você fica com R$ {(100 - totalCost - 50).toFixed(2)} de lucro.
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {error && (
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--error-soft)',
          color: 'var(--error)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-body-s)',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'transparent',
            border: '1px solid var(--border-strong)',
            color: 'var(--fg)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: 'var(--text-body-s)',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: 'var(--space-2) var(--space-5)',
            background: 'var(--neutral-900)',
            color: 'var(--fg-on-accent)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: submitting ? 'wait' : 'pointer',
            fontSize: 'var(--text-body-s)',
            fontWeight: 600,
          }}
        >
          {submitting ? 'Salvando…' : (editing ? 'Salvar alterações' : 'Criar afiliado')}
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <span style={{ fontSize: 'var(--text-body-s)', fontWeight: 500, color: 'var(--fg)' }}>
        {label}
        {required && <span style={{ color: 'var(--error)', marginLeft: 4 }}>*</span>}
      </span>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{hint}</span>}
    </label>
  );
}

function Input({ value, onChange, type, placeholder, required, minLength, maxLength, mono }: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  mono?: boolean;
}) {
  return (
    <input
      type={type ?? 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      maxLength={maxLength}
      style={{
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--text-body-s)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        outline: 'none',
      }}
    />
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: 'var(--space-2) var(--space-3)',
        fontSize: 'var(--text-body-s)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg)',
        color: 'var(--fg)',
        cursor: 'pointer',
      }}
    >
      {children}
    </select>
  );
}
