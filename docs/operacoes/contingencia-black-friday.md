# Plano de contingência — Black Friday

**Evento:** Black Friday (última sexta-feira de novembro)
**Aplicável a:** Lojeo (motor) + lojas do laboratório (jewelry-v1, coffee-v1)
**Última revisão:** 2026-04-26
**Responsáveis:** plantão de engenharia + atendimento + estoque

> Volume esperado: 3x a 5x o tráfego médio diário, concentrado entre quinta-feira 22h e sábado 02h. Ticket médio tende a subir 20-30%. A prioridade absoluta do plano é **manter a loja vendendo, mesmo em modo degradado**.

---

## Sumário

1. Pré-evento (D-30 a D-1)
2. Durante (sexta-feira 0h a 23:59)
3. Pós-evento (D+1 a D+7)
4. Comunicação ao cliente
5. Plano B catastrófico
6. Anexos: contatos, comandos rápidos

---

## 1. Pré-evento (D-30 a D-1)

### 1.1 Checklist técnico

Iniciar 30 dias antes. Reavaliar em D-7, D-3 e D-1.

- [ ] **Core Web Vitals:** rodar Lighthouse (mobile e desktop) em homepage, PLP, PDP e checkout. Meta: score Performance > 90, LCP < 2.5s, CLS < 0.1, INP < 200ms. Registrar resultado em `/insights` aba Performance.
- [ ] **CDN Cloudflare ativa:** confirmar que a zona está em modo proxy (laranja) e que cache rules cobrem `/_next/static/*`, `/images/*`, `/fonts/*`. Validar Cache Reserve habilitado para PDPs.
- [ ] **R2 storage operacional:** rodar smoke test de upload + leitura. Verificar quota mensal e billing alert configurado em 80% e 100%.
- [ ] **Banco (Neon):** rodar `VACUUM ANALYZE` em todas as tabelas de produção. Revisar plano de queries dos endpoints mais acessados (`/api/products`, `/api/orders`, `/api/track`). Confirmar autoscaling configurado.
- [ ] **Índices revisados:** auditar índices em `orders.created_at`, `products.tenant_id+slug`, `events.session_id`, `events.created_at`. Adicionar índices faltantes via `/api/migrate`.
- [ ] **Rate limits dimensionados:**
  - chatbot: 30 msg/min/IP (normal: 10)
  - `/api/track`: 200 req/min/IP (normal: 60)
  - `/api/orders`: 30 req/min/IP (normal: 10)
  - autenticação: manter rígido (10/min) para não abrir flanco a credential stuffing
- [ ] **Fila Trigger.dev (se ativa):** confirmar concurrency aumentado, retries com backoff exponencial, dead-letter queue monitorada. Validar webhook de gateways em ambiente real (não sandbox).
- [ ] **Backups Neon:** confirmar PITR (Point-in-Time Recovery) habilitado, snapshot manual em D-1.
- [ ] **Feature flags:** mapear quais flags podem ser desligadas em emergência (chatbot, FBT, recommendations, pixels não-essenciais). Documentar nome exato de cada flag em `/settings`.
- [ ] **Service Worker / PWA:** validar `sw.js` em todos os browsers principais. Garantir que estratégia de cache permite invalidação rápida (versionamento via build hash).

### 1.2 Checklist operacional

- [ ] **Estoque reabastecido:** SKUs principais com cobertura mínima de 5x a média semanal. Bloquear reserva preventiva para SKUs sem reposição.
- [ ] **Fornecedores avisados:** confirmar SLA durante a semana da BF, especialmente fulfillment terceirizado.
- [ ] **Etiquetas de envio:** imprimir lote prévio para os 100 SKUs mais vendidos. Conferir impressora térmica de backup.
- [ ] **Scripts de atendimento:** atualizar respostas-padrão em WhatsApp (FaqZap) para BF: prazo de entrega, política de troca estendida, cupons válidos.
- [ ] **FAQ chatbot atualizada:** revisar embeddings/base de conhecimento do chatbot com perguntas-tipo de BF (frete, troca, cupom, status do pedido).
- [ ] **Plantão definido:** mínimo 2 pessoas no técnico, 2 no atendimento, 1 no estoque. Escala 8/8/8 cobrindo 24h da sexta + sábado de manhã.

