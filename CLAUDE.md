# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

Motor único de e-commerce adaptável via templates. Fase 1: duas lojas próprias como laboratório (joias BR + café internacional). Fase 2: SaaS multi-tenant. Documento de referência completo: `ecommerce-requisitos-v1.3.md`.

**Status atual:** pré-código. Etapas 1 e 2 (diagnóstico + decisões de fundação) ainda pendentes.

## Distinção fundamental: Lojeo (sistema) vs Templates (instâncias)

**NUNCA confundir as duas camadas.** São produtos com identidades visuais e marcas diferentes.

| Camada | O que é | Identidade visual | Quem vê |
|---|---|---|---|
| **Lojeo (sistema/produto SaaS)** | Motor + admin + marca corporativa | Identidade Lojeo (neutra, profissional, multi-nicho) | Lojistas (todos os nichos) |
| **Template `jewelry-v1`** | Identidade aplicada na loja de joias BR | Mood/marca de joalheria premium | Clientes finais da loja de joias |
| **Template `coffee-v1`** | Identidade aplicada na loja de café internacional | Mood/marca de café artesanal | Clientes finais da loja de café |

**Regras práticas:**
- Storefront = identidade do template ativo (jewelry-v1 ou coffee-v1)
- Admin = identidade Lojeo (sistema) — usado por todos os lojistas
- Marca corporativa Lojeo = identidade do produto SaaS (logo, paleta, tom de voz da marca-mãe)
- Componentes que vivem no storefront (chatbot widget, galeria UGC, hero personalizado, recomendações) seguem identidade do template
- Componentes que vivem no admin (estúdio criativo IA, IA Analyst, dashboards, fila de moderação UGC) seguem identidade do Lojeo
- Briefings para Claude Design devem declarar explicitamente qual camada está sendo desenhada
- Decisões de UX, branding e tipografia precisam dizer a qual camada se aplicam

## Fluxo de trabalho obrigatório

Antes de qualquer código, seguir sequência:

1. **Etapa 1 — Diagnóstico:** ler `ecommerce-requisitos-v1.3.md` inteiro, apresentar resumo executivo + dúvidas ao stakeholder. Não escrever código.
2. **Etapa 2 — Fundação técnica:** propor stack, arquitetura, multi-tenant design, templates plugáveis, padrões de CI/CD, estratégia de IA. Apresentar opções com prós/contras, recomendar uma, aguardar aprovação.
3. **Etapa 3 — Plano de sprints:** baseado no roadmap da seção 22 do doc balisador. Cada sprint com objetivo, entregável, critérios de pronto, complexidade e pontos de bloqueio (design ou decisão estratégica).
4. **Etapa 4 — Execução:** sprint por sprint, com log de decisões técnicas versionado no repo, testes desde sprint 1, commits atômicos.

## Quando pausar e consultar o stakeholder

Pausar execução e consultar sempre que:
- Houver trade-off custo vs funcionalidade (ex: modelo de IA caro vs barato)
- Integração externa tiver impacto arquitetural duradouro
- Documento balisador for ambíguo no ponto exato em questão
- Funcionalidade não prevista surgir e valer consideração
- Algo se mostrar mais complexo do que o documento sugere e exigir repriorização

Decisões puramente técnicas: tomar autonomamente e registrar no log.

## Quando sinalizar necessidade de design

Interromper e entregar **briefing para Claude Design** quando chegar em:
- Definição de identidade visual do template `jewelry-v1` (tipografia, paleta, homepage, PDP, PLP, checkout)
- Mesmo para `coffee-v1`
- UX do painel administrativo (não protótipos funcionais — esses Claude Code faz)
- Componentes visualmente complexos: estúdio de IA, galeria UGC, dashboard de métricas

Briefing deve conter: contexto, trechos do doc balisador, limitações técnicas, o que se espera receber e formato de entrega.

## Princípios não negociáveis

- **Multi-tenant desde o dia 1:** toda entidade no banco com identificador de tenant, mesmo na Fase 1 com deploys separados
- **API-first:** storefront e admin consomem a mesma API
- **Templates plugáveis de verdade:** o motor não pode conter referências a "joias" ou "café" no código — apenas carrega o template ativo via configuração
- **Fator moleza:** cada decisão de UX no admin passa pelo crivo "um lojista MEI sem conhecimento técnico consegue usar?"
- **Modo degradado:** se IA, gateway ou serviço externo falhar, a loja continua vendendo
- **Segurança e LGPD:** não são "depois" — entram no sprint inicial

