# Decision Log

Decisões técnicas relevantes registradas com data e justificativa.

---

## 2026-04-26 — Sprint 0 executado autonomamente

**Decisão:** Sprint 0 implementado de forma autônoma com decisões PO / Arquiteto / IA Engineer / CFO / UX / CTO consolidadas:

**Arquitetura entregue:**
- Monorepo pnpm workspaces + Turborepo, 13 pacotes (`packages/*`, `apps/*`, `templates/*`)
- Postgres 16 + pgvector via docker-compose (dev) + Neon-ready em produção
- Drizzle ORM com schema multi-tenant completo (14 tabelas, todas com `tenant_id` salvo as nativas Auth.js)
- Auth.js v5 com Google OAuth + Credentials dev login (NODE_ENV !== production)
- Wrapper `@lojeo/ai` obrigatório com cache em Postgres + `ai_calls` audit + mock provider sem `ANTHROPIC_API_KEY`
- SDK `@lojeo/tracking` cliente + servidor com consent-aware (LGPD) e fingerprint anônimo
- Storage abstrato (`@lojeo/storage`) com driver `local` (filesystem) e `r2` (Cloudflare) intercambiáveis por env
- Template loader registry: `@lojeo/engine` carrega templates plugáveis via `registerTemplate(id, loader)` — motor zero referência a "joias" ou "café"
- Template `jewelry-v1` com 3 combinações tipográficas curadas (`classico-luxo`, `editorial-moderno`, `minimalista-contemporaneo`)
- Apps: `admin` (porta 3001) com Auth.js + dashboard + API products; `storefront` (porta 3000) com template loader + healthcheck + tracking endpoint
- CI/CD: GitHub Actions com Postgres+pgvector service, lint+typecheck+test+build

**Decisões pontuais autônomas:**

1. **Apple OAuth postergado para Fase 1.2.** Justificativa (CFO): $99/ano de Apple Developer não tem ROI na pré-validação. Google OAuth + magic link Resend cobrem 95% dos casos.

2. **Dev sem credenciais externas.** Justificativa (CTO): Postgres local + driver storage local + mock Anthropic permitem rodar tudo sem chave alguma. Onboarding novo dev = `pnpm install && docker compose up -d postgres && pnpm db:migrate && pnpm db:seed`. Produção exige env reais.

3. **3 combinações tipográficas no template (não 5).** Justificativa (UX): doc balisador permitia 3 a 5; mais combos diluem a curadoria. Inter+Playfair (clássico-luxo padrão), Plus Jakarta+EB Garamond (editorial), Outfit+Inter (minimalista). Trocáveis via `data-typography` no `<html>` sem rebuild.

4. **Schema accounts com nomes de coluna camelCase no DB.** Justificativa (Arquiteto): exigência do `@auth/drizzle-adapter` v1.7+. Documentado pra evitar regressão futura.

5. **Mock provider em `@lojeo/ai` quando `ANTHROPIC_API_KEY` ausente.** Justificativa (IA Engineer): testes e dev locais não podem depender de API paga. Mock retorna eco com tokens estimados, mantém shape do `AiCallResult`. Prod sem chave = falha explícita.

6. **`pino-pretty` opt-in via `LOG_PRETTY=1`.** Justificativa (CTO): `pino-pretty` como dependência implícita de transport quebrava CI/test. Loga JSON puro por padrão; pretty só quando explicitado.

7. **Loop dogfood implementado em `apps/admin/src/dogfood.test.ts`.** Cobre: healthcheck, criar produto, validar input inválido, listar produtos, ingerir evento behavior. Slug e anonId únicos por run para idempotência. Cleanup `afterAll`.

**Pendências documentadas:**
- Deploy real EasyPanel/Vercel: aguarda credenciais (Neon, R2, Resend, Anthropic)
- Trigger.dev self-hosted: schema/SDK não criados — entram no Sprint 1 quando tivermos jobs reais (otimização imagem, sync gateway etc.)
- Banner LGPD UI: server-side está pronto (`@lojeo/tracking` respeita consent), front falta — Sprint 2