### 1.3 Checklist marketing

- [ ] **Pixels e eventos validados:** GTM publicado, GA4 recebendo `purchase`, `add_to_cart`, `begin_checkout`. Meta Pixel + CAPI com `event_id` deduplicado. TikTok e Google Ads idem. Validar em `/insights` aba Funil.
- [ ] **Atribuição UTM:** testar fluxo completo (clique em ad → landing → checkout → pedido) com UTMs persistindo em `events.session.attribution`.
- [ ] **A/B tests congelados:** **NÃO** experimentar nada novo durante BF. Pausar todos os testes ativos em D-3, fixando a variante vencedora ou a controle.
- [ ] **Cupons criados:** códigos prontos em `/settings/discounts`. Definir teto de uso, validade, regras de empilhamento. Cupom de retenção pós-BF já agendado.
- [ ] **SEO:** confirmar que páginas-chave (categoria BF, landing de campanha) estão indexadas e com schema.org adequado.

### 1.4 Checklist financeiro

- [ ] **Limite mensal de IA aumentado:** prever volume 3x a 5x o normal (chatbot, recommendations, IA Analyst). Reservar buffer extra de 20%. Configurar alerta em 70%, 85% e 95% do teto.
- [ ] **Gateway primário (MP/Stripe):** rodar carga em sandbox simulando 100 transações/min. Verificar tempo de resposta e taxa de aprovação.
- [ ] **Plano B de gateway:** toggle pré-configurado em `/settings/payments` para alternar para gateway secundário em caso de queda. Treinar plantão para acionar em < 5 min.
- [ ] **Reconciliação:** alinhar fechamento financeiro pós-BF com contabilidade. Reservar bandwidth para auditar pedidos com `status=manual`.

---

## 2. Durante o evento (sexta-feira 0h a 23:59)

### 2.1 War room

- **Composição mínima:** 2 pessoas técnicas (uma sênior + uma de apoio) e 2 de atendimento, em rodízio. 1 coordenador alcançável 24h.
- **Comunicação dedicada:** canal Slack `#bf-warroom` + grupo WhatsApp paralelo (redundância se Slack cair).
- **Dashboards abertos:**
  - `/insights` aba **Funil** (conv%, drop-off, AOV)
  - `/insights` aba **Performance** (latência p50/p95/p99, erro rate)
  - `/status` (status público das integrações)
  - Cloudflare Analytics (tráfego, ataques)
  - Neon dashboard (CPU, conexões ativas, slow queries)

### 2.2 Triggers de alerta

| Métrica | Limite | Ação imediata |
|---|---|---|
| Erro rate (5xx) | > 1% por 5 min | Investigar logs, considerar rollback |
| Latência p99 | > 3s por 10 min | Verificar Neon CPU, considerar desligar features pesadas (FBT, recommendations) |
| Chatbot escalation rate | > 30% | Avaliar desligar chatbot e direcionar para WhatsApp humano |
| Gateway em erro | qualquer falha por > 2 min | Acionar plano B de gateway (toggle em `/settings/payments`) |
| Conv% | queda > 20% vs baseline da semana | Investigar funnel, suspeitar de bug no checkout |
| Estoque negativo | qualquer SKU | Bloquear SKU em `/settings/products`, comunicar atendimento |

### 2.3 Procedimento de rollback

Em ordem de menor a maior impacto:

1. **Feature flag desligada** — em `/settings/feature-flags`, desativar a flag suspeita (chatbot, FBT, recommendations, pixels). Efeito imediato, sem deploy.
2. **Cache invalidation do Service Worker** — bumpar versão do `sw.js` via deploy hot-fix. Necessário se bug está em código client-side cacheado.
3. **CDN purge** — purge seletivo no Cloudflare (`/api/*`, ou rota específica). Não fazer purge total sem necessidade (avalanche de origem).
4. **Deploy revert via EasyPanel** — reverter para o build anterior conhecido como estável. Tempo estimado: 3 min. Acionar somente se feature flag não resolver.
5. **Migration rollback** — somente como último recurso. Migrations devem ser backward-compatible; se for irreversível, escalar imediatamente para o coordenador.

