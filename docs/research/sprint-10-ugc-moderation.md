# Sprint 10 — UGC + galeria + compre o look + moderação

> **Research-first protocol** (CLAUDE.md): obrigatório documentar fontes, padrões, decisão arquitetural e benchmark antes de codar prompts ou pipelines de IA.

**Data:** 2026-04-26
**Autor:** Claude (Opus 4.7)
**Status:** documento de fundação para Sprint 10

---

## Contexto e objetivo

Loja de joias precisa de prova social real. Cliente quer ver a peça em mão real, não só foto de estúdio. Sprint 10 entrega:

1. **Galeria UGC** alimentada por uploads de clientes na área logada
2. **Moderação assistida por IA** (Claude vision) com fila no admin
3. **Compre o look** — editor que tagueia produtos em foto UGC
4. **Incentivo** — email pós-entrega + crédito de loja por foto aprovada

Conversão típica esperada (UX/marketing): +10–20% em PDP com galeria UGC ativa.

---

## Padrões de mercado pesquisados

### Plataformas de referência (2026)

| Plataforma | Foco | Modelo de moderação | Pricing |
|---|---|---|---|
| **Yotpo** | DTC, ampla suite (reviews + UGC + loyalty + SMS) | AI assist + revisão humana | Tiered, free entry — scale up |
| **Bazaarvoice** | Enterprise, syndication via rede de retailers | AI + manual review obrigatório | Implementação $10–50k + anual $3–30k+ |
| **Loox** | Shopify SMB, UGC photo reviews simples | Auto-aprovação com flag manual | $10–300/mês |
| **Junip** | Shopify performance-focused, conversão | Filtros automáticos | Tiered DTC |
| **Foursixty** | Importação Instagram/TikTok hashtag → galeria | Sem moderação proprietária forte | $50–500/mês |
| **Pinterest Shopping** | Inspiração visual + tags de produto em pin | Moderação plataforma própria | Free + Ads |
| **Instagram Shopping (LTK)** | Tag de produto em foto — referência de UX | Moderação Meta | Free + comissão LTK |

