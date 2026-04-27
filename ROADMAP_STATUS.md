# Roadmap Status — Lojeo Fase 1

Atualizado: 2026-04-27 (após 25 batches no /loop autônomo).

## Visão geral

Sprint 0-13 da Fase 1 **production-ready**. Sistema sólido com modo degradado em todas integrações externas. ~250 testes verde. 0 regressão histórica registrada nos últimos 25 batches.

## Coverage por Sprint

### ✅ Sprint 0 — Fundação técnica
Stack Next.js 15 + TypeScript + Drizzle + Postgres + pnpm workspaces + Turbo + Vitest + Playwright + EasyPanel deploy. CI/CD GitHub Actions.

### ✅ Sprint 1 — Motor + catálogo + tracking foundation
Schema multi-tenant, products + variants + collections, behavior_events SDK LGPD-aware.

### ✅ Sprint 2 — Storefront base + instrumentação behavioral
Home + PLP + PDP + Cart, jewelry-v1 template aplicado, tracker provider, sessions_behavior.

### ✅ Sprint 3 — Checkout + pagamentos BR (100%)
- ✓ Mercado Pago Preference (cartão)
- ✓ Mercado Pago Payment direto Pix (QR + copia-cola)
- ✓ Mercado Pago Payment direto Boleto (PDF + linha digitável)
- ✓ Webhook real-mode (lookup + status update)
- ✓ /checkout/confirmacao com QR/PDF + polling 5s
- ✓ /checkout/falha
- ✓ MP-redirect-flow cross-session

### ✅ Sprint 4 — Pedidos + frete + fiscal
Schema orders + order_items + order_events. Frete cotação manual (Melhor Envio integração mock até config). NF-e Bling real-mode (OAuth2 + endpoint admin).

### ✅ Sprint 5 — Admin + wishlist + gift card + back-in-stock
Painel admin completo, wishlist (3 tabs), gift cards, restock_notifications + emit demand threshold.

### ✅ Sprint 6 — CRM + garantias + trocas + segmentação RFM
RFM scoring engine, persona segmentation, returns flow approve+credit+gift card, customer detail page /clientes/[email].

### ✅ Sprint 7 — IA backoffice básica
Wrapper Claude obrigatório (cache + cost tracking + budget cap), descrição produto IA, moderação UGC, IA Analyst.

### ✅ Sprint 8 — IA Analyst + churn + previsão de estoque
Insights linguagem natural, predição churn (scoreChurnBatch), forecast estoque (forecastStockBatch).

### ✅ Sprint 9 — FaqZap + chatbot + tickets + notificações lojista (100%)
- 9/9 hooks emit notification: order.created, order.paid, review.pending, return.requested, inventory.low_stock, restock.demand, fiscal.failed, churn.alert, ticket.assigned
- Bell topbar + página /notificacoes + opt-out granular /notificacoes/preferencias
- Cron secret pra scheduler externo (POST /api/cron/{low-stock,churn}-check)
- Dashboard CriticalAlertsBanner pra notifications severity=critical não lidas

### ✅ Sprint 10 — UGC + galeria + compre o look + moderação
Upload UGC, moderação admin, pgvector embeddings (mock até OpenAI key), tags drag-drop.

### ✅ Sprint 11 — Estúdio criativo IA + motor de recomendação
Recommendations engine (FBT + content-based + collaborative scaffold), CTR tracking, manual overrides UI.

### ✅ Sprint 12 — Busca semântica + pixels + SEO + blog
Pixels GTM/GA4/Meta/TikTok/GoogleAds/Clarity config-driven (consent-aware), Schema.org Product+BreadcrumbList+Organization+WebSite, blog markdown nativo, PWA manifest+SW.

### ✅ Sprint 13 — Polimento + segurança + produção
- GDPR/LGPD: cookie banner + Pixels respeitam consent + /privacidade
- Email transacional 5/5: OrderConfirmation + ShippingNotification + TradeApproved + Welcome + PixGenerated (todos jewelry-v1 templates)
- Security: middleware auth gate /api/* mutations + cron secret + sentinel mask credentials + 2FA TOTP
- Integrações conectáveis 11 providers via UI (Bling, Olist, MP, Stripe, Pagar.me, Melhor Envio, Resend, SendGrid, FaqZap, Anthropic, Trigger.dev)
- A11y: focus-visible globals admin + storefront

## Pendências (V2 — Fase 1.2 ou Fase 2)

### Bloqueadas em providers/credenciais
- Resend Trigger.dev jobs (precisa email key + Trigger.dev account)
- ANTHROPIC_API_KEY pra IA Analyst real (atualmente mock degradado)
- OAuth 1-clique pixels (Google Ads/Meta — precisa apps registrados nos providers)

### Decisões estratégicas (aguardam stakeholder)
- Provider geração imagem IA (Sprint 11 estúdio criativo): OpenAI DALL-E vs Stable Diffusion vs Replicate — custo vs qualidade
- CDN: Cloudflare vs Fastly (Fase 2 SaaS multi-tenant)

### Feature next steps
- Capturar CPF no checkout form storefront (Boleto MP rejeita sem CPF — atualmente skip identification)
- Email template Boleto dedicado (atualmente reusa OrderConfirmation com link no body)
- Tests createMercadoPagoBoletoPayment já feitos. PixGenerated email tests pendentes.
- Coffee-v1 template — Fase 1.2 internacional

## Métricas projeto

- **Tests:** ~250 passing (admin 77, storefront 53, db 20, engine 87, template 3, tracking 7, ai 7, ui 0). 25 skipped em dogfood (precisa DATABASE_URL real).
- **Workspaces:** 12 packages + 2 apps.
- **Sprints:** 14 (0-13). Todos com checklist completo no roadmap-fase1.md.
- **Commits hoje (2026-04-27):** 25 batches, ~50 commits incluindo docs.
- **Deploys:** EasyPanel admin + storefront via webhook.
- **CI:** GitHub Actions verde nos últimos 20+ pushes (após fix CSS no batch 24).

## Doc balisador

`ecommerce-requisitos-v1.3.md` — todas seções 1-22 cobertas pela Fase 1.

## Próximos passos sugeridos

1. **Validar prod E2E**: criar pedido real (Pix mock) → validar email log + notification bell.
2. **Coffee-v1 template**: começar Fase 1.2 internacional (USD + Stripe + DHL/FedEx + EN-US).
3. **Trigger.dev integração real**: cron real low-stock + churn (atualmente botões manuais no admin).
4. **CPF capture checkout**: completa Boleto real-mode.
5. **Audit visual subagent paralelo**: comparar prod vs UI kits oficial após mudanças recentes.