### 2.4 Modo degradado pré-aprovado

Estes desligamentos podem ser feitos pelo plantão sem aprovação adicional, desde que registrados em `#bf-warroom`:

- [ ] **Desligar chatbot IA:** atendimento passa 100% para WhatsApp humano via FaqZap. Banner no storefront avisa "Atendimento via WhatsApp".
- [ ] **Desligar pixels (em camadas):**
  - Camada 1 (primeiro a cair): pixels de remarketing pesados (Meta CAPI duplicado, TikTok)
  - Camada 2: GA4 (manter eventos críticos via server-side)
  - Camada 3: GTM inteiro (último recurso, perde atribuição)
  - **Nunca desligar:** evento `purchase` no gateway (necessário para conferência financeira)
- [ ] **Bloquear FBT (Frequently Bought Together):** em `/settings/feature-flags`, desativar `fbt_recommendations` se latência p99 da PDP > 3s.
- [ ] **Bloquear recommendations homepage:** mesmo procedimento, flag `homepage_recommendations`.
- [ ] **Forçar PDP estática:** flag `pdp_static_mode` força render server-side puro sem componentes IA.

Cada desligamento é registrado com timestamp, motivo e responsável.

---

## 3. Pós-evento (D+1 a D+7)

### 3.1 Pós-mortem (até D+3)

Reunião de 90 min com plantão técnico + atendimento + coordenador. Template:

- **O que funcionou bem** (3-5 itens)
- **O que falhou** (3-5 itens, com root cause cada)
- **Métricas vs esperado:**
  - Pedidos: realizado / meta
  - Receita bruta: realizada / meta
  - AOV: realizado / médio do trimestre
  - Conv%: realizado / médio do trimestre
  - Churn rate (pedidos cancelados/estornados): realizado / médio
  - Tempo médio de resposta do chatbot
  - Taxa de aprovação do gateway primário
- **Decisões para o próximo evento** (incidentes que viraram regra)
- **Itens de follow-up** com responsável e prazo

Documentar o resultado em `/docs/operacoes/post-mortem-bf-YYYY.md` (criar quando ocorrer).

### 3.2 Cleanup técnico (D+1 a D+5)

- [ ] Descongelar A/B tests pausados em D-3
- [ ] Restaurar limites de IA ao patamar normal
- [ ] Verificar backups Neon (PITR + snapshots manuais) — confirmar integridade
- [ ] Auditar `audit_log` da semana da BF buscando anomalias (acessos admin fora de horário, alterações em massa de preço, escalation de privilégios)
- [ ] Reverter rate limits ao patamar normal
- [ ] Republicar A/B tests com aprendizados absorvidos
- [ ] Reabrir flags desligadas em modo degradado, uma por uma, monitorando

### 3.3 Retenção (D+2 a D+7)

> Em 2026 a integração com Resend ainda não está completa (bloqueio Sprint 13). Planejar copy e segmentação **agora**, disparar quando integração liberar.

- **Email pós-BF (segmento: comprou na BF):**
  - Agradecimento + cupom de recompra (validade 14 dias)
  - Pedido de review do produto comprado
- **Email pós-BF (segmento: viu produto e não comprou):**
  - Wishlist alert se preço caiu mais
  - Cupom de recuperação (válido 7 dias)
- **Gift cards:** push de gift card para o segmento "comprou para si" — gancho de Natal
- **Wishlist alerts:** disparar avisos automáticos quando SKU saiu de estoque e voltou

---

## 4. Comunicação ao cliente

### 4.1 Antes (D-14 a D-1)

- **Campanha email para lista:** teasers a partir de D-14, drops semanais. Última quebra de embargo em D-1 18h.
- **Push notification PWA** (entregue na Sprint 13 v2): segmento de quem deu opt-in recebe notificação na quinta 22h e na sexta 0h.
- **Banner top do storefront:** countdown de 72h antes do evento. Trocar para "AO VIVO" às 0h da sexta. Componente responsivo, dispensável em modo degradado.
- **Redes sociais:** calendário de posts pré-definido. Stories diários em D-7 a D-1.