## As duas instâncias de laboratório

| | Joias | Café |
|---|---|---|
| Mercado | Brasil | Internacional |
| Idioma/Moeda | PT-BR / BRL | EN-US / USD |
| Pagamentos | Pix, cartão, boleto (Mercado Pago, Pagar.me) | Stripe, PayPal |
| Frete | Correios, Jadlog, FedEx | DHL, FedEx, Correios Internacional |
| Campos extra | Material, pedra, quilate, tamanho, aro | Origem, processo, torra, notas sensoriais |

O motor é idêntico em ambas — apenas template e variáveis de ambiente mudam.

## Integrações planejadas (seção 20 do doc balisador)

- **Pagamentos:** Mercado Pago, Pagar.me, Stripe, PayPal
- **Frete:** Melhor Envio, DHL, FedEx, Correios
- **Fiscal:** Bling ou Olist (NF-e)
- **Email:** Resend ou SendGrid
- **Analytics:** GA4 + GTM
- **Comportamento:** Microsoft Clarity
- **Pixels:** Meta, TikTok, Google Ads
- **WhatsApp:** FaqZap
- **IA:** Anthropic Claude API; geração de imagem/vídeo (providers a definir)
- **Imagem:** Remove.bg / Photoroom

Todas as integrações devem funcionar via fluxo OAuth (1 clique) — sem o lojista copiar chaves manualmente.

## Decisões técnicas pendentes (Etapa 2)

Ainda não definidos — a discutir e aprovar antes de qualquer código:
- Stack: linguagem backend, framework, frontend, banco, ORM, fila de jobs
- Autenticação, hospedagem, CDN
- Estratégia multi-tenant no banco (schema por tenant vs shared com tenant_id)
- Como templates plugáveis carregam no motor
- Padrões de testes, CI/CD, ambientes (dev/staging/prod)
- Provedores de IA para geração de imagem/vídeo e estratégia de custo/cache/fallback

## Log de decisões técnicas

Manter arquivo `DECISION_LOG.md` no repositório. Toda decisão técnica relevante: data, contexto, opções consideradas, escolha feita, justificativa.

## Infra EasyPanel (NÃO criar serviços novos)

Mapa oficial de serviços está documentado em `DECISION_LOG.md` seção "2026-04-26 — Mapa oficial de serviços EasyPanel". Regras:

- Apenas `services.app.deployService` é permitido autonomamente (token master `c620cb5a...`)
- **Nunca** invocar `services.app.createService` sem aprovação explícita do stakeholder
- Service names canônicos: `lojeo-admin`, `lojeo-storefront` (não usar `admin`/`storefront` puros — retornam "Invariant failed")
- `lojeo-postgres` (DB principal Lojeo) ≠ `trigger-postgres` (DB interno do Trigger.dev) — não confundir
- Migrations em produção via `apps/admin/src/app/api/migrate/route.ts` (idempotente, `CREATE TABLE IF NOT EXISTS`)

## Verificação local ANTES de push (OBRIGATÓRIO)

Nunca fazer `git push` sem antes verificar que a mudança funciona em localhost:

1. **Rodar `pnpm dev`** e abrir no browser (`localhost:3000` admin, `localhost:3001` storefront)
2. **Testar o fluxo afetado** pela mudança — não apenas "buildou sem erro"
3. **Se a mudança for visual**, tirar screenshot local e comparar com o esperado
4. **Só então** fazer commit + push

Exceções permitidas (push sem teste local):
- Mudanças puramente em arquivos de configuração/infra que não têm efeito visual (ex: `.github/workflows/`, `Dockerfile`, `turbo.json`)
- Correções de typo em comentários ou documentação

## Verificação de promessas (anti-alucinação)

A cada ciclo de desenvolvimento, antes de marcar checkbox `[x]` como concluído no roadmap, validar a feature em produção:

1. **UX testing com Playwright** em URL real (`apps-lojeo-{admin,storefront}.m9axtw.easypanel.host`), não apenas build local
2. **Feature marcada `[x]` deve responder ao fluxo real** (usuário consegue executar a ação ponta a ponta)
3. **Erros de console = regressão silenciosa** — registrar e corrigir antes de continuar
4. **404, links quebrados, CTAs sem destino** — bloqueiam novo desenvolvimento até serem fixados
5. **Quando uma promessa antiga falhar em UX testing**, fixar ANTES de implementar nova feature — débito de promessa não acumula
