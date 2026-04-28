'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Conversion {
  orderId: string;
  orderNumber: string;
  totalCents: number;
  paidAt: string | null;
  createdAt: string;
}

interface Affiliate {
  id: string;
  affiliateName: string;
  affiliateEmail: string | null;
  code: string;
  commissionBps: number;
  clicks: number;
  conversions: number;
  payoutCents: number;
  pendingCents: number;
  active: boolean;
  createdAt: string;
}

interface DashboardData {
  affiliate: Affiliate;
  recentConversions: Conversion[];
}

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AfiliadoPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Signup form state
  const [showSignup, setShowSignup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);

  function loadData() {
    setLoading(true);
    fetch('/api/conta/afiliado', { cache: 'no-store' })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = '/entrar?next=/conta/afiliado';
          return null;
        }
        if (r.status === 404) {
          setData(null);
          return null;
        }
        return r.json();
      })
      .then((json) => {
        if (json) setData(json);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSignupError(null);
    try {
      const res = await fetch('/api/conta/afiliado', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          affiliateName: name,
          code: code.toUpperCase(),
        }),
      });
      const json = (await res.json()) as { affiliate?: Affiliate; error?: string };
      if (!res.ok) {
        setSignupError(
          json.error === 'code_already_exists'
            ? 'Código já em uso. Escolha outro.'
            : json.error === 'already_registered'
              ? 'Você já é afiliado.'
              : json.error ?? 'Erro ao cadastrar',
        );
        return;
      }
      setShowSignup(false);
      loadData();
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSubmitting(false);
    }
  }

  function copyLink() {
    if (!data?.affiliate.code) return;
    const link = `${window.location.origin}/r/${data.affiliate.code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Carregando…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>
        <p style={{ color: 'var(--error, #B91C1C)' }}>Erro: {error}</p>
      </div>
    );
  }

  // Empty state — não cadastrado.
  if (!data) {
    return (
      <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1.1, margin: '0 0 8px' }}>
          Programa de embaixadores
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
          Compartilhe sua paixão pela loja e ganhe comissão por cada venda atribuída ao seu código pessoal.
          Cookie de 30 dias — você é creditado mesmo se a compra acontecer dias depois do clique.
        </p>

        <section
          style={{
            padding: 24,
            background: 'var(--surface-sunken, #FAF6EE)',
            borderRadius: 8,
            border: '1px solid var(--divider)',
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>Como funciona</h2>
          <ol style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: 14, color: 'var(--text-secondary)' }}>
            <li>Você se cadastra com seu nome e escolhe um código único.</li>
            <li>Recebe um link curto pessoal: <code style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: 4 }}>/r/SEUCODIGO</code></li>
            <li>Compartilha em redes sociais, blog, WhatsApp.</li>
            <li>A cada venda atribuída, ganha 10% de comissão (configurável pelo lojista).</li>
            <li>Acompanha cliques, conversões e ganhos neste painel.</li>
          </ol>
        </section>

        {!showSignup ? (
          <button
            type="button"
            onClick={() => setShowSignup(true)}
            style={{
              padding: '14px 28px',
              background: 'var(--text-primary)',
              color: 'var(--text-on-dark)',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Quero ser embaixador →
          </button>
        ) : (
          <form
            onSubmit={handleSignup}
            style={{
              padding: 24,
              border: '1px solid var(--divider)',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Cadastro</h2>

            <label>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Seu nome (visível aos clientes que clicam no link)
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={200}
                placeholder="Maria Silva"
                style={{
                  width: '100%',
                  padding: 12,
                  fontSize: 14,
                  border: '1px solid var(--divider)',
                  borderRadius: 6,
                }}
              />
            </label>

            <label>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                Código pessoal <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(A-Z, 0-9, hífen)</span>
              </div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                required
                minLength={2}
                maxLength={32}
                placeholder="MARIA10"
                style={{
                  width: '100%',
                  padding: 12,
                  fontSize: 14,
                  fontFamily: 'monospace',
                  border: '1px solid var(--divider)',
                  borderRadius: 6,
                }}
              />
              {code && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Seu link: <code>{window.location.origin}/r/{code}</code>
                </p>
              )}
            </label>

            {signupError && (
              <p style={{ fontSize: 13, color: 'var(--error, #B91C1C)' }}>{signupError}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowSignup(false)}
                style={{
                  padding: '12px 20px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--divider)',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !name || !code}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: submitting || !name || !code ? 'var(--divider)' : 'var(--text-primary)',
                  color: submitting || !name || !code ? 'var(--text-muted)' : 'var(--text-on-dark)',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 500,
                  cursor: submitting || !name || !code ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Cadastrando…' : 'Cadastrar'}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  const { affiliate, recentConversions } = data;
  const link = typeof window !== 'undefined' ? `${window.location.origin}/r/${affiliate.code}` : `/r/${affiliate.code}`;

  return (
    <div style={{ maxWidth: 960, margin: '40px auto', padding: '0 24px' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1.1, margin: '0 0 8px' }}>
          Sua área de embaixador
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Olá, {affiliate.affiliateName} · Comissão: {(affiliate.commissionBps / 100).toFixed(1)}% por venda
        </p>
      </header>

      {/* Link section */}
      <section
        style={{
          padding: 24,
          background: 'var(--surface-sunken, #FAF6EE)',
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Seu link pessoal
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <code
            style={{
              flex: 1,
              minWidth: 240,
              padding: 12,
              background: 'var(--surface)',
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            {link}
          </code>
          <button
            type="button"
            onClick={copyLink}
            style={{
              padding: '12px 20px',
              background: copied ? 'var(--success, #166534)' : 'var(--text-primary)',
              color: 'var(--text-on-dark)',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              minWidth: 120,
            }}
          >
            {copied ? '✓ Copiado' : 'Copiar link'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
          Cookie 30 dias · você é creditado mesmo se a compra acontecer depois do clique.
        </p>
      </section>

      {/* Stats grid */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Stat label="Cliques" value={affiliate.clicks.toLocaleString('pt-BR')} />
        <Stat label="Conversões" value={affiliate.conversions.toLocaleString('pt-BR')} />
        <Stat
          label="A receber"
          value={fmtBRL(affiliate.pendingCents)}
          highlight={affiliate.pendingCents > 0}
        />
        <Stat label="Já pago" value={fmtBRL(affiliate.payoutCents)} />
      </section>

      {/* Conversions table */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>Conversões recentes</h2>
        {recentConversions.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Sem conversões ainda. Compartilhe seu link!
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--divider)' }}>
                <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 500, color: 'var(--text-muted)' }}>Pedido</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 500, color: 'var(--text-muted)' }}>Valor</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 500, color: 'var(--text-muted)' }}>Comissão</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 500, color: 'var(--text-muted)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentConversions.map((c) => {
                const commissionCents = Math.floor((c.totalCents * affiliate.commissionBps) / 10000);
                const paid = !!c.paidAt;
                return (
                  <tr key={c.orderId} style={{ borderBottom: '1px solid var(--divider)' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 500 }}>{c.orderNumber}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>{fmtBRL(c.totalCents)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 500 }}>{fmtBRL(commissionCents)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          background: paid ? '#EEF2E8' : '#FEF3C7',
                          color: paid ? '#166534' : '#92400E',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        {paid ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Materiais V1 stub */}
      <section
        style={{
          padding: 24,
          background: 'var(--surface-sunken, #FAF6EE)',
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>Materiais de divulgação</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          Use estas mensagens prontas em redes sociais e WhatsApp:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <CopyBox
            title="Mensagem curta"
            text={`Achei essa loja incrível! Use meu link e dê uma olhada → ${link}`}
          />
          <CopyBox
            title="Story / post"
            text={`Conheci uma loja que vale a pena. Estilo, qualidade e atendimento atento. Meu link de embaixador: ${link}`}
          />
          <CopyBox
            title="WhatsApp"
            text={`Oi! Tô usando o programa de embaixador desta loja. Se quiser dar uma olhada: ${link}`}
          />
        </div>
      </section>

      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        <Link href="/conta" style={{ color: 'var(--text-primary)' }}>← Voltar para minha conta</Link>
      </p>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: 16,
        background: 'var(--surface)',
        border: '1px solid var(--divider)',
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display, inherit)',
          fontSize: 24,
          fontWeight: 600,
          color: highlight ? 'var(--accent)' : 'var(--text-primary)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CopyBox({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div
      style={{
        padding: 12,
        background: 'var(--surface)',
        borderRadius: 6,
        border: '1px solid var(--divider)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <strong style={{ fontSize: 12 }}>{title}</strong>
        <button
          type="button"
          onClick={copy}
          style={{
            fontSize: 11,
            padding: '4px 10px',
            background: copied ? 'var(--success, #166534)' : 'var(--text-primary)',
            color: 'var(--text-on-dark)',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>{text}</p>
    </div>
  );
}
