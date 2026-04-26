# Bloqueadores externos — Prioridade CFO/PO (Fase 1)

> **Contexto:** Lojeo Fase 1 tem features bloqueadas por credenciais/OAuth de provedores externos. Este documento orienta CFO/PO sobre o que destravar primeiro para um lançamento mínimo viável (MVP) — foco loja BR de joias vendendo de verdade.
>
> **Princípio operacional:** o motor já roda em modo degradado. Cada provedor abaixo destrava uma capacidade real, mas a loja continua online mesmo sem nenhum deles (checkout simulado, NF manual, e-mail desligado, IA com fallback).
>
> **Premissa:** custos abaixo são estimativas para uma loja em estágio inicial (até ~500 pedidos/mês, ~50 SKUs, time enxuto). Revisar quando cruzar 1k pedidos/mês.

## Tabela mestra de bloqueadores

| Provider | Feature destravada | Custo mensal estimado | Tempo setup | Prioridade | Observação CFO |
|---|---|---|---|---|---|
| **Mercado Pago** | Pix, cartão, boleto BR (checkout real) | R$ 0 fixo + take rate 0,99–4,99% por venda | 1–2 dias (OAuth + webhook + KYC) | **P0** | Sem MP não há receita BR. Take rate é COGS direto, não OPEX. |
| **Resend** | E-mail transacional (pedido confirmado, recuperação carrinho, NF anexada) | US$ 20 (plano Pro até 50k e-mails) | 2–4h (DNS SPF/DKIM/DMARC) | **P0** | E-mail é o único canal de pós-venda confiável e barato. Sem ele, abandono dispara. |
| **Anthropic Claude API** | Geração de copy real (descrições, SEO, IA Analyst, moderação UGC) | ~US$ 50 (uso moderado, Haiku majoritário, Sonnet em premium) | 1h (gerar key, configurar caps) | **P0** | Diferencial competitivo do Lojeo. Sem ela, IA Analyst e Estúdio rodam em mock. |
| **Bling NF-e** | Emissão automática NF-e ao faturar pedido | R$ 95 (plano Bling 1) + certificado A1 ~R$ 200/ano | 3–5 dias (cadastro fiscal CNPJ + emissão teste + integração) | **P1** | Obrigatório legal para venda física. Pode começar manual, mas trava escala >50 pedidos/mês. |
| **Melhor Envio** | Cotação automática Correios + Jadlog + transportadoras + etiqueta | R$ 0 plataforma; frete por venda repassado | 1 dia (OAuth + cadastro endereço origem) | **P1** | Reduz fricção checkout (cliente vê preço/prazo real). Sem ele, frete fixo manual. |
| **VAPID keys (PWA push)** | Notificações push browser (carrinho abandonado, back-in-stock) | R$ 0 (gerar par via web-push) | 30min (gerar + ENV) | **P2** | Engajamento orgânico, mas só vale após PWA estar live (Sprint 12+). Não bloqueia venda. |
| **Microsoft Clarity** | Heatmaps + IA insights de UX | R$ 0 (gratuito, plano Microsoft) | 1h (criar projeto + cole ID) | **P2** | Insight de friction mas não vende. ID já está no schema de pixels. |
| **Trigger.dev self-hosted** | Jobs assíncronos (envio e-mail, NF-e, embeddings, recálculo recomendação) | ~R$ 50 (VPS dedicada no EasyPanel já provisionada) | Já provisionado no EasyPanel; falta credencial no admin | **P1** | Necessário antes de Sprint 7 (IA backoffice). Já existe `trigger-postgres`. |
| **Cloudflare R2** | Storage de assets/imagens em produção (substitui local FS) | US$ 0 free tier até 10 GB; ~US$ 1,50/mês a partir disso; egress grátis | 1h (criar bucket + API token) | **P2** | Driver `local` cobre dev/staging. Migrar pré-Black Friday. |
| **Stripe / PayPal (USD)** | Pagamentos internacionais (loja café Fase 1.2) | US$ 0 fixo + 2,9% + US$ 0,30 por transação | 1–2 dias por provider | **P3** | Fora do escopo Fase 1 (loja joias BR). Reabrir só na Fase 1.2. |
| **DHL / FedEx (frete intl)** | Cotação internacional loja café | Varia por contrato | 5–15 dias (KYC + contrato comercial) | **P3** | Fase 1.2 (café). Não tocar agora. |
| **Pagar.me (alternativa MP)** | Backup pagamento BR (split, recorrência) | Take rate similar a MP | 2–3 dias | **P3** | Só se MP travar/recusar onboarding. Redundância, não prioridade. |
| **Olist NF-e (alternativa Bling)** | Backup fiscal | R$ ~99/mês plano básico | 3–5 dias | **P3** | Só se Bling for inviável. |
| **SendGrid (alternativa Resend)** | Backup e-mail | US$ ~20/mês plano Essentials 50k | 2–4h | **P3** | Resend cobre. Só ativar se houver bloqueio com domínio no Resend. |