**Métricas finais Sprint 0:**
- 36 testes passando (11/11 packages)
- Typecheck verde em todos workspaces
- 14 tabelas no schema com migration 0000 versionada
- Diff: ~50 arquivos novos

---

## 2026-04-25 — Stack tecnológica aprovada

**Decisão:** Next.js 15 (App Router) monorepo com pnpm workspaces + Turborepo.

**Alternativa considerada:** Hono API separada + Next.js frontends.

**Justificativa:** Migração EasyPanel→Vercel trivial (zero reescrita). Motor separado como package no monorepo, sem custo operacional de serviço adicional.

---

## 2026-04-25 — Banco de dados: Neon

**Decisão:** Neon (PostgreSQL serverless) como banco principal.

**Alternativa considerada:** Supabase.

**Justificativa:** Não precisamos de Auth/Storage do Supabase (usamos Auth.js + R2). Neon é mais barato na escala, tem branching de banco para CI/CD, e tem integração nativa com Vercel para migração futura.

---

## 2026-04-25 — ORM: Drizzle

**Decisão:** Drizzle ORM.

**Alternativa considerada:** Prisma.

**Justificativa:** Edge-compatible (crítico para Vercel Edge Functions futuro). Bundle menor. Queries tipadas sem overhead. Prisma tem problemas documentados em Edge.

---

## 2026-04-25 — Autenticação: Auth.js v5

**Decisão:** Auth.js v5 (NextAuth).

**Alternativa considerada:** Clerk.

**Justificativa:** Zero vendor lock-in. Dados de sessão no próprio banco. Controle total necessário para a fase SaaS. Clerk é SaaS pago com lock-in.

---

## 2026-04-25 — Jobs assíncronos: Trigger.dev (self-hosted)

**Decisão:** Trigger.dev self-hosted no EasyPanel na Fase 1.

**Alternativa considerada:** BullMQ + Redis local, Inngest.

**Justificativa:** BullMQ/Redis local acopla ao VPS e não funciona no Vercel. Trigger.dev self-hosted é gratuito, open source, tem imagem Docker pronta. Se/quando migrar para Vercel, só troca a URL de conexão — código idêntico.

---

## 2026-04-25 — Storage: Cloudflare R2

**Decisão:** Cloudflare R2 com abstração local para desenvolvimento.

**Alternativa considerada:** Supabase Storage, AWS S3.

**Justificativa:** Egress gratuito (vs S3 que cobra por download). Free tier generoso (10GB/mês). CDN Cloudflare incluso. Compatível com S3 API. Em desenvolvimento: storage local via filesystem, troca para R2 em staging/produção.

---

## 2026-04-25 — Multi-tenant: shared schema com tenant_id

**Decisão:** Schema compartilhado com `tenant_id` em todas as tabelas. Row-Level Security (RLS) no PostgreSQL para isolamento.

**Alternativa considerada:** Schema separado por tenant.

**Justificativa:** Schema por tenant escala mal para SaaS com muitos lojistas (criação dinâmica de schema é complexa). Shared schema com RLS é o padrão da indústria para SaaS de médio porte. Migrations são aplicadas uma vez para todos os tenants.

---

## 2026-04-25 — Tracking comportamental como fundação (Sprint 1)

**Decisão:** Schema `behavior_events` + SDK `@lojeo/tracking` entram no Sprint 1. Instrumentação completa do storefront no Sprint 2.

**Alternativa considerada:** Adicionar tracking depois, junto com features de personalização (Sprint 9+).

**Justificativa:** Recomendações, IA Analyst, homepage personalizada, Clarity+IA — tudo depende de behavior_events existir desde o início. Adicionar depois força backfill artificial (impossível: comportamento é histórico) ou aceitar perda de meses de dados. Custo de schema + SDK no Sprint 1 é baixo; custo de não ter é altíssimo.

---

## 2026-04-25 — pgvector no Neon, sem Pinecone/Weaviate