### 4.2 Durante (sexta-feira)

- **Status page pública (`/status`):** atualizada manualmente a cada incidente. Comunicação transparente ("Estamos investigando lentidão no checkout — equipe atuando").
- **Redes sociais:** mensagens de agradecimento + lembretes de cupom expirando. Em caso de incidente grave, post oficial com previsão de retorno.
- **WhatsApp em massa:** evitar disparo durante o pico (consome bandwidth de atendimento). Disparo programado para sábado 10h com mensagem de agradecimento + cupom de retenção.

### 4.3 Após (D+1 a D+3)

- Post de agradecimento com números (ordens, clientes atendidos) — usar dados reais do `/insights`
- Email de retenção (ver seção 3.3)
- Resposta a reviews e DMs acumuladas (atendimento em força total no sábado)

---

## 5. Plano B catastrófico

Cenários que exigem decisão do coordenador, não do plantão.

### 5.1 Loja totalmente fora (frontend não responde)

1. Acionar redirect no Cloudflare Workers para landing page estática hospedada em Cloudflare Pages: copy "Voltamos em instantes — siga-nos para novidades" com link para WhatsApp e redes.
2. Investigar causa em paralelo (deploy quebrado, esgotamento de recursos, ataque DDoS).
3. Comunicar redes sociais em < 10 min do início do incidente.
4. Após restabelecer, fazer purge de cache total e validar com smoke test antes de remover redirect.

### 5.2 Gateway primário caído

1. Tentar plano B (toggle gateway secundário em `/settings/payments`).
2. Se ambos caírem: habilitar **Pix manual via WhatsApp**.
   - Cliente conclui carrinho até `/checkout/pagamento`, seleciona "Pix manual"
   - Sistema gera QR code Pix estático configurado em `/settings/payments/manual-pix`
   - Cliente paga e envia comprovante via WhatsApp
   - Atendimento valida, libera pedido em `/orders/[id]/manual-confirm`
   - Reconciliação posterior contra extrato bancário
3. Comunicar limitação no banner do storefront e na status page.

### 5.3 Banco (Neon) fora

1. Snapshot read-only via cache CDN: as PLPs e PDPs continuam navegáveis (Cloudflare Cache Reserve), mas `/checkout` é bloqueado com mensagem "Estamos otimizando a infraestrutura — pedidos voltam em instantes".
2. Acionar Neon support imediatamente.
3. Se downtime > 30 min, considerar restaurar de PITR em instância paralela e fazer cutover (operação de risco, somente coordenador autoriza).
4. Comunicação em status page e redes sociais a cada 15 min.

### 5.4 IA (Anthropic) fora

1. Chatbot e estúdio criativo: degradar para mensagens estáticas.
2. IA Analyst desabilitada em `/insights` (mostrar dados crus, sem narrativa gerada).
3. Recommendations e FBT: fallback para regras heurísticas pré-cacheadas (mais vendidos da categoria).
4. Sem impacto direto em vendas — apenas em features acessórias.

---

## 6. Anexos

### 6.1 Comandos rápidos

| Ação | Caminho |
|---|---|
| Ver erro rate | `/insights` aba Performance |
| Ver funil em tempo real | `/insights` aba Funil |
| Toggle gateway | `/settings/payments` |
| Toggle feature flags | `/settings/feature-flags` |
| Status público | `/status` |
| Rodar migration | `/api/migrate` (admin only) |
| Forçar logout admin | `/settings/security/sessions` |

### 6.2 Contatos de plantão (preencher em D-30)

| Função | Nome | Telefone | Janela |
|---|---|---|---|
| Coordenador | _a definir_ | _a definir_ | 24h |
| Tech sênior | _a definir_ | _a definir_ | 0h-8h, 16h-24h |
| Tech apoio | _a definir_ | _a definir_ | 8h-16h |
| Atendimento | _a definir_ | _a definir_ | 0h-12h / 12h-24h |
| Estoque | _a definir_ | _a definir_ | 8h-20h |

### 6.3 Histórico de revisões

| Data | Versão | Autor | Mudança |
|---|---|---|---|
| 2026-04-26 | 1.0 | agent docs | versão inicial |
