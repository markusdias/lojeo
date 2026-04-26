'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Setup wizard — checklist de integrações externas para o lojista.
 *
 * Lê `tenants.config.integrations.{provider}.connected` (boolean).
 * Falha silenciosa: se schema/config não tiver os campos, cada item retorna
 * `connected: false` e o status final é "Pendente" (⏳ ao invés de ✅/❌).
 *
 * Convenções de status:
 *   true       → ✅ Conectado
 *   false      → ❌ Desconectado (pelo lojista, intencionalmente desligado)
 *   undefined  → ⏳ Pendente (ainda não tentou conectar / schema não declara)
 */

type Priority = 'P0' | 'P1' | 'P2';
type ConnState = 'connected' | 'disconnected' | 'pending';

interface IntegrationItem {
  key: 'mp' | 'resend' | 'anthropic' | 'bling' | 'me' | 'trigger' | 'vapid' | 'r2' | 'clarity';
  name: string;
  feature: string;
  priority: Priority;
  docsUrl: string;
}

const ITEMS: IntegrationItem[] = [
  {
    key: 'mp',
    name: 'Mercado Pago',
    feature: 'Pix, cartão e boleto BR — destrava checkout real e receita.',
    priority: 'P0',
    docsUrl: 'https://www.mercadopago.com.br/developers/pt/docs',
  },
  {
    key: 'resend',
    name: 'Resend',
    feature: 'E-mail transacional (pedido confirmado, recuperação carrinho, NF anexada).',
    priority: 'P0',
    docsUrl: 'https://resend.com/docs',
  },
  {
    key: 'anthropic',
    name: 'Anthropic Claude',
    feature: 'IA real (descrições, SEO, IA Analyst, moderação UGC).',
    priority: 'P0',
    docsUrl: 'https://docs.anthropic.com',
  },
  {
    key: 'bling',
    name: 'Bling NF-e',
    feature: 'Emissão automática de NF-e ao faturar pedido.',
    priority: 'P1',
    docsUrl: 'https://developer.bling.com.br',
  },
  {
    key: 'me',
    name: 'Melhor Envio',
    feature: 'Cotação automática Correios + Jadlog + transportadoras + etiqueta.',
    priority: 'P1',
    docsUrl: 'https://docs.melhorenvio.com.br',
  },
  {
    key: 'trigger',
    name: 'Trigger.dev',
    feature: 'Jobs assíncronos (e-mail, embeddings, IA Analyst noturno).',
    priority: 'P1',
    docsUrl: 'https://trigger.dev/docs',
  },
  {
    key: 'vapid',
    name: 'VAPID (Push PWA)',
    feature: 'Notificações push do navegador (carrinho abandonado, back-in-stock).',
    priority: 'P2',
    docsUrl: 'https://web.dev/articles/push-notifications-web-push-protocol',
  },
  {
    key: 'r2',
    name: 'Cloudflare R2',
    feature: 'Storage de assets em produção (substitui filesystem local).',
    priority: 'P2',
    docsUrl: 'https://developers.cloudflare.com/r2/',
  },
  {
    key: 'clarity',
    name: 'Microsoft Clarity',
    feature: 'Heatmaps + IA insights de UX (gratuito).',
    priority: 'P2',
    docsUrl: 'https://learn.microsoft.com/en-us/clarity/',
  },
];

const PRIORITY_BADGE: Record<Priority, { className: string; label: string; tooltip: string }> = {
  P0: { className: 'lj-badge lj-badge-error', label: 'P0 essencial', tooltip: 'Bloqueia o lançamento. Sem isso, a loja não vende.' },
  P1: { className: 'lj-badge lj-badge-warning', label: 'P1 recomendado', tooltip: 'Loja vende sem, mas fluxo fica manual e não escala.' },
  P2: { className: 'lj-badge lj-badge-info', label: 'P2 opcional', tooltip: 'Ganhos marginais. Pode esperar até a loja estar vendendo de verdade.' },
};

const STATE_VISUAL: Record<ConnState, { icon: string; label: string; color: string }> = {
  connected: { icon: '✅', label: 'Conectado', color: 'var(--success)' },
  pending: { icon: '⏳', label: 'Pendente', color: 'var(--warning)' },
  disconnected: { icon: '❌', label: 'Desconectado', color: 'var(--error)' },
};

interface IntegrationsConfigShape {
  mp?: { connected?: boolean };
  resend?: { connected?: boolean };
  anthropic?: { connected?: boolean };
  bling?: { connected?: boolean };
  me?: { connected?: boolean };
  trigger?: { connected?: boolean };
  vapid?: { connected?: boolean };
  r2?: { connected?: boolean };
  clarity?: { connected?: boolean };
}

interface SettingsResponse {
  name?: string;
  domain?: string | null;
  templateId?: string;
  config?: {
    integrations?: IntegrationsConfigShape;
  };
}