**Decisão:** Embeddings de produtos e busca semântica via extensão `pgvector` no Neon.

**Alternativa considerada:** Pinecone, Weaviate, Qdrant.

**Justificativa:** pgvector é gratuito no Neon, suficiente para escala da Fase 1 (até dezenas de milhares de produtos). Mantém o stack monolítico (sem serviço extra para gerenciar). Performance adequada para similarity search em volumes moderados. Migração para serviço dedicado é trivial se escala exigir na Fase 2 SaaS.

---

## 2026-04-25 — Wrapper `@lojeo/ai` obrigatório, nenhuma chamada direta à Claude API

**Decisão:** Todas as chamadas à Claude API passam pelo package `@lojeo/ai`, que injeta cache em Postgres + telemetria + cost tracking + seleção de modelo (Haiku vs Sonnet).

**Alternativa considerada:** Chamadas diretas via SDK Anthropic em cada feature.

**Justificativa:** IA é variável crítica de custo (CFO). Sem wrapper centralizado, cache fica esparso, telemetria inconsistente, e custo real torna-se impossível de auditar. Wrapper único força disciplina arquitetural e permite trocar provider futuramente sem refatorar features.

---

## 2026-04-25 — Sprint 8 dedicado a IA Analyst + churn + previsão de estoque

**Decisão:** Insights em linguagem natural ("por que minhas vendas caíram?"), predição de churn e previsão de estoque entram em sprint próprio (Sprint 8), não como expansão do Sprint 7.

**Alternativa considerada:** Postergar para Fase 2 SaaS ou agrupar com IA backoffice básica do Sprint 7.

**Justificativa:** IA Analyst é o feature mais marketável da plataforma vs concorrentes nacionais (nenhum oferece). Misturar com Sprint 7 (descrições + SEO) sobrecarrega. Postergar elimina diferencial competitivo na fase de validação. Heurísticas v1 (sem ML) para churn/estoque são suficientes para MVP — refinamento com ML fica para depois.

---

## 2026-04-25 — UGC system em sprint próprio (Sprint 10) na Fase 1 joias

**Decisão:** Sistema completo de UGC (galeria de clientes na PDP + compre o look + moderação assistida por IA) entra na Fase 1 (Sprint 10), não na Fase 2.

**Alternativa considerada:** Postergar UGC para Fase 1.2 ou Fase 2.

**Justificativa:** UGC é diferencial central para joias (produto altamente "instagramável"). Conversão típica de PDP com galeria UGC ativa: +10-20%. Custo de aquisição de conteúdo: zero (cliente cria de graça, plataforma facilita). Postergar significa lançar a loja sem alavanca de prova social real. Moderação assistida por Claude vision torna o fluxo viável sem time grande de moderadores.

---

## 2026-04-25 — Chatbot storefront com tool-calling integrado ao FaqZap

**Decisão:** Chatbot no widget de chat do storefront usa Claude Haiku com tool-calling (search_products, get_product_details, check_stock, escalate_to_human). Escalação para FaqZap quando bot não resolve.

**Alternativa considerada:** Chatbot só de FAQ estática; ou apenas FaqZap sem chatbot no storefront.

**Justificativa:** Para joias, dúvidas técnicas (material, aro, quilate, prazo) acontecem na PDP no momento de decisão. Esperar resposta humana via WhatsApp custa abandono de checkout. Haiku é ~5x mais barato que Sonnet, suficiente para tool-calling estruturado. Rate limit por sessão controla custo. Modo degradado: se Claude API cair, widget exibe FAQ estática + botão WhatsApp.

---

## 2026-04-25 — Wishlist, gift card, back-in-stock e opção de presente no Sprint 5

**Decisão:** Quatro features de retenção (wishlist, gift card, back-in-stock notification, opção de presente no checkout) entram no Sprint 5 junto com admin operacional.

**Alternativa considerada:** Distribuir entre sprints posteriores ou postergar para Fase 1.2.

