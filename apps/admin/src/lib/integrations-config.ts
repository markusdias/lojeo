// Sprint 13 — Integration credentials helpers
//
// Tokens vivem em `tenants.config.integrations.<provider>` quando lojista
// conecta via UI. Em PROD para chaves de máxima sensibilidade preferimos env
// vars, mas MEI sem acesso a server precisa de UI 1-clique.
//
// Padrão sentinel: valor mascarado nunca sobrescreve token real no PATCH.

const MASK_PREFIX = '••••';

export interface ProviderField {
  key: string;
  label: string;
  type: 'password' | 'text' | 'email';
  placeholder?: string;
  required?: boolean;
  helper?: string;
}

export interface ProviderDef {
  id: string;
  name: string;
  category: string;
  envVars: string[];
  fields: ProviderField[];
  docsUrl?: string;
  helper?: string;
}

export const PROVIDERS: Record<string, ProviderDef> = {
  bling: {
    id: 'bling',
    name: 'Bling',
    category: 'Fiscal',
    envVars: ['BLING_CLIENT_ID', 'BLING_CLIENT_SECRET'],
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'BLG-...' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    helper: 'Crie um app em developer.bling.com.br · escopos: produtos, pedidos, NF-e.',
    docsUrl: 'https://developer.bling.com.br/aplicativos',
  },
  olist: {
    id: 'olist',
    name: 'Olist Tiny',
    category: 'Fiscal',
    envVars: ['OLIST_API_TOKEN'],
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    helper: 'Token de longa duração em painel Tiny → Configurações → Integrações.',
  },
  mercadopago: {
    id: 'mercadopago',
    name: 'Mercado Pago',
    category: 'Pagamentos',
    envVars: ['MERCADO_PAGO_ACCESS_TOKEN', 'MERCADO_PAGO_WEBHOOK_SECRET'],
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true, placeholder: 'APP_USR-...' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: false, helper: 'Opcional — usado pra validar IPN.' },
    ],
    helper: 'Pegue suas credenciais de produção em mercadopago.com.br/developers/panel.',
    docsUrl: 'https://www.mercadopago.com.br/developers/pt/docs/checkout-api',
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    category: 'Pagamentos',
    envVars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    fields: [
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_live_...' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: false },
    ],
    helper: 'Use chaves "live" para receber pagamentos reais.',
  },
  pagarme: {
    id: 'pagarme',
    name: 'Pagar.me',
    category: 'Pagamentos',
    envVars: ['PAGARME_API_KEY'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    helper: 'Cole a chave de produção da sua conta Pagar.me.',
  },
  melhorenvio: {
    id: 'melhorenvio',
    name: 'Melhor Envio',
    category: 'Frete',
    envVars: ['MELHOR_ENVIO_TOKEN'],
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    helper: 'Token de aplicativo melhorenvio.com.br/painel/aplicativos.',
  },
  resend: {
    id: 'resend',
    name: 'Resend',
    category: 'Email',
    envVars: ['RESEND_API_KEY'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 're_...' },
      { key: 'fromEmail', label: 'Email remetente', type: 'email', required: true, placeholder: 'no-reply@suamarca.com' },
    ],
    helper: 'Verifique seu domínio no Resend antes de ativar.',
  },
  sendgrid: {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'Email',
    envVars: ['SENDGRID_API_KEY'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'fromEmail', label: 'Email remetente', type: 'email', required: true },
    ],
  },
  faqzap: {
    id: 'faqzap',
    name: 'FaqZap',
    category: 'WhatsApp',
    envVars: ['FAQZAP_API_TOKEN'],
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    helper: 'Ativa escalação chatbot → WhatsApp humano. Sem token, chatbot continua respondendo mas sem repassar.',
  },
  triggerdev: {
    id: 'triggerdev',
    name: 'Trigger.dev',
    category: 'Jobs',
    envVars: ['TRIGGER_API_URL', 'TRIGGER_API_KEY'],
    fields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true, placeholder: 'https://api.trigger.dev' },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'tr_pk_...' },
    ],
    helper: 'Jobs assíncronos: emails, sync ERP, geração imagem IA. Sem conexão, jobs rodam síncrono ou ficam off.',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    category: 'IA',
    envVars: ['ANTHROPIC_API_KEY'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-ant-...' },
    ],
    helper: 'Sem key, IA cai em modo degradado. Tracking de custo automático.',
  },
};

export type StoredCredentials = Record<string, string>;

export function maskValue(value: string | undefined): string {
  if (!value) return '';
  return `${MASK_PREFIX}${value.slice(-4)}`;
}

export function isMaskedValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith(MASK_PREFIX);
}

/**
 * Mascara credenciais para retorno no GET. Nunca devolve secret bruto.
 */
export function maskCredentials(creds: StoredCredentials | undefined): StoredCredentials {
  if (!creds) return {};
  const out: StoredCredentials = {};
  for (const [k, v] of Object.entries(creds)) {
    out[k] = maskValue(v);
  }
  return out;
}

/**
 * Faz merge no salvamento: campos mascarados (••••XYZW) são preservados (não sobrescrevem).
 * Campos novos sobrescrevem.
 */
export function mergeCredentials(
  existing: StoredCredentials | undefined,
  incoming: StoredCredentials,
): StoredCredentials {
  const merged: StoredCredentials = { ...(existing ?? {}) };
  for (const [k, v] of Object.entries(incoming)) {
    if (typeof v !== 'string') continue;
    if (isMaskedValue(v)) continue;
    if (v.trim() === '') continue;
    merged[k] = v.trim();
  }
  return merged;
}

/**
 * Provider connected = (a) all envVars set OR (b) all required fields presentes em config.
 */
export function isProviderConnected(
  provider: ProviderDef,
  envPresent: string[],
  storedCreds: StoredCredentials | undefined,
): boolean {
  const envAll = provider.envVars.every((e) => envPresent.includes(e));
  if (envAll) return true;
  if (!storedCreds) return false;
  return provider.fields.filter((f) => f.required).every((f) => Boolean(storedCreds[f.key]));
}

export function listProviders(): ProviderDef[] {
  return Object.values(PROVIDERS);
}

export function getProvider(id: string): ProviderDef | null {
  return PROVIDERS[id] ?? null;
}
