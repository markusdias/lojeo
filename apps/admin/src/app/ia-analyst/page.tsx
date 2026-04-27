'use client';

import { useEffect, useRef, useState } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  degraded?: boolean;
  tokensIn?: number;
  tokensOut?: number;
  model?: string;
}

const STORAGE_KEY = 'lojeo-ia-analyst-history-v1';

interface StarterQuestion {
  label: string;
  prompt: string;
  hint: string;
}

const STARTER_QUESTIONS: StarterQuestion[] = [
  { label: 'Por que vendas caíram?', prompt: 'Por que minhas vendas caíram nos últimos 7 dias comparado com a semana anterior?', hint: 'diagnóstico' },
  { label: 'Clientes em risco de churn', prompt: 'Quais clientes estão prestes a churnar e o que eles têm em comum?', hint: 'retenção' },
  { label: 'Estoque zerado ou crítico', prompt: 'Quais produtos estão com estoque zerado ou crítico que vale repor agora?', hint: 'operação' },
  { label: 'Receita vs semana anterior', prompt: 'Compare a receita desta semana com a semana anterior e destaque o que mudou.', hint: 'receita' },
  { label: 'Onde perdo conversão?', prompt: 'Em qual etapa do funil estou perdendo mais clientes e por quê?', hint: 'funil' },
  { label: 'Top 5 produtos', prompt: 'Quais são meus top 5 produtos por receita nos últimos 30 dias?', hint: 'produtos' },
];

// Sonnet 4.5 pricing: $3/Mtok input, $15/Mtok output. Convert to BRL cents (~R$ 5.00 / USD).
function estimateCostCents(tokensIn: number, tokensOut: number): number {
  const usd = (tokensIn / 1_000_000) * 3 + (tokensOut / 1_000_000) * 15;
  const brl = usd * 5.0;
  return Math.round(brl * 100); // centavos R$
}

function formatCost(cents: number): string {
  if (cents < 1) return '< R$ 0,01';
  if (cents < 100) return `~R$ 0,${String(cents).padStart(2, '0')}`;
  return `~R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function formatModelLabel(model?: string): string {
  if (!model) return 'Claude';
  if (model.includes('sonnet')) return 'Sonnet';
  if (model.includes('haiku')) return 'Haiku';
  if (model.includes('opus')) return 'Opus';
  return 'Claude';
}

const TOOL_LABELS: Record<string, string> = {
  revenue_by_period: 'receita',
  top_products: 'top produtos',
  conversion_funnel: 'funil',
  customer_segments: 'segmentos',
  behavior_aggregates: 'comportamento',
};

// Simple markdown rendering: **bold**, _italic_, `code`, lists, tables
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/_(.+?)_/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    const matches = [boldMatch, italicMatch, codeMatch].filter(Boolean) as RegExpMatchArray[];
    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }
    const earliest = matches.reduce((min, m) => (m.index ?? 0) < (min.index ?? 0) ? m : min);
    const idx = earliest.index ?? 0;
    if (idx > 0) parts.push(remaining.slice(0, idx));
    if (earliest === boldMatch) parts.push(<strong key={`b-${key++}`}>{earliest[1]}</strong>);
    else if (earliest === italicMatch) parts.push(<em key={`i-${key++}`}>{earliest[1]}</em>);
    else if (earliest === codeMatch) parts.push(<code key={`c-${key++}`} style={{ background: 'var(--neutral-100)', padding: '1px 4px', borderRadius: 3, fontSize: '0.9em' }}>{earliest[1]}</code>);
    remaining = remaining.slice(idx + earliest[0].length);
  }
  return <>{parts}</>;
}

function renderSimpleMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (line.includes('|') && lines[i + 1]?.match(/^\s*\|?\s*[-: ]+\|/)) {
      const headerCells = line.split('|').map(c => c.trim()).filter(Boolean);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i]?.includes('|')) {
        rows.push((lines[i] ?? '').split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 || c !== '' || arr.length === headerCells.length));
        i++;
      }
      blocks.push(
        <div key={`tbl-${blockKey++}`} style={{ overflowX: 'auto', margin: '12px 0' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', border: '1px solid var(--border)' }}>
            <thead>
              <tr style={{ background: 'var(--neutral-50)' }}>
                {headerCells.map((h, ix) => (
                  <th key={ix} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{renderInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                  {row.map((c, ci) => (
                    <td key={ci} style={{ padding: '6px 10px' }}>{renderInline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.match(/^\s*[-*]\s/)) {
      const items: string[] = [];
      while (i < lines.length && (lines[i] ?? '').match(/^\s*[-*]\s/)) {
        items.push((lines[i] ?? '').replace(/^\s*[-*]\s/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${blockKey++}`} style={{ paddingLeft: 20, margin: '8px 0' }}>
          {items.map((it, ix) => <li key={ix} style={{ marginBottom: 4 }}>{renderInline(it)}</li>)}
        </ul>
      );
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const para: string[] = [line];
    i++;
    while (i < lines.length && (lines[i] ?? '').trim() !== '' && !(lines[i] ?? '').match(/^\s*[-*]\s/) && !((lines[i] ?? '').includes('|') && lines[i + 1]?.match(/^\s*\|?\s*[-: ]+\|/))) {
      para.push(lines[i] ?? '');
      i++;
    }
    blocks.push(
      <p key={`p-${blockKey++}`} style={{ margin: '6px 0', lineHeight: 1.55 }}>
        {renderInline(para.join(' '))}
      </p>
    );
  }

  return blocks;
}