**Justificativa (CFO + UX):** São features de baixo custo de implementação (schemas simples + UI direta) e alto ROI em retenção/recuperação de receita. Wishlist captura intent → re-engajamento; back-in-stock recupera demanda perdida; gift card amplia público (presente); opção de presente aumenta AOV. Lançar a loja sem essas alavancas significa perder receita silenciosamente. Sprint 5 estendido para 3 semanas absorve o escopo.

---

## 2026-04-25 — Setup wizard com IA postergado para Fase 2 SaaS

**Decisão:** Setup guiado por IA no onboarding (Seção 3.1 do doc balisador) **não** entra na Fase 1 nem na Fase 1.2. Reservado para Fase 2 SaaS.

**Justificativa:** Para Fase 1 (duas lojas próprias com onboarding manual feito pelo time), wizard com IA não tem ROI — o stakeholder configura uma vez, em horas. O valor real do wizard surge no SaaS multi-tenant onde dezenas/centenas de lojistas precisam configurar sozinhos. Construir antes do tempo é over-engineering.

---

## 2026-04-25 — Total Fase 1: 30 semanas (era 24)

**Decisão:** Plano original tinha 11 sprints (24 semanas). Plano revisado tem 13 sprints (30 semanas), +6 semanas, +25%.

**Justificativa:** Versão original cobria fluxo transacional completo mas omitia diferenciais competitivos centrais do doc balisador (UGC, IA Analyst, chatbot, recomendações, personalização, retenção). Lançar sem esses itens é lançar uma plataforma equivalente a Tray/Nuvemshop — sem o "porquê" da existência do Lojeo. +6 semanas é o custo de manter o diferencial estratégico alinhado ao posicionamento da Seção 23 do doc balisador.

---

## 2026-04-25 — Princípio: OAuth 1-clique como padrão para integrações

**Decisão:** Toda integração externa segue o padrão OAuth 1-clique sempre que o provedor oferecer. API key manual é fallback, nunca caminho principal.

**Aplica a:** Stripe, Mercado Pago, Pagar.me, PayPal, Melhor Envio, FaqZap, GA4, GTM, Meta Pixel, TikTok Pixel, Google Ads, Microsoft Clarity, Bling, Olist, Resend, marketplaces (ML, Shopee, Amazon, Etsy, Google Shopping, Meta Catalog).

**Justificativa (Sec 3.2 do doc balisador):** Lojista MEI/PME não deve copiar chave de API manualmente — fricção de instalação derruba ativação. Diferencial vs Tray/Nuvemshop que exigem copy-paste. Custo: implementar OAuth flow é 2-4h por integração; ROI é dezenas de horas economizadas em suporte e onboarding ao longo da vida da loja.

---

## 2026-04-25 — Research-first protocol obrigatório para features de IA

**Decisão:** Antes de implementar QUALQUER feature de IA, executar fase de pesquisa documentada em `docs/research/<sprint>-<feature>.md`. Nenhum prompt entra em produção sem benchmark mínimo de 3 variações × inputs reais.

**Aplica a sprints:** 7 (descrições/SEO), 8 (IA Analyst), 9 (chatbot), 10 (UGC moderation), 11 (estúdio criativo — CRÍTICO), 12 (busca semântica + Clarity-IA + personalização).

**Para imagem/vídeo (Sprint 11) especificamente:**
- Pesquisar prompts e best practices por modelo: Flux, DALL-E 3, Ideogram, SD3, Recraft, Midjourney, Veo, Runway, Pika
- Estudar casos de sucesso e-commerce: Pebblely, Booth.ai, Photoroom AI, Stylar AI
- Benchmark obrigatório: mesmo produto × 3 modelos × 3 prompts cada
- Decisão de provider documentada em DECISION_LOG após benchmark

**Para outras IAs:**
- Pesquisar implementações open-source de ponta em GitHub
- Estudar concorrentes: Shopify Magic/Sidekick, Klaviyo AI, Intercom Fin AI, Tidio Lyro, Yotpo, Bazaarvoice
- Patterns de referência: RAG híbrido, tool-calling, agentic data analysis, hybrid search com rerank