**Custo mensal P0 + P1 destravado integralmente:** ~R$ 95 (Bling) + US$ 70 (~R$ 350) ≈ **R$ 445/mês fixo** + take rate MP variável.

## Recomendação top-3 para Fase 1 (MVP que vende de verdade)

Para tirar a loja de joias BR do "modo simulado" e colocar para vender com fluxo de venda mínimo confiável:

### 1. Mercado Pago (P0) — destrava receita
- **Por quê:** sem ele não há checkout real. Tudo o resto é teatro até MP estar conectado. Pix é o método mais barato e mais usado em joia BR (ticket alto, cliente avesso a parcelar).
- **Fluxo destravado:** carrinho → checkout → Pix/cartão/boleto → webhook confirma → pedido `paid` → automações disparam.
- **Custo:** zero fixo. Take rate é COGS, não OPEX — só sai quando entra dinheiro.
- **Risco se atrasar:** zero receita. Time desenvolve no escuro sem feedback de pagamento real.

### 2. Resend (P0) — destrava confiança e recuperação
- **Por quê:** confirmação de pedido, atualização de status, recuperação de carrinho, alerta back-in-stock e envio de NF-e dependem de e-mail. Sem ele, cliente compra e fica sem retorno → reembolso/chargeback.
- **Fluxo destravado:** "comprei e não recebi nada" desaparece. Carrinho abandonado vira receita recuperável.
- **Custo:** US$ 20/mês (~R$ 110), previsível e barato.
- **Risco se atrasar:** NPS no chão, taxa de abandono não recuperada (~30% potencial perdido), churn de primeira compra.

### 3. Anthropic Claude API (P0) — destrava o diferencial competitivo
- **Por quê:** Lojeo se vende em "IA nativa". Hoje IA Analyst, descrições e moderação UGC rodam em mock. O lojista paga pelo Lojeo justamente para não pagar copywriter/agência. Sem chave, Lojeo é só "mais um e-commerce".
- **Fluxo destravado:** lojista cadastra produto cru → IA gera 3 variações de descrição/SEO → ele aprova → publica. Tempo do "produto cru → produto vendável" cai de horas para minutos.
- **Custo:** ~US$ 50/mês com cap de gasto configurado por tenant + cache agressivo. Modelos Haiku majoritários, Sonnet só em copy premium.
- **Risco se atrasar:** história de venda do Lojeo perde a parte central. Demos quebram.

**Top-3 = R$ 0 fixo + ~US$ 70/mês (~R$ 380) + take rate MP.** Investimento marginal para destravar receita real, retenção e diferencial. Tudo o resto (Bling, Melhor Envio, Trigger, R2, Clarity, VAPID) entra em P1/P2 e pode esperar 2–4 semanas após Top-3 estar live.

## Justificativa de cada prioridade (impacto no fluxo de venda)

- **P0 (Mercado Pago, Resend, Anthropic):** sem qualquer um deles, a promessa do Lojeo (vender de verdade + IA + retenção por e-mail) é quebrada. Bloqueiam o lançamento.
- **P1 (Bling, Melhor Envio, Trigger.dev):** loja vende sem eles, mas o fluxo fica manual e não escala. Bling é exigência fiscal — a partir de ~30–50 pedidos/mês, emitir NF na mão é inviável. Melhor Envio tira atrito do checkout. Trigger é pré-requisito para tudo que é assíncrono (e-mail, embeddings, IA Analyst noturno).
- **P2 (VAPID, Clarity, R2):** ganhos marginais de UX/observabilidade/storage. Não bloqueiam venda. Entram quando a loja já estiver vendendo de verdade e quisermos otimizar funil.
- **P3 (Stripe, PayPal, DHL, FedEx, Pagar.me, Olist, SendGrid):** fora do escopo Fase 1 (BR-only) ou redundância de provedor. Só ativar se Fase 1.2 (café internacional) começar ou se P0/P1 falhar.

## Próximos passos operacionais

1. **Aprovar Top-3** com CFO (custo total marginal: ~R$ 380/mês fixo).
2. **Atribuir owner único** para cada um dos 3 (responsável pelo cadastro KYC, OAuth e teste end-to-end em sandbox antes de produção).
3. **Marcar nos checkboxes do roadmap Fase 1** (sprints 3, 7, 13) que o bloqueador externo está em curso.
4. **Migrar para P1 (Bling + Melhor Envio + Trigger)** assim que Top-3 estiver vendendo de verdade — alvo: 2 semanas após Top-3 live.
5. **Setup wizard** em `/settings/onboarding` mostra ao lojista exatamente onde está nesse caminho, com checklist visual.