export default function IaAnalystPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLastPrompt(trimmed);
    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as { response?: string; error?: string; toolsUsed?: string[]; degraded?: boolean; tokensIn?: number; tokensOut?: number; model?: string };

      if (!res.ok) {
        setError(data.error ?? 'Falha ao consultar o IA Analyst');
        return;
      }

      setMessages([
        ...next,
        {
          role: 'assistant',
          content: data.response ?? '(resposta vazia)',
          toolsUsed: data.toolsUsed,
          degraded: data.degraded,
          tokensIn: data.tokensIn,
          tokensOut: data.tokensOut,
          model: data.model,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearHistory() {
    setMessages([]);
    setError(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <main style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh' }} className="space-y-6">
      <header style={{ marginBottom: 'var(--space-4)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>IA Analyst</h1>
            <p style={{ fontSize: 13, color: 'var(--neutral-500)', marginTop: 4 }}>
              Pergunte sobre receita, conversão, clientes ou comportamento. O Analyst consulta seus dados em tempo real.
            </p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearHistory} className="lj-btn-secondary" style={{ fontSize: 12 }}>
              Limpar histórico
            </button>
          )}
        </div>
      </header>

      {messages.length === 0 && (
        <section className="lj-card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)', flexShrink: 0 }}>
          <p style={{ fontSize: 12, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', marginBottom: 12, fontWeight: 600 }}>
            Comece com uma destas perguntas
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {STARTER_QUESTIONS.map(q => (
              <button
                key={q.label}
                onClick={() => sendMessage(q.prompt)}
                disabled={loading}
                className="ia-suggestion-card"
                style={{
                  padding: '12px 14px',
                  fontSize: 13,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md, 8px)',
                  color: 'var(--fg)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  transition: 'all var(--dur-fast) var(--ease-out)',
                }}
              >
                <span style={{ fontWeight: 500, lineHeight: 1.35 }}>{q.label}</span>
                <span style={{ fontSize: 11, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)' }}>
                  {q.hint}
                </span>
              </button>
            ))}
          </div>
          <style jsx>{`
            .ia-suggestion-card:hover:not(:disabled) {
              border-color: var(--neutral-400);
              background: var(--neutral-50);
            }
          `}</style>
        </section>
      )}

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingRight: 4 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            className="lj-card"
            style={{
              padding: 'var(--space-4)',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              background: m.role === 'user' ? 'var(--neutral-900)' : 'var(--bg-elevated)',
              color: m.role === 'user' ? '#FFFFFF' : 'var(--fg)',
              border: m.role === 'user' ? 'none' : '1px solid var(--border)',
            }}
          >
            <div style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 'var(--track-wide)',
              marginBottom: 6,
              color: m.role === 'user' ? 'var(--neutral-300)' : 'var(--neutral-500)',
              fontWeight: 600,
            }}>
              {m.role === 'user' ? 'Você' : 'IA Analyst'}
              {m.degraded && m.role === 'assistant' && <span style={{ marginLeft: 8, color: 'var(--warning)' }}>· modo demo</span>}
            </div>
            <div style={{ fontSize: 14 }}>
              {m.role === 'assistant' ? renderSimpleMarkdown(m.content) : m.content}
            </div>
            {m.toolsUsed && m.toolsUsed.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {m.toolsUsed.map(t => (
                  <span key={t} style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    background: 'var(--neutral-100)',
                    color: 'var(--neutral-600)',
                    borderRadius: 999,
                    fontWeight: 500,
                  }}>
                    ✦ {TOOL_LABELS[t] ?? t}
                  </span>
                ))}
              </div>
            )}
            {m.role === 'assistant' && (m.tokensIn !== undefined || m.tokensOut !== undefined) && (
              <div style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px solid var(--border)',
                fontSize: 10,
                color: 'var(--neutral-500)',
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}>
                <span>✦ {formatModelLabel(m.model)}</span>
                <span style={{ color: 'var(--neutral-300)' }}>·</span>
                <span>{(m.tokensIn ?? 0) + (m.tokensOut ?? 0)} tokens</span>
                <span style={{ color: 'var(--neutral-300)' }}>·</span>
                <span>{formatCost(estimateCostCents(m.tokensIn ?? 0, m.tokensOut ?? 0))}</span>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="lj-card" style={{ padding: 'var(--space-4)', alignSelf: 'flex-start', maxWidth: '88%' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', marginBottom: 8, color: 'var(--neutral-500)', fontWeight: 600 }}>
              IA Analyst
            </div>
            <div style={{ fontSize: 14, color: 'var(--neutral-500)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="ia-typing">
                <span className="ia-dot" />
                <span className="ia-dot" />
                <span className="ia-dot" />
              </span>
              <span>Consultando dados</span>
            </div>
            <style jsx>{`
              .ia-typing {
                display: inline-flex;
                gap: 3px;
                align-items: center;
              }
              .ia-dot {
                width: 6px;
                height: 6px;
                background: var(--neutral-400);
                border-radius: 999px;
                animation: ia-bounce 1.2s infinite ease-in-out;
              }
              .ia-dot:nth-child(2) { animation-delay: 0.15s; }
              .ia-dot:nth-child(3) { animation-delay: 0.3s; }
              @keyframes ia-bounce {
                0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
                40% { opacity: 1; transform: translateY(-3px); }
              }
            `}</style>
          </div>
        )}

        {error && (
          <div style={{ padding: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, color: '#991B1B', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span>{error}</span>
            {lastPrompt && (
              <button
                onClick={() => sendMessage(lastPrompt)}
                disabled={loading}
                style={{
                  alignSelf: 'flex-start',
                  padding: '4px 10px',
                  fontSize: 12,
                  background: '#FFFFFF',
                  border: '1px solid #FCA5A5',
                  borderRadius: 4,
                  color: '#991B1B',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'var(--space-4)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            className="lj-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte algo sobre seu negócio… (Cmd+Enter para enviar)"
            rows={3}
            disabled={loading}
            style={{ flex: 1, resize: 'vertical', fontFamily: 'var(--font-sans)' }}
          />
          <button
            className="lj-btn-primary"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{ alignSelf: 'stretch', minWidth: 100 }}
          >
            {loading ? '…' : 'Enviar'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--neutral-500)', marginTop: 6 }}>
          Cmd+Enter (ou Ctrl+Enter) para enviar. Histórico salvo nesta sessão.
        </p>
      </div>
    </main>
  );
}
