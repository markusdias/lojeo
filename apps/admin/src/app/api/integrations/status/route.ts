import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Status = 'connected' | 'partial' | 'disconnected' | 'optional';

interface Integration {
  category: string;
  name: string;
  status: Status;
  message: string;
  envVarsRequired: string[];
  envVarsPresent: string[];
  docsUrl?: string;
}

function check(envs: string[]): { presence: 'all' | 'partial' | 'none'; present: string[] } {
  const present = envs.filter(e => Boolean(process.env[e]));
  if (present.length === 0) return { presence: 'none', present };
  if (present.length < envs.length) return { presence: 'partial', present };
  return { presence: 'all', present };
}

export async function GET() {
  const integrations: Integration[] = [];

  // ── Pagamentos ────────────────────────────────────────────────────────────
  const mp = check(['MERCADO_PAGO_ACCESS_TOKEN', 'MERCADO_PAGO_WEBHOOK_SECRET']);
  integrations.push({
    category: 'Pagamentos',
    name: 'Mercado Pago',
    status: mp.presence === 'all' ? 'connected' : mp.presence === 'partial' ? 'partial' : 'disconnected',
    message: mp.presence === 'all' ? 'Conectado — pagamentos reais ativos'
      : mp.presence === 'partial' ? `Parcial — falta(m): ${['MERCADO_PAGO_ACCESS_TOKEN', 'MERCADO_PAGO_WEBHOOK_SECRET'].filter(e => !mp.present.includes(e)).join(', ')}`
      : 'Não conectado — checkout em modo simulado',
    envVarsRequired: ['MERCADO_PAGO_ACCESS_TOKEN', 'MERCADO_PAGO_WEBHOOK_SECRET'],
    envVarsPresent: mp.present,
  });

  const stripe = check(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']);
  integrations.push({
    category: 'Pagamentos',
    name: 'Stripe (internacional)',
    status: stripe.presence === 'all' ? 'connected' : stripe.presence === 'partial' ? 'partial' : 'optional',
    message: stripe.presence === 'all' ? 'Conectado' : 'Não conectado — opcional para Fase 1.2 internacional',
    envVarsRequired: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    envVarsPresent: stripe.present,
  });

  // ── Fiscal / NF-e ─────────────────────────────────────────────────────────
  const bling = check(['BLING_CLIENT_ID', 'BLING_CLIENT_SECRET']);
  integrations.push({
    category: 'Fiscal',
    name: 'Bling NF-e',
    status: bling.presence === 'all' ? 'connected' : 'disconnected',
    message: bling.presence === 'all' ? 'Conectado — NF-e automática' : 'Não conectado — emissão manual',
    envVarsRequired: ['BLING_CLIENT_ID', 'BLING_CLIENT_SECRET'],
    envVarsPresent: bling.present,
  });

  // ── Frete ─────────────────────────────────────────────────────────────────
  const melhorEnvio = check(['MELHOR_ENVIO_TOKEN']);
  integrations.push({
    category: 'Frete',
    name: 'Melhor Envio',
    status: melhorEnvio.presence === 'all' ? 'connected' : 'disconnected',
    message: melhorEnvio.presence === 'all' ? 'Conectado — cotação + etiquetas' : 'Não conectado — frete manual',
    envVarsRequired: ['MELHOR_ENVIO_TOKEN'],
    envVarsPresent: melhorEnvio.present,
  });

  // ── Email transacional ────────────────────────────────────────────────────
  const resend = check(['RESEND_API_KEY']);
  integrations.push({
    category: 'Email',
    name: 'Resend',
    status: resend.presence === 'all' ? 'connected' : 'disconnected',
    message: resend.presence === 'all' ? 'Conectado — emails ativos' : 'Não conectado — emails desativados',
    envVarsRequired: ['RESEND_API_KEY'],
    envVarsPresent: resend.present,
  });

  // ── IA ────────────────────────────────────────────────────────────────────
  const anthropic = check(['ANTHROPIC_API_KEY']);
  integrations.push({
    category: 'IA',
    name: 'Anthropic Claude',
    status: anthropic.presence === 'all' ? 'connected' : 'disconnected',
    message: anthropic.presence === 'all' ? 'Conectado — IA ativa (descrições, chatbot, moderação UGC)' : 'Não conectado — modo degradado em todas features de IA',
    envVarsRequired: ['ANTHROPIC_API_KEY'],
    envVarsPresent: anthropic.present,
  });

  // ── Storage ───────────────────────────────────────────────────────────────
  const r2 = check(['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']);
  const storageDriver = process.env.STORAGE_DRIVER ?? 'local';
  integrations.push({
    category: 'Storage',
    name: 'Cloudflare R2',
    status: storageDriver === 'r2' && r2.presence === 'all' ? 'connected'
      : storageDriver === 'local' ? 'partial'
      : 'disconnected',
    message: storageDriver === 'r2' && r2.presence === 'all' ? 'R2 ativo — produção'
      : storageDriver === 'local' ? 'Driver local — uploads no filesystem (dev/staging)'
      : `R2 incompleto — falta: ${['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET'].filter(e => !r2.present.includes(e)).join(', ')}`,
    envVarsRequired: ['STORAGE_DRIVER=r2', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'],
    envVarsPresent: storageDriver === 'r2' ? ['STORAGE_DRIVER=r2', ...r2.present] : ['STORAGE_DRIVER=' + storageDriver],
  });

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  const faqzap = check(['FAQZAP_API_TOKEN']);
  integrations.push({
    category: 'WhatsApp',
    name: 'FaqZap',
    status: faqzap.presence === 'all' ? 'connected' : 'disconnected',
    message: faqzap.presence === 'all' ? 'Conectado' : 'Não conectado — escalação chatbot indisponível',
    envVarsRequired: ['FAQZAP_API_TOKEN'],
    envVarsPresent: faqzap.present,
  });

  // ── Job runner ────────────────────────────────────────────────────────────
  const trigger = check(['TRIGGER_API_URL', 'TRIGGER_API_KEY']);
  integrations.push({
    category: 'Jobs',
    name: 'Trigger.dev',
    status: trigger.presence === 'all' ? 'connected' : 'disconnected',
    message: trigger.presence === 'all' ? 'Conectado — jobs background ativos' : 'Não conectado — jobs em modo síncrono ou desligados',
    envVarsRequired: ['TRIGGER_API_URL', 'TRIGGER_API_KEY'],
    envVarsPresent: trigger.present,
  });

  // ── Resumo ────────────────────────────────────────────────────────────────
  const summary = {
    connected: integrations.filter(i => i.status === 'connected').length,
    partial: integrations.filter(i => i.status === 'partial').length,
    disconnected: integrations.filter(i => i.status === 'disconnected').length,
    optional: integrations.filter(i => i.status === 'optional').length,
    total: integrations.length,
  };

  return NextResponse.json({ integrations, summary, checkedAt: new Date().toISOString() });
}