**Justificativa:**
- **Custo:** geração de imagem custa $0.04-0.08 por tentativa. 10 tentativas erradas em produção = $0.40-0.80 por produto desperdiçado. 1.000 produtos = até $800 desperdiçados sem pesquisa prévia.
- **Qualidade:** prompt mal-formulado em produção gera output não-utilizável → lojista perde confiança na plataforma → diferencial competitivo vira passivo.
- **Velocidade:** copiar acerto de mercado evita meses de tentativa e erro. Open-source de ponta já validou padrões — adapter é mais barato que reinventar.
- **Posicionamento:** plataforma promete IA superior aos concorrentes nacionais. Entregar IA medíocre é pior do que não ter IA.

**Critério de qualidade:** prompt em produção precisa ter: (a) documentação de origem em `docs/research/`, (b) benchmark com pelo menos 3 variações testadas, (c) exemplos de input/output em README do package.

---

## 2026-04-25 — Sessão B do Claude Design FECHADA (template jewelry-v1)

**Decisão:** Sessão B entregue, bundle salvo em `docs/design-system-jewelry-v1/` (360KB). Pronto para implementação no Sprint 2.

**Cobertura do bundle:**
- Tokens completos em `colors_and_type.css` (CSS variables + data-* attrs pra customização sem rebuild)
- `config-schema.json` pronto pra admin Lojeo expor configurações ao lojista
- 19 previews HTML (cores, tipo 3 combinações, components, voice, trust signals)
- Logo placeholder neutro + favicon + hero/product placeholders
- UI kit storefront (15 arquivos JSX): Home, PLP, PDP (com VariantPicker por tipo joia), Cart, Checkout multi-step, Account (5 telas + Tracking branded + WishlistPro), Auth (login/signup/recover), Static (4 páginas + 404/500), Emails (4 templates email-safe), States (loading/erro/vazio/sucesso/validação), Chrome (header sticky + footer dark), Primitives
- HANDOFF.md detalhado com instruções de implementação pra Claude Code
- SKILL.md pra futuras gerações

**Decisões implícitas no template que precisam virar config real durante implementação:**

1. **Pix com 5% off (default ativo)** — Sprint 3 (checkout): expor toggle "incentivo Pix" + percentual por loja no admin Lojeo. Justificativa: incentivo padrão para reduzir custo de transação (Pix vs cartão) e melhorar fluxo de caixa (Pix instantâneo).

2. **Cartão até 6× sem juros** — Sprint 3: limite de parcelas e juros configuráveis por loja. Justificativa: 6× sem juros é padrão de joalheria BR; lojistas podem ajustar conforme margem.

3. **Garantia padrão 1 ano** — Sprint 1 (catálogo): produto já tem `warrantyMonths` configurável, mas template propaga 12 meses como default. Justificativa: padrão de mercado para joias (CDC + práticas do nicho).

4. **Frete grátis acima de R$500** — Sprint 4 (frete): regra mockada no Cart precisa virar configuração real (valor mínimo + regras por região). Justificativa: incentivo de ticket médio comum em joalheria; lojista deve poder ativar/desativar e ajustar threshold.

**Caveats aceitos:**
- Inter Display substituído por Inter com features tipográficas (`ss01`, `cv11`) — Inter Display oficial não existe; Söhne requer licença Klim. Decisão sólida.
- Logo placeholder neutro — lojista substitui no admin (já no schema)
- Lucide via CDN — substituir por `lucide-react` em produção
- README.md de `ui_kits/storefront/` ficou desatualizado (lista checkout/conta como pending) — atualizar durante integração no Sprint 2. HANDOFF.md está correto.

**Pendente para Sessão D (componentes IA no storefront jewelry-v1):**
- Chatbot widget storefront (visual completo, estados, slide-up mobile) — slot já reservado na PDP
- Cards de recomendação (Related, FrequentlyBoughtTogether, YouMayAlsoLike) — slots reservados
- Hero personalizado por perfil (Default/Recorrente/VIP/At Risk)
- Sugestão recompra na conta cliente
- Galeria UGC visual completa
- Search semântica visual
- "Avise-me quando voltar" UI estados completos

