# Programa de Afiliados / Embaixadores — Plano V2

## Spec ecommerce-requisitos-v1.3.md

- **Sec 14.3** Programa de embaixadores: código pessoal + comissão por venda + painel próprio (acompanha vendas, ganhos, materiais de divulgação) + vinculado ao mesmo motor afiliados.
- **Sec 18** Programa de indicação e afiliados com link de código pessoal.
- **Sec 22.3** Fase 1 sprint 3: programa de afiliados/embaixadores.

## Scout best practices (2026)

Refs: ReferralCandy / Tapfiliate / Rewardful / Refersion / Partnero / FirstPromoter.

| Prática | Adotar V1 | V2 |
|---|---|---|
| Self-serve signup storefront (cliente vira afiliado) | ✓ | — |
| Painel próprio afiliado com link/clicks/conversions/earnings | ✓ | — |
| Short link `/r/[code]` (30% CTR > query strings longos) | ✓ | — |
| Cookie 30d (default da indústria) | ✓ existente | — |
| Server-side conversion tracking | ✓ existente (cron reconcile) | — |
| Materiais de divulgação download | Stub (lista textual) | Asset CDN + banners |
| Tiered commissions / SKU rules | — | V2 |
| Multi-tier MLM | — | V2 |
| Auto-enrollment post-purchase | — | V2 |
| Payout via Tremendous/PayPal | — | V2 (manual hoje) |
| Email automation (welcome / payout / monthly stats) | — | V2 |

## V1 atual (já entregue)

- Schema `affiliate_links` com clicks/conversions/payoutCents/pendingCents.
- POST `/api/affiliate/click` increment + cookie 30d.
- Hook `/api/orders` persiste `metadata.affiliateRef`.
- Cron `/api/cron/affiliate-reconcile` detecta paid → conversions/pending.
- Admin `/afiliados` page CRUD (lista, criar, ativar/desativar, payout).
- Endpoints admin `/api/affiliates` + `/api/affiliates/[id]`.

## V2 hoje — gaps a fechar

### 1. Schema `affiliate_links.userId` link com user storefront
Permite cliente logado ter "minha conta afiliado". Coluna existe (nullable) — só plugar.

### 2. Page público `/r/[code]` short link redirect
- GET `/r/ABC123` → increment click + set cookie + redirect homepage (ou `?to=/produtos/anel`).
- Equivalente a `/api/affiliate/click?ref=...&to=...` mas URL bonita pra compartilhar.

### 3. Self-serve signup storefront `/conta/afiliado/cadastro`
- Cliente logado preenche: name, optional bio, code preferido (sanitiza).
- POST `/api/conta/afiliado` cria affiliate_link com `userId`, `affiliate_email`, `code`.
- Auto-aprovação V1 (active=true). V2: lojista review queue.
- 409 se code duplicado.

### 4. Dashboard embaixador `/conta/afiliado`
- Lê affiliate_link by `userId`.
- Mostra:
  - Link pessoal `https://store/r/CODE` (copiable).
  - Clicks total, Conversions, Pending earnings, Paid earnings.
  - Tabela últimas conversões (orders attributed).
  - Materiais de divulgação (lista textual + copy paste).
- Empty state se não cadastrado ainda → CTA pra `/conta/afiliado/cadastro`.

### 5. Endpoint storefront `/api/conta/afiliado` GET/POST
- GET: retorna affiliate_link do user logado (404 se não cadastrado).
- POST: signup form.

### 6. Materiais (V1 stub textual)
- Tenant config `tenant.config.affiliates.materials` array `{title, body, copyText}` editável no admin.
- V1 mock: lista hardcoded — copy padrão jewelry-v1 com placeholders {STORE_NAME}, {LINK}.

## Out of scope (V2+)

- Email welcome/payout/monthly stats
- Asset hosting (banners JPG)
- Tiered commissions
- Multi-level
- Auto-enrollment
- Payout integration (Tremendous/PayPal)
- Coupon code per affiliate (gera cupom único quando cliente usa link → desconto cliente + comissão fixa)
- Fraud detection (afiliado clicando próprio link)

## Validation flow

1. Cliente storefront → `/conta/afiliado` → vê empty + CTA.
2. Clica cadastro → preenche form → POST cria.
3. Volta `/conta/afiliado` → vê link `https://.../r/CODE` + stats zerados.
4. Compartilha link → outro cliente clica `/r/CODE` → cookie set → navega → compra.
5. /api/orders persiste affiliateRef → cron reconcile → pending_cents++.
6. Dashboard refresh → mostra 1 conversão + earnings.
7. Lojista admin paga (offline) → POST `/api/affiliates/[id]/payout` → moves pending → paid.

## Tests

- vitest /api/conta/afiliado signup (zod validation, code duplicate 409).
- Playwright UX: signup flow + dashboard render + /r/[code] redirect com cookie.