function readState(integrations: IntegrationsConfigShape | undefined, key: IntegrationItem['key']): ConnState {
  // Falha silenciosa: se schema não tem o campo ainda, retorna 'pending'.
  if (!integrations) return 'pending';
  const node = integrations[key];
  if (!node || typeof node !== 'object') return 'pending';
  if (node.connected === true) return 'connected';
  if (node.connected === false) return 'disconnected';
  return 'pending';
}

export default function OnboardingPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then(async r => {
        const json = (await r.json()) as SettingsResponse & { error?: string };
        if (cancelled) return;
        if (!r.ok) {
          setError(json.error ?? `HTTP ${r.status}`);
        } else {
          setData(json);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const integrationsConfig = data?.config?.integrations;

  const states = useMemo(() => {
    return ITEMS.map(item => ({ item, state: readState(integrationsConfig, item.key) }));
  }, [integrationsConfig]);

  const total = ITEMS.length;
  const connected = states.filter(s => s.state === 'connected').length;
  const percent = total === 0 ? 0 : Math.round((connected / total) * 100);

  const p0Total = ITEMS.filter(i => i.priority === 'P0').length;
  const p0Done = states.filter(s => s.item.priority === 'P0' && s.state === 'connected').length;

  if (loading) {
    return (
      <main style={{ padding: 'var(--space-8)', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
        <p style={{ color: 'var(--fg-secondary)' }} className="text-sm">Carregando…</p>
      </main>
    );
  }

  return (
    <main
      style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }}
      className="min-h-screen space-y-6"
    >
      <header>
        <nav className="text-xs mb-2" style={{ color: 'var(--fg-muted)' }}>
          <a href="/settings" className="hover:underline">Configurações</a>
          <span> · </span>
          <span>Onboarding de integrações</span>
        </nav>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)' }}>
          Onboarding de integrações
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
          Conecte os provedores externos no seu ritmo. Comece pelo P0 (essencial), depois P1, depois P2.
        </p>
      </header>

      {/* Resumo / progresso */}
      <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-secondary)' }}>
              Progresso geral
            </p>
            <p className="text-2xl font-semibold mt-1">
              {connected} de {total} integrações conectadas
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
              Essenciais (P0) prontas: <strong>{p0Done}/{p0Total}</strong>
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold" style={{ color: 'var(--accent)' }}>{percent}%</p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>completo</p>
          </div>
        </div>
        <div
          aria-label="Progresso de integrações"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            width: '100%',
            height: 8,
            background: 'var(--neutral-50)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: 'var(--accent)',
              transition: 'width var(--dur-normal, 300ms) var(--ease-out, ease-out)',
            }}
          />
        </div>
        {error && (
          <p className="text-xs mt-3" style={{ color: 'var(--error)' }}>
            Não foi possível ler o status: {error}. Mostrando integrações como pendentes.
          </p>
        )}
      </section>

      {/* Lista de integrações agrupadas por prioridade */}
      {(['P0', 'P1', 'P2'] as Priority[]).map(prio => {
        const group = states.filter(s => s.item.priority === prio);
        if (group.length === 0) return null;
        const badge = PRIORITY_BADGE[prio];
        return (
          <section key={prio} className="space-y-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-secondary)' }}>
                {prio === 'P0' && 'Essenciais — comece por aqui'}
                {prio === 'P1' && 'Recomendados — destravam escala'}
                {prio === 'P2' && 'Opcionais — otimização'}
              </h2>
              <span className={badge.className} title={badge.tooltip}>{badge.label}</span>
            </div>
            <div className="space-y-2">
              {group.map(({ item, state }) => {
                const visual = STATE_VISUAL[state];
                return (
                  <article
                    key={item.key}
                    className="lj-card flex items-start justify-between gap-4 flex-wrap"
                    style={{ padding: 'var(--space-4)' }}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span
                        aria-hidden
                        style={{ fontSize: 22, lineHeight: 1, color: visual.color }}
                        title={visual.label}
                      >
                        {visual.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium" style={{ fontSize: 'var(--text-body)' }}>{item.name}</h3>
                          <span
                            className="lj-badge lj-badge-neutral"
                            style={{ fontSize: 'var(--text-caption)' }}
                          >
                            {visual.label}
                          </span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
                          {item.feature}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={item.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lj-btn-primary"
                        style={{ textDecoration: 'none' }}
                        // TODO: substituir por fluxo OAuth 1-clique real (rota /api/integrations/{key}/connect)
                        title="Abre a documentação oficial em nova aba (OAuth 1-clique virá em breve)"
                      >
                        {state === 'connected' ? 'Reconectar' : 'Conectar'}
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
        Detalhes de prioridade e custo: <a href="/docs/decisions/external-blockers-priority.md" className="underline">docs/decisions/external-blockers-priority.md</a>.
        Status técnico (env vars detectadas) em <a href="/integracoes" className="underline">/integracoes</a>.
      </p>
    </main>
  );
}