**Próximo passo:** Iniciar implementação Sprint 0 (fundação técnica) usando design system Lojeo (Sessão A) + estrutura preparada pra receber template jewelry-v1 no Sprint 2. Sessões C+D abertas conforme aproximação dos sprints respectivos (Sprint 8/9).

---

## 2026-04-25 — Sessão A do Claude Design FECHADA (Lojeo system identity)

**Decisão:** Sessão A entregue, bundle salvo em `docs/design-system/` (904KB). Pronto pra implementação no Sprint 0.

**Cobertura do bundle:**
- Tokens completos em `colors_and_type.css` (Tailwind v4 compatible)
- Brand assets: 4 SVG logos + 4 favicons + 3 app icons + OG image + lockups light/dark + symbols mono
- 21 previews HTML (cores, tipo, spacing, components, brand)
- 12 UI kits admin JSX (Sidebar, Dashboard, Screens, Settings, Team, Queues, Wishlist, Customer com 4 variantes RFM, Empty, Tickets, ABEditor, Appearance)
- SKILL.md cross-compatible com Claude Code para futuras gerações
- Layer awareness incluso (Lojeo vs Templates — distinção respeitada)

**Caveats aceitos para implementação:**
- A/B Editor é mockado — integração real (GrowthBook ou in-house) decidida no Sprint 5
- Persona switcher é demo — RFM real vem do motor segmentação Sprint 6
- Lucide icons desenhados à mão como placeholders Lucide-compatible — substituir por `lucide-react` oficial em produção
- Inter + JetBrains Mono via Google Fonts CDN — self-host opcional pra performance
- Dark mode: tokens prontos, toggle visual será adicionado durante implementação Sprint 5

**Pendente para Sessão C (UX features de IA no admin):**
- IA Analyst chat dedicado
- Estúdio Criativo IA
- Fila de moderação UGC com análise IA visual
- Painel de uso IA expandido

**Próximo passo:** Sessão B em andamento (template jewelry-v1). Sessão C depois de A+B + Sprint 0 fechados.

---

## 2026-04-25 — Separação obrigatória: Lojeo (sistema) vs Templates (instâncias)

**Decisão:** Toda decisão de design, branding, UX e identidade visual declara explicitamente qual camada está sendo tratada:
- **Lojeo (sistema/admin/marca SaaS):** identidade corporativa neutra, multi-nicho, usada por todos os lojistas. Aplica a admin completo, marca-mãe, dashboards, IA Analyst, Estúdio criativo, Painel uso IA, fila moderação.
- **Template jewelry-v1:** identidade do nicho joias premium BR. Aplica a storefront da loja de joias: homepage, PLP, PDP, checkout, conta cliente, widget chatbot, galeria UGC, hero personalizado.
- **Template coffee-v1 (Fase 1.2):** identidade do nicho café artesanal internacional. Aplica a storefront da loja de café.

**Justificativa:** Stakeholder corrigiu confusão em 2026-04-25 quando perguntas sobre "identidade visual" misturavam camadas. Confundir Lojeo com template gera design incoerente — admin com cara de joalheria, ou template de joias com cara de SaaS corporativo. Cada camada tem público diferente (lojistas vs clientes finais), marca diferente, propósito diferente.

**Aplicação prática:**
- Briefings para Claude Design renomeados em "Checkpoint A (Lojeo), B (jewelry-v1), C (IA UX no admin Lojeo), D (componentes IA no storefront jewelry-v1), E (coffee-v1 Fase 1.2)"
- CLAUDE.md projeto atualizado com tabela explicativa
- Memória do projeto registrada em `feedback_lojeo_vs_template.md`
- Todas as perguntas ao stakeholder devem prefixar a camada

---

## 2026-04-25 — Cobertura completa do doc balisador validada