**Fontes:**
- [Yotpo vs Bazaarvoice vs Loox 2026](https://www.zigpoll.com/content/bazaarvoice-vs-yotpo-vs-loox-2026)
- [Bazaarvoice Competitors 2026](https://www.yotpo.com/blog/bazaarvoice-alternatives/)
- [UGC Strategy 2026 — Flockler](https://flockler.com/blog/ugc-strategy-guide)

### Tendência 2026 — Provenance + AI authenticity

**Insight crítico:** com aumento de imagens AI-generated e deepfakes, "verificação de origem" passou a ser feature obrigatória. Cliente final precisa **distinguir buyer-generated content vs creator-generated vs AI**.

Implicação para Lojeo:
- Toda foto UGC deve ter campo `source` (`direct_upload`, `social_import`, `ai_assisted_disclosed`)
- Cliente que enviou tem `userId` no DB → carrega badge "Cliente verificado" na galeria
- Importação social deve preservar URL original como prova de origem

Fonte: [UGC for eCommerce 2026 — CS-Cart](https://www.cs-cart.com/blog/ugc-ecommerce/), [The UGC Overload — ACM](https://cacm.acm.org/blogcacm/the-ugc-overload-scaling-content-moderation-for-massive-datasets/)

---

## Moderação visual com Claude vision

### Por que Claude vision (vs AWS Rekognition/Google Vision/Azure Content Moderator)?

| Critério | Claude vision (Sonnet) | AWS Rekognition | Google Vision SafeSearch |
|---|---|---|---|
| Custo por imagem | ~$0.0008–0.003 (depende de tamanho) | $0.001 | $0.0015 |
| Detecção contextual | **Excelente** (instruções complexas em prompt) | Categorias fixas | Categorias fixas |
| Marca concorrente visível | Sim, via prompt | Não nativo | Não nativo |
| Qualidade técnica (foco, iluminação) | Sim, via prompt | Não nativo | Parcial |
| Off-brand para joalheria | Sim, via prompt | Não | Não |
| Latência | 2–4s | <500ms | <500ms |
| Já está no stack Lojeo? | **Sim** (`@lojeo/ai`) | Não (nova dep AWS) | Não (nova dep GCP) |

**Decisão:** Claude vision (Sonnet ou Haiku, decidir via benchmark). Já está no stack, não introduz dependência cloud nova, e o prompt customizável cobre todos os critérios da Sec 10 do roadmap.

Fonte: [Best Image Moderation APIs 2026 — Eden AI](https://www.edenai.co/post/best-image-moderation-apis), [Claude vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)

### Categorias de moderação (output do prompt)

```json
{
  "decision": "approve" | "reject" | "review",
  "score": 0.0..1.0,
  "reasons": ["nudity", "violence", "competitor_brand", "low_quality", "off_brand", "ai_generated_likely"],
  "moderation_notes": "string descritiva curta",
  "extracted_features": {
    "products_visible": ["necklace", "ring", "earring"],
    "scene_type": "selfie" | "lifestyle" | "studio" | "outdoor",
    "lighting_quality": "good" | "acceptable" | "poor"
  }
}
```

**Threshold de auto-aprovação proposto (v1):**
- `decision === 'approve' && score >= 0.85` → fila normal de aprovação rápida
- `decision === 'review'` → fila de revisão manual
- `decision === 'reject'` → flag automático, email de orientação ao cliente

### Anti-jailbreak / anti-falsa moderação

Lições do Sprint 7 (small LLM prompt engineering — vide MEMORY) aplicáveis aqui:
- Instruções de segurança no **final** do prompt, não no início
- Categorias proibidas explícitas (não "evitar conteúdo inadequado") — listar nudez, violência, marca concorrente, qualidade técnica baixa
- Output JSON estrito com regex fallback de parse

---

## Compre o look (shop-the-look)

### Patterns de mercado

- **Pinterest Lens** — clica num pin, vê produtos similares em outros pins. UX: tag posicional (x,y) com card popup
- **Instagram Shopping** — bullet redondo branco em ponto da foto → tap → card de produto
- **LTK** — afiliação com creators, tag manual no upload
- **Shopify Shop the Look** — app store, multipl. apps. Padrão: editor admin, hover/click cliente

### Implementação proposta (jewelry-v1)

**Schema `ugc_posts.products_tagged` (jsonb):**

```json
[
  { "productId": "uuid", "x": 0.45, "y": 0.62, "label": "Anel Solitário Diamante" },
  { "productId": "uuid", "x": 0.20, "y": 0.30 }
]
```

`x` e `y` em fração 0..1 (independente de tamanho real da imagem ao redimensionar).

**Editor admin (Sprint 10 + Design Checkpoint C):**
- Canvas com foto carregada
- Click adiciona tag na posição
- Search inline para escolher produto
- Drag para reposicionar
- Delete via X no card

**Storefront (jewelry-v1):**
- Hover desktop / tap mobile no ponto
- Card de produto em popover com link "Ver produto"
- Mensurar: cliques em tag + add-to-cart derivado de tag

---

## Trigger.dev e jobs assíncronos

**Status atual (vide DECISION_LOG Sprint 1):** Trigger.dev image instável, serviço `lojeo-trigger` parado em prod. Decisão Sprint 3 era retomar — **continua bloqueado**.

**Implicação Sprint 10:**
- Pipeline de moderação visual deve ser **síncrono no upload** (await Claude vision antes de retornar 200) ou **fire-and-forget com webhook** (post → resposta imediata "em moderação" → API atualiza row depois)
- Decisão recomendada: **fire-and-forget local** — `setTimeout(() => moderate(), 0)` no Next.js, persistir status `moderating`, atualizar para `pending`/`approved`/`rejected` quando IA responder. Latência tolerável: cliente vê "em análise" e recebe email quando aprovada.

---

## Schema proposto (DDL preview)

```sql
CREATE TABLE ugc_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL, -- null = guest
  image_url text NOT NULL,
  thumbnail_url text,
  caption text,
  status varchar(20) NOT NULL DEFAULT 'moderating',
    -- moderating | pending | approved | rejected
  source varchar(30) NOT NULL DEFAULT 'direct_upload',
    -- direct_upload | social_import | imported_review
  source_url text, -- IG/TT URL original quando social_import
  products_tagged jsonb DEFAULT '[]',
  ai_moderation_result jsonb,
    -- { decision, score, reasons[], extracted_features{} }
  moderated_by_user_id uuid REFERENCES users(id),
  moderated_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  approved_at timestamptz
);

CREATE INDEX idx_ugc_tenant_status ON ugc_posts(tenant_id, status);
CREATE INDEX idx_ugc_tenant_approved ON ugc_posts(tenant_id, approved_at DESC);
CREATE INDEX idx_ugc_user ON ugc_posts(user_id);
CREATE INDEX idx_ugc_products ON ugc_posts USING gin(products_tagged);
```

---

## Benchmark obrigatório antes de codar

Conforme research-first protocol, executar **antes** de qualquer prompt entrar em produção:

- [ ] 50 imagens-amostra (mix: 20 seguras, 20 borderline, 10 inseguras)
- [ ] 3 variações de prompt × Claude vision (Haiku vs Sonnet)
- [ ] Medir: false positive rate, false negative rate, custo médio
- [ ] Decisão: modelo escolhido + threshold de auto-aprovação registrados em `DECISION_LOG.md`

**Bloqueador:** sem `ANTHROPIC_API_KEY` em prod, benchmark roda em dev local. Em prod, modo degradado = todas as fotos vão direto para fila manual (lojista vira gargalo).

---

## Bloqueadores externos do Sprint 10

1. **Design Checkpoint C** — UX do editor "compre o look" no admin (canvas + drag tag) e fila de moderação visual. Briefing pendente.
2. **Anthropic API key em prod** — para moderação automática real (modo degradado funciona como fallback)
3. **Storage configurado** (R2 ou local) — uploads precisam de bucket; já existe abstração `@lojeo/storage`, validar config prod

---

## Próximos passos

1. ✅ Pesquisa documentada (este arquivo)
2. ⏳ Schema `ugc_posts` migration + Drizzle schema
3. ⏳ API: `POST /api/ugc` (cliente upload), `GET/PATCH /api/admin/ugc` (moderação)
4. ⏳ Pipeline moderação Claude vision com prompt em `packages/ai/src/prompts/ugc-moderation/README.md`
5. ⏳ UI cliente: `/conta/galeria` com upload + lista de envios
6. ⏳ UI admin: `/ugc` com fila + detalhes + tagger (depende Design C)
7. ⏳ PDP storefront: componente `<UgcGallery productId>` (carrossel com fotos aprovadas tagueadas com produto)
8. ⏳ Galeria geral `/comunidade`
9. ⏳ Email pós-entrega "compartilhe sua experiência"
10. ⏳ Benchmark de prompts antes de habilitar moderação automática

---

## Sumário executivo

- **Stack moderação:** Claude vision via `@lojeo/ai` wrapper (já existe — zero dependência nova)
- **Custo estimado:** ~$0.001/imagem × 100 uploads/mês = **$0.10/mês por loja** (negligível)
- **UX padrão:** upload assíncrono → estado `moderating` → status atualizado em background → email de notificação
- **Compre o look:** tags posicionais x/y em jsonb, editor admin com canvas drag, popover storefront on hover
- **Provenance 2026:** badge "Cliente verificado" para uploads com userId, distinção visual buyer vs creator-generated
- **Bloqueado por:** Design C (editor canvas) + Anthropic key prod (moderação real)
- **Implementável já:** schema + API moderation degradada (fila 100% manual) + galeria storefront + upload cliente

---

## Sources

- [UGC for eCommerce 2026: Provenance Flow — CS-Cart](https://www.cs-cart.com/blog/ugc-ecommerce/)
- [UGC Strategy 2026 — Flockler](https://flockler.com/blog/ugc-strategy-guide)
- [The UGC Overload — Communications of the ACM](https://cacm.acm.org/blogcacm/the-ugc-overload-scaling-content-moderation-for-massive-datasets/)
- [Best Image Moderation APIs 2026 — Eden AI](https://www.edenai.co/post/best-image-moderation-apis)
- [Claude Vision API Docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Bazaarvoice vs Yotpo vs Loox 2026 — Zigpoll](https://www.zigpoll.com/content/bazaarvoice-vs-yotpo-vs-loox-2026)
- [Bazaarvoice Competitors 2026 — Yotpo](https://www.yotpo.com/blog/bazaarvoice-alternatives/)
