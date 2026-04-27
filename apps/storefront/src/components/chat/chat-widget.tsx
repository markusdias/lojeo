'use client';

import { useEffect, useRef, useState } from 'react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'lojeo_chat_history';
const SESSION_KEY = 'lojeo_chat_session';
const MAX_HISTORY = 20;

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (globalThis.crypto?.randomUUID?.() ?? `s${Date.now()}${Math.random().toString(36).slice(2, 8)}`);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function loadHistory(): Msg[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(-MAX_HISTORY);
  } catch {
    return [];
  }
  return [];
}

function saveHistory(msgs: Msg[]) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY)));
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(loadHistory());
  }, []);

  useEffect(() => {
    saveHistory(messages);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setWhatsapp(null);

    try {
      const sessionId = getOrCreateSessionId();
      const productCtx = readProductContext();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-session-id': sessionId },
        body: JSON.stringify({ messages: next, context: productCtx }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        response?: string;
        degraded?: boolean;
        escalated?: boolean;
        whatsapp?: string;
        error?: string;
      };
      const reply = data.response ?? data.error ?? 'Não consegui responder agora. Tente novamente.';
      setMessages([...next, { role: 'assistant', content: reply }]);
      if (data.whatsapp) setWhatsapp(data.whatsapp);
    } catch {
      setMessages([
        ...next,
        {
          role: 'assistant',
          content:
            'Estou com dificuldades técnicas. Você pode falar conosco no WhatsApp pelo link abaixo.',
        },
      ]);
      setWhatsapp('https://wa.me/5511999999999');
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
    setWhatsapp(null);
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Fechar atendimento' : 'Abrir atendimento'}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed',
          right: 'var(--space-5, 20px)',
          bottom: 'var(--space-5, 20px)',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--accent, #C9A85C)',
          color: 'var(--paper, #fff)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          zIndex: 60,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 160ms ease, box-shadow 160ms ease',
        }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6l-12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Atendimento"
          style={{
            position: 'fixed',
            right: 'var(--space-5, 20px)',
            bottom: 'calc(var(--space-5, 20px) + 72px)',
            width: 'min(380px, calc(100vw - 32px))',
            height: 'min(520px, calc(100vh - 140px))',
            background: 'var(--bg, #fff)',
            border: '1px solid var(--border, rgba(0,0,0,0.08))',
            borderRadius: 'var(--radius-md, 12px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <header
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: 'var(--surface, #fafaf7)',
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display, serif)',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text-primary, #14110F)',
                }}
              >
                Atendimento
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted, #6B6055)' }}>
                Tira-dúvidas em tempo real · respondemos em segundos
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 12,
                  color: 'var(--text-muted, #6B6055)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                aria-label="Limpar conversa"
              >
                Limpar
              </button>
            )}
          </header>

          <div
            ref={scrollRef}
            style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {messages.length === 0 && (
              <div style={{ marginTop: 'auto', marginBottom: 'auto', textAlign: 'center' }}>
                <p
                  style={{
                    margin: '0 0 8px',
                    fontFamily: 'var(--font-display, serif)',
                    fontSize: 18,
                    color: 'var(--text-primary, #14110F)',
                  }}
                >
                  Como posso ajudar?
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #6B6055)', lineHeight: 1.5 }}>
                  Pergunte sobre material, prazo, garantia ou peça uma sugestão de presente.
                </p>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['Qual a diferença entre ouro 18k e prata 925?', 'Tem peças até R$ 500?', 'Quanto tempo de garantia?'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInput(s)}
                      style={{
                        background: 'var(--surface, #fafaf7)',
                        border: '1px solid var(--border, rgba(0,0,0,0.08))',
                        borderRadius: 999,
                        padding: '6px 12px',
                        fontSize: 12,
                        color: 'var(--text-primary, #14110F)',
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.role === 'user' ? 'var(--accent, #C9A85C)' : 'var(--surface, #fafaf7)',
                  color: m.role === 'user' ? 'var(--paper, #fff)' : 'var(--text-primary, #14110F)',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  fontSize: 12,
                  color: 'var(--text-muted, #6B6055)',
                  fontStyle: 'italic',
                }}
              >
                digitando…
              </div>
            )}
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                style={{
                  alignSelf: 'flex-start',
                  fontSize: 13,
                  color: 'var(--accent, #C9A85C)',
                  textDecoration: 'underline',
                }}
              >
                Falar no WhatsApp
              </a>
            )}
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              void send();
            }}
            style={{
              padding: 12,
              borderTop: '1px solid var(--border, rgba(0,0,0,0.08))',
              display: 'flex',
              gap: 8,
              background: 'var(--bg, #fff)',
            }}
          >
            <label htmlFor="lojeo-chat-input" style={{ position: 'absolute', left: '-9999px' }}>
              Mensagem
            </label>
            <input
              id="lojeo-chat-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua dúvida…"
              disabled={busy}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid var(--border, rgba(0,0,0,0.12))',
                borderRadius: 999,
                background: 'var(--bg, #fff)',
                fontSize: 14,
                color: 'var(--text-primary, #14110F)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Enviar mensagem"
              style={{
                padding: '0 14px',
                borderRadius: 999,
                background: 'var(--accent, #C9A85C)',
                color: 'var(--paper, #fff)',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                cursor: input.trim() && !busy ? 'pointer' : 'not-allowed',
                opacity: input.trim() && !busy ? 1 : 0.6,
              }}
            >
              Enviar
            </button>
          </form>
        </section>
      )}
    </>
  );
}

function readProductContext(): { productName?: string; productId?: string } {
  if (typeof document === 'undefined') return {};
  const el = document.querySelector('[data-product-id]') as HTMLElement | null;
  if (!el) return {};
  const productId = el.dataset.productId;
  const productName = el.dataset.productName;
  return { productId, productName };
}
