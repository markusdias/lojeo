'use client';

import { useEffect, useRef, useState } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  degraded?: boolean;
}

const STORAGE_KEY = 'lojeo-ia-analyst-history-v1';

const STARTER_QUESTIONS = [
  'Receita últimos 30 dias?',
  'Top 5 produtos?',
  'Onde estou perdendo conversão?',
  'Clientes em risco de churn?',
  'Quantos viram produto na última semana?',
];

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
      const data = (await res.json()) as { response?: string; error?: string; toolsUsed?: string[]; degraded?: boolean };

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
    <main style={{ padding: 'var(--space-6)', maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ marginBottom: 'var(--space-4)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>IA Analyst</h1>
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
        <section className="lj-card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', flexShrink: 0 }}>
          <p style={{ fontSize: 12, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', marginBottom: 10 }}>
            Comece com uma destas perguntas
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STARTER_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  background: 'var(--neutral-50)',
                  border: '1px solid var(--border)',
                  borderRadius: 999,
                  color: 'var(--fg)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background var(--dur-fast) var(--ease-out)',
                }}
              >
                {q}
              </button>
            ))}
          </div>
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
          </div>
        ))}

        {loading && (
          <div className="lj-card" style={{ padding: 'var(--space-4)', alignSelf: 'flex-start', maxWidth: '88%' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', marginBottom: 6, color: 'var(--neutral-500)', fontWeight: 600 }}>
              IA Analyst
            </div>
            <div style={{ fontSize: 14, color: 'var(--neutral-500)' }}>
              Consultando dados…
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, color: '#991B1B', fontSize: 13 }}>
            {error}
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