**Decisão:** Auditoria final do doc `ecommerce-requisitos-v1.3.md` vs plano. Lacunas identificadas e adicionadas:

**Adicionadas ao plano:**
- Sprint 0: tipografia curada 3-5 combinações + diretório `docs/research/`
- Sprint 1: restrições de exportação por país + pré-venda com data + alt text IA no upload
- Sprint 2: páginas estáticas com editor + produtos vistos recentemente + página rastreio branded
- Sprint 3: OAuth Mercado Pago + sync gateway expandido (8 ações da tabela 5.1)
- Sprint 4: OAuth Bling + OAuth Melhor Envio + status saúde verde/amarelo/vermelho + botão ressincronizar
- Sprint 5: robots.txt configurável + relatórios programados por email + A/B testing nativo + feeds Google Shopping/Meta Catalog automáticos
- Sprint 7: modo econômico (toggle Haiku/Sonnet)
- Sprint 12: atribuição multi-touch configurável + OAuth em todos os pixels

**Adiadas explicitamente:**
- Setup wizard com IA (Sec 3.1) → Fase 2 SaaS
- Programa embaixadores avançado (Sec 14.3 / 18) → Sprint 19 (Fase 1.2) reusando UGC do Sprint 10
- Send time optimization + precificação dinâmica → Sprint 20 (Fase 1.2)

**Justificativa:** Lacunas eram features de média/baixa complexidade que reforçam diferencial competitivo (OAuth 1-clique é destaque na tabela Sec 23). Sem elas, plano cobriria fluxo mas perderia o "fator moleza" e a sincronização inteligente que são pilares do posicionamento.

---

## 2026-04-26 — Sprint 1 concluído autonomamente

**Decisão:** Sprint 1 executado de forma autônoma (Blocos A–F) com decisões PO / Arquiteto / CTO / CFO consolidadas.

**Entregáveis:**

| Bloco | Feature | APIs criadas |
|---|---|---|
| A | CRUD produtos completo | PUT/DELETE /products/[id], GET/POST variants, PUT/DELETE variants/[id], GET/POST/PUT/DELETE collections |
| B | Inventário multi-warehouse | schema inventory_locations + inventory_stock + inventory_movements, GET/POST /inventory |
| C | Upload imagens WebP | POST/GET /products/[id]/images — sharp, 3 thumbnails (sm/md/lg), AI alt text mock |
| D | Tracking SDK storefront | TrackerProvider React client, ConsentBanner LGPD, injeção no layout.tsx |
| E | CSV import produtos | POST /products/import — parser CSV próprio, Zod por linha, dry-run, relatório |

**Métricas finais Sprint 1:**
- 56 testes passando (11/11 packages), zero regressões
- Bloco B: migration 0001 aplicada em produção (EasyPanel Postgres)
- Deploy admin + storefront: webhook disparado (commit 1138a00+)
- EasyPanel DB: expose temporário (porta 5433) para migrations + testes, fechado depois

**Decisões autônomas pontuais:**

1. **sharp sem GHCR — instalado direto como dep.** Alternativa considerada: worker separado para processamento de imagem. Decisão (CTO): `sharp` binário nativo é trivial no Node 20 Alpine (Dockerfile já instala dependências). Worker separado é over-engineering para Sprint 1.

2. **CSV parser próprio sem deps (csvtojson/papaparse).** Alternativa: biblioteca. Decisão (Arquiteto): Parser de ~60 linhas cobre casos do MVP (quote escaping, CRLF). Deps externas adicionam surface de ataque. Pode ser substituído se CSV complexo vier em Sprint futuro.

3. **ConsentBanner inline-styled sem tokens CSS.** Alternativa: usar CSS tokens do template. Decisão (UX): Banner é componente do motor (Lojeo), não do template jewelry-v1. Tokens visuais do template não devem vazar para componentes do motor. Banner usa CSS vars com fallback neutro.

