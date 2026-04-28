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
  // ── Pagamentos ──────────────────────────────────────────────────────────
  mercadopago: {
    id: 'mercadopago',
    name: 'Mercado Pago',
    category: 'Pagamentos',
    envVars: ['MERCADO_PAGO_ACCESS_TOKEN', 'MERCADO_PAGO_WEBHOOK_SECRET'],
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true, placeholder: 'APP_USR-...',
        helper: '1. Acesse mercadopago.com.br/developers/panel → Suas integrações → Criar aplicação. 2. Em "Credenciais de produção" copie o Access Token (começa com APP_USR-).' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: false,
        helper: 'Opcional mas recomendado. Gere em Webhooks → Segredo de assinatura.' },
    ],
    helper: 'Principal gateway BR. Taxas aproximadas (consulte tabela atualizada em mercadopago.com.br/costs):\n• Pix: ~0,99% por transação\n• Boleto: ~3,49% + R$3,49 por boleto\n• Débito (Mastercard/Visa): ~1,99%\n• Cartão crédito à vista: ~4,99%\n• Cartão 2–6×: ~5,49–6,49% | 7–12×: ~7,49–8,99%\nCartões aceitos: Visa, Mastercard, Elo, American Express, Hipercard\n\n1. Crie conta em mercadopago.com.br/hub/registration/landing\n2. Acesse Developers → Criar aplicação (tipo: Checkout API)\n3. Copie "Access Token de produção" (APP_USR-...)',
    docsUrl: 'https://www.mercadopago.com.br/developers/pt/docs/checkout-api/landing',
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    category: 'Pagamentos',
    envVars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    fields: [
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_live_...',
        helper: '1. dashboard.stripe.com → Developers → API keys → Secret key. Use chaves "live" (não test).' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: false,
        helper: 'Recomendado. dashboard.stripe.com → Developers → Webhooks → Endpoint → Signing secret (whsec_...).' },
    ],
    helper: 'Gateway internacional. USD/EUR/BRL. Taxas aproximadas (consulte stripe.com/br/pricing):\n• Cartão nacional à vista: ~3,4% + R$0,30\n• Pix: ~1,0% por transação\n• Boleto: ~1,5% + R$0,30\n• Cartão internacional: +1,5% adicional\nCartões aceitos: Visa, Mastercard, American Express, Elo, Diners\nTambém: Apple Pay, Google Pay, Link (1-clique)\n\n1. Crie conta em stripe.com\n2. Ative sua conta (Complete account setup)\n3. Acesse Developers → API keys → Revele e copie a Secret key (sk_live_...)',
    docsUrl: 'https://stripe.com/docs/keys',
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    category: 'Pagamentos',
    envVars: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'AYt...',
        helper: '1. developer.paypal.com → Apps & Credentials → Create App. 2. Selecione "Live" e copie o Client ID.' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true,
        helper: 'Na mesma tela, clique "Show" abaixo do Client ID para revelar o Client Secret.' },
    ],
    helper: 'Pagamentos internacionais. Taxas aproximadas (consulte paypal.com/br/webapps/mpp/merchant/fees):\n• Transações nacionais: ~3,49% + taxa fixa (R$0,47)\n• Transações internacionais: ~4,99% + taxa fixa\n• Sem Pix, sem boleto\nCartões aceitos via PayPal: Visa, Mastercard, American Express, Elo\nComprador pode pagar com saldo PayPal, cartão salvo ou cartão avulso\nRecomendado como método adicional para clientes internacionais\n\n1. Crie conta Business em paypal.com/br/webapps/mpp/merchant\n2. Acesse developer.paypal.com com a mesma conta\n3. My Apps & Credentials → Create App → Live mode → Client ID + Secret',
    docsUrl: 'https://developer.paypal.com/api/rest/',
  },
  pagarme: {
    id: 'pagarme',
    name: 'Pagar.me',
    category: 'Pagamentos',
    envVars: ['PAGARME_API_KEY'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true,
        helper: 'app.pagar.me → Configurações → API keys → Chave de produção (sk_...).' },
    ],
    helper: 'Gateway BR alternativo. Taxas aproximadas (consulte pagar.me/precos):\n• Pix: ~0,99% por transação\n• Boleto: ~R$3,00 por boleto gerado\n• Cartão débito: ~1,99%\n• Cartão crédito à vista: ~2,99%\n• Cartão 2–6×: ~3,49–4,49% | 7–12×: ~5,49–6,99%\nCartões aceitos: Visa, Mastercard, Elo, American Express, Hipercard\n\n1. Crie conta em pagar.me\n2. Acesse app.pagar.me/account/api-keys\n3. Copie a "Chave secreta" de produção (começa com sk_)',
    docsUrl: 'https://docs.pagar.me/docs/api-key',
  },

  // ── Frete ────────────────────────────────────────────────────────────────
  melhorenvio: {
    id: 'melhorenvio',
    name: 'Melhor Envio',
    category: 'Frete',
    envVars: ['MELHOR_ENVIO_TOKEN'],
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true,
        helper: 'Acesse melhorenvio.com.br/painel/gerenciar/tokens → "Criar token" → marque os escopos → copie o token (aparece só uma vez).' },
    ],
    helper: 'Agrega Correios, Jadlog, Loggi, J&T e mais. Cotação em tempo real no checkout.\n\n1. Acesse: melhorenvio.com.br/painel/gerenciar/tokens\n2. Clique em "Criar token"\n3. Modal "Antes de continuar": marque "Li e concordo..." → clique Avançar\n   (aviso normal — token pessoal não aparece no marketplace deles, irrelevante para uso próprio)\n4. Modal "Gerar novo token":\n   — Dê um nome (ex: "Lojeo Produção")\n   — Marque os seguintes escopos (ou clique "Selecionar todos"):\n   ✓ cart-read / cart-write\n   ✓ companies-read\n   ✓ notifications-read\n   ✓ orders-read\n   ✓ shipping-calculate (cotação — essencial para checkout)\n   ✓ shipping-cancel\n   ✓ shipping-checkout (compra com saldo da carteira)\n   ✓ shipping-companies\n   ✓ shipping-generate (gerar etiquetas)\n   ✓ shipping-preview / shipping-print / shipping-share\n   ✓ shipping-tracking (rastreio)\n   ✓ ecommerce-shipping (cotação e compra para loja — essencial)\n   ✓ transactions-read\n   ✓ users-read\n   ✓ webhooks-read / webhooks-write / webhooks-delete\n5. Clique "Gerar token" e copie imediatamente\n   (aparece apenas uma vez — salve antes de fechar)\n\nNota: products-*, coupons-*, companies-write, users-write e tdealer-webhook são opcionais — não utilizados pelo Lojeo.',
    docsUrl: 'https://melhorenvio.com.br/painel/gerenciar/tokens',
  },

  // ── Fiscal ───────────────────────────────────────────────────────────────
  bling: {
    id: 'bling',
    name: 'Bling ERP',
    category: 'Fiscal',
    envVars: ['BLING_CLIENT_ID', 'BLING_CLIENT_SECRET'],
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'BLG-...',
        helper: 'developer.bling.com.br → Meus aplicativos → Criar → copie o Client ID.' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true,
        helper: 'Na mesma tela do aplicativo, copie o Client Secret.' },
    ],
    helper: 'NF-e e NFC-e automáticas por pedido. Sync de estoque e financeiro.\n1. Crie conta em bling.com.br (plano com NF-e incluso)\n2. Acesse developer.bling.com.br → Meus aplicativos → Criar aplicativo\n3. Escopos necessários: Produtos, Pedidos, Nota Fiscal (NF-e)\n4. Copie Client ID e Client Secret',
    docsUrl: 'https://developer.bling.com.br/aplicativos',
  },
  olist: {
    id: 'olist',
    name: 'Olist Tiny',
    category: 'Fiscal',
    envVars: ['OLIST_API_TOKEN'],
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true,
        helper: 'tiny.com.br → Configurações → Integrações → API → Token de acesso.' },
    ],
    helper: 'Alternativa ao Bling. NF-e + sync Olist marketplace.\n1. Crie conta em tiny.com.br\n2. Acesse Configurações → Integrações → API\n3. Copie o token de acesso de longa duração',
    docsUrl: 'https://tiny.com.br/api-docs',
  },

  // ── Email ────────────────────────────────────────────────────────────────
  resend: {
    id: 'resend',
    name: 'Resend',
    category: 'Email',
    envVars: ['RESEND_API_KEY'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 're_...',
        helper: 'resend.com/api-keys → Create API Key → permissão "Sending access".' },
      { key: 'fromEmail', label: 'Email remetente', type: 'email', required: true, placeholder: 'no-reply@suamarca.com',
        helper: 'Precisa ser de domínio verificado no Resend (Domains → Add domain → DNS).' },
    ],
    helper: 'Email transacional recomendado. Confirmação de pedido, rastreio, carrinho abandonado.\n1. Crie conta em resend.com (plano gratuito: 3.000 emails/mês)\n2. Domains → Add domain → adicione seu domínio e configure DNS\n3. API Keys → Create API Key (Sending access)\n4. Cole a key (re_...) e informe seu email remetente verificado',
    docsUrl: 'https://resend.com/docs/api-reference/api-keys/create-api-key',
  },
  sendgrid: {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'Email',
    envVars: ['SENDGRID_API_KEY'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true,
        helper: 'app.sendgrid.com → Settings → API Keys → Create API Key → Full Access.' },
      { key: 'fromEmail', label: 'Email remetente', type: 'email', required: true,
        helper: 'Precisa estar verificado em Settings → Sender Authentication.' },
    ],
    helper: 'Alternativa ao Resend. 100 emails/dia no plano gratuito.\n1. Crie conta em sendgrid.com\n2. Settings → Sender Authentication → verificar domínio ou email\n3. Settings → API Keys → Create API Key (Full Access)\n4. Cole a key e informe o email remetente verificado',
    docsUrl: 'https://docs.sendgrid.com/ui/account-and-settings/api-keys',
  },

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  faqzap: {
    id: 'faqzap',
    name: 'FaqZap',
    category: 'WhatsApp',
    envVars: ['FAQZAP_API_TOKEN'],
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true,
        helper: 'app.faqzap.com.br → Configurações → Integrações → API → Token.' },
    ],
    helper: 'Escalação chatbot → atendente humano via WhatsApp. Sem token, chatbot responde mas não repassa.\n1. Crie conta em faqzap.com.br\n2. Conecte seu número WhatsApp Business\n3. Acesse Configurações → Integrações → API Token\n4. Cole o token acima',
    docsUrl: 'https://faqzap.com.br/docs',
  },

  // ── IA ───────────────────────────────────────────────────────────────────
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    category: 'IA',
    envVars: ['ANTHROPIC_API_KEY'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-ant-...',
        helper: 'console.anthropic.com/settings/keys → Create Key. Recomendado: Claude Sonnet para geração + Haiku para buscas.' },
    ],
    helper: 'Provedor principal de IA. Habilita geração de descrições, SEO, IA Analyst e busca semântica.\n1. Crie conta em console.anthropic.com\n2. Acesse Settings → API Keys → Create Key\n3. Dê um nome (ex: "Lojeo Produção") e copie a chave (sk-ant-...)\n4. Atenção: a chave só aparece uma vez — salve antes de fechar',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax 2.7',
    category: 'IA',
    envVars: ['MINIMAX_API_KEY', 'MINIMAX_GROUP_ID'],
    fields: [
      { key: 'groupId', label: 'Group ID', type: 'text', required: true, placeholder: '1234567890',
        helper: 'platform.minimax.io → clique no avatar (canto superior direito) → Group ID.' },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'eyJ...',
        helper: 'platform.minimax.io → API Key Management → Create API Key.' },
    ],
    helper: 'Alternativa ao Anthropic para evitar dependência de provedor único. API compatível com OpenAI.\n1. Acesse platform.minimax.io com sua conta\n2. Copie o Group ID (avatar → perfil, ou "Basic Information")\n3. Acesse "API Key Management" → Create new key\n4. Cole o Group ID e a API Key acima',
    docsUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key',
  },
  removebg: {
    id: 'removebg',
    name: 'Remove.bg',
    category: 'IA',
    envVars: ['REMOVEBG_API_KEY'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true,
        helper: 'remove.bg/dashboard/api-keys → New API key. Plano gratuito: 50 créditos/mês.' },
    ],
    helper: 'Remove fundo de imagens de produtos automaticamente no estúdio criativo.\n1. Crie conta em remove.bg\n2. Acesse remove.bg/dashboard/api-keys\n3. Clique em "New API Key" e copie',
    docsUrl: 'https://www.remove.bg/api',
  },

  // ── Jobs ─────────────────────────────────────────────────────────────────
  triggerdev: {
    id: 'triggerdev',
    name: 'Trigger.dev',
    category: 'Jobs',
    envVars: ['TRIGGER_API_URL', 'TRIGGER_API_KEY'],
    fields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true, placeholder: 'https://api.trigger.dev',
        helper: 'Para cloud: https://api.trigger.dev. Para self-hosted: sua URL.' },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'tr_pat_...',
        helper: 'app.trigger.dev → seu projeto → API Keys → Personal Access Token.' },
    ],
    helper: 'Jobs assíncronos: emails, sync ERP, geração de mídia IA, reconciliação afiliados.\nSem conexão, jobs críticos rodam síncronos e não-críticos ficam pendentes.\n1. Crie conta em trigger.dev\n2. Crie um projeto ou use o existente\n3. Settings → API Keys → Personal Access Token',
    docsUrl: 'https://trigger.dev/docs/apikeys',
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