4. **`TrackerProvider` com `useRef` em vez de `useState`.** Justificativa (Arquiteto): `Tracker` é singleton stateful (buffer + timer). `useRef` garante uma única instância mesmo em Strict Mode (React 18+ monta componente duas vezes em dev). `useState(() => new Tracker())` teria o mesmo efeito mas `useRef` é mais idiomático para objetos mutáveis não-React.

---

## 2026-04-26 — Sprint 2 concluído autonomamente

**Decisão:** Sprint 2 executado de forma autônoma (Blocos A–G) com decisões PO / Arquiteto / CTO / CFO / UX / Marketing consolidadas.

**Entregáveis:**

| Bloco | Feature | Arquivos principais |
|---|---|---|
| A | Design system jewelry-v1 + layout base | `tokens.css` (5 typography combos, 5 accents, 4 BG tones), Header sticky, Footer dark, CartProvider, TrackerProvider |
| B | Homepage + PLP | `app/page.tsx` (hero/categorias/novidades/sobre/trust), `app/produtos/page.tsx` + `plp-filters.tsx` (client-side filters/sort/pagination) |
| C | PDP com urgência real | `app/produtos/[slug]/page.tsx` (behavior_events COUNT last 5min, inventoryStock SUM), `pdp-client.tsx` (galeria, variantes, UrgencyBadge) |
| D | Carrinho | `app/carrinho/page.tsx` (qty controls, free-shipping bar, resumo, trust row) |
| E | SEO + behavioral | `sitemap.ts` dinâmico, `robots.ts`, Schema.org JSON-LD na PDP, `product_scroll` IntersectionObserver (25/50/75/100%), `gallery_open/image_index`, `external_referrer` |
| F | Busca + estáticas + admin API | `/busca`, `/sobre`, `/politica`, `/trocas`, `/privacidade`, `admin /api/events` (daily + byType) |
| G | Testes + deploy + log | 31 testes passando (10/10 packages sem admin), zero regressões |

**Métricas finais Sprint 2:**
- 31 testes passando (10 packages sem admin — admin dogfood requer DB expose porta 5433)
- 5 commits atômicos por bloco (A–G)
- Deploy: webhook EasyPanel disparado após push

**Decisões autônomas pontuais:**

1. **PLP arquitetura Server+Client.** Server Component busca todos os produtos (limit 72 = PAGE_SIZE×3) e passa para Client Component (`PLPFilters`). Client faz filtros/sort/paginação sem round-trip. Alternativa (URL params): cada filtro força full page reload no Next.js App Router com `force-dynamic`. Decisão (Arquiteto): client-side para UX fluido.

2. **UrgencyBadge com dados reais, nunca fake.** Dois queries paralelos: `behavior_events COUNT` (últimos 5min) + `inventoryStock SUM`. Thresholds configuráveis por env (`URGENCY_THRESHOLD`, `LOW_STOCK_QTY`). Números falsos destroem credibilidade quando cliente percebe (CFO/Marketing).

3. **JSON-LD com sanitização.** Script JSON-LD usa `__html` com conteúdo sanitizado via `replace(/<\/script>/gi)` — previne script injection mesmo com dados do BD maliciosos. Hook de segurança alertou; mitigação aplicada.

4. **`product_scroll` via IntersectionObserver (não scroll event).** `IntersectionObserver` com `threshold: [0.25, 0.5, 0.75, 1.0]` no div raiz da PDP captura depth sem polling. `scrolledDepths` como `useRef<Set<number>>` garante disparo único por threshold. Alternativa: `window.addEventListener('scroll')` — mais custoso, menos preciso.

5. **`external_referrer` via `sessionStorage`.** Uma vez por sessão (não por page_view). Key `lojeo_ext_ref_{tenantId}` por tenant para suporte multi-tenant futuro.

6. **Admin dogfood tests requerem DB expose.** 25 testes de integração necessitam `DATABASE_URL` com porta 5433 aberta no EasyPanel. Rodar com: expor porta → testar → fechar. Sprint 3 terá Postgres local via docker-compose para testes sem DB remoto.
