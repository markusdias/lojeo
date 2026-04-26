# Sprint 7 — Research: Product Copy Prompts

**Data:** 2026-04-26  
**Protocolo:** Research-first (OBRIGATÓRIO antes de qualquer prompt em produção)

## Fontes consultadas

- Anthropic API docs: prompt caching, batch API, brand builder, vision
- GitHub: product-description-generator, product-manager-prompts, claude-batch-toolkit
- Referências comerciais: Shopify Magic, Hypotenuse AI, Copysmith, Writesonic
- Casos: Tashvi AI (joias), Clientbook (joalheiros), Analytics Vidhya (e-commerce LLM)

---

## 1. Estrutura de prompt recomendada

### Padrão three-layer

```
SYSTEM (cacheável, ~5.000–6.000 tokens):
  <role> — copywriter de joias premium BR
  <brand_guidelines> — brand guide em YAML
  <material_reference> — glossário de materiais (ouro, pedras, metais)
  <examples> — 3–5 pares de input/output de alto desempenho
  <instructions> — regras de estrutura, comprimentos, o que evitar
  <output_format> — schema JSON do output

USER (dinâmico, ~200–400 tokens):
  Nome do produto, material, pedra, dimensões, peso, coleção, keyword primária
```

**Key finding:** Injetar exemplos reais (pattern-matching) é 5–10× mais eficaz que descrever o tom em adjetivos. Usar 3–5 melhores descrições existentes do catálogo.

### Estrutura de descrição para joias (4 partes)

1. **Hook** (1 frase): gancho emocional e sensorial
2. **Story** (2 frases): origem, artesanato, herança
3. **Specs** (2–3 frases): material, dimensões, peso, certificações
4. **Care/Lifestyle** (1 frase): como usar, longevidade, benefício de estilo de vida

---

## 2. Brand voice — formato YAML (cacheável)

```yaml
brand_name: "Atelier Joias"
tone_dimensions:
  formal_casual: 3/5        # Premium mas acessível
  funny_serious: 2/5        # Predominantemente sério, algum calor
  technical_emotional: 4/5  # Fatos embrulhados em storytelling

personality:
  - "Luxo sem pretensão"
  - "Mentalidade de artesão"
  - "Elegância intemporal"
  - "Herança brasileira"

vocabulary:
  preferred: ["artesanal", "certificado", "atemporal", "heirloom", "lapidado"]
  avoid:     ["exclusivo", "viral", "trending", "imperdível", "incrível"]

writing_rules:
  - Voz ativa preferida
  - Comprimento médio de frase: 14–16 palavras
  - Sem emoji, sem ponto de exclamação
  - Sempre incluir certificações (quilates, pureza, graduação de pedra)
  - Português BR formal, sem gírias

do_examples:
  - "Quartzo rosa garimpado individualmente, cada peça única em sua jornada"
  - "Ouro 18k certificado, com 8 horas de trabalho artesanal"

dont_examples:
  - "Peça exclusiva de colecionador!" (hipérbole sem prova)
  - "Vai arrasar no look" (linguagem de tendência)
```

---

## 3. Limites de comprimento

| Formato | Limite | Destino |
|---|---|---|
| Descrição curta | 50–75 palavras | Card de produto (PLP) |
| Descrição longa | 180–220 palavras | PDP |
| SEO title | 55–60 caracteres | `<title>` |
| Meta description | 150–160 caracteres | `<meta description>` |

---

## 4. Schema de output JSON

```json
{
  "short_description": "50–75 palavras para card",
  "long_description": "180–220 palavras para PDP",
  "seo_title": "55–60 chars com keyword",
  "seo_description": "150–160 chars com keyword e CTA leve",
  "keywords_used": ["keyword_primaria", "keyword_secundaria"],
  "material_specs": "Material | Dimensões | Peso | Cuidados"
}
```

---

## 5. Estratégia de cache

### O que cachear (system prompt, estático):
- Brand guide YAML (~1.500 tokens)
- Glossário de materiais (~1.000 tokens)
- Templates por categoria (anéis, colares, brincos, pulseiras, ~800 tokens)
- 5–10 exemplos de alto desempenho (~1.000 tokens)
- Instruções de formato (~200 tokens)
- **Total: ~5.500 tokens → elegível para prompt cache Anthropic**

### O que NÃO cachear (user message, dinâmico):
- Dados do produto específico
- Keyword alvo
- Coleção atual

### Economia estimada (Claude Sonnet):
- Request 1 (cache write): 5.500 tokens × $3/MTok = $0,0165
- Requests 2–50 (cache reads): 5.500 × $0,30/MTok = $0,00165 cada
- Economia em 50 produtos: ~89% no custo de tokens cacheados

### Cache key no banco:
```
hash(brand_guide_version + product_id + keywords)
```
TTL: 90 dias (descrições de produto mudam raramente)

---

## 6. Seleção de modelo

| Uso | Modelo | Justificativa |
|---|---|---|
| Geração em lote (background) | Sonnet | 85% qualidade, 3× menor custo |
| Geração premium 1 produto | Sonnet | Suficiente para joias com brand guide |
| Análise de imagem do produto | Sonnet (vision) | Custo × qualidade ótimo |
| Modo econômico (toggle admin) | Haiku | ~5× menor custo, aceitável para rascunho |

**Decisão:** usar Sonnet como padrão. Toggle "modo econômico" no admin usa Haiku.

---

## 7. Benchmark obrigatório (pré-produção)

Antes de ir a produção, testar com 5 produtos reais do catálogo × 3 variações de prompt:

| Variação | Diferencial |
|---|---|
| v1 — Padrão | Brand guide YAML + 3 exemplos |
| v2 — Rico em exemplos | Brand guide YAML + 8 exemplos |
| v3 — Minimalista | Só brand guide, sem exemplos |

Métricas: consistência de tom (avaliação humana 1–5), naturalidade da keyword (1–5), densidade de informação técnica (1–5), comprimento no alvo (pass/fail).

**Critério de aprovação:** média ≥ 4,0 em todas as métricas antes de habilitar para lojistas.

---

## 8. Fluxo admin

1. Lojista abre produto no admin
2. Clica "Gerar com IA"
3. Seleciona tier: Padrão (Sonnet) ou Econômico (Haiku)
4. Sistema chama `POST /api/admin/products/:id/ai-copy`
5. Route handler monta prompt com dados do produto + brand guide
6. `@lojeo/ai` verifica cache → se miss, chama Claude → grava no cache
7. Resposta preenche campos do formulário (descrição curta, longa, SEO title, meta desc)
8. Lojista revisa, edita, e salva

**Workflow:** geração NÃO publica automaticamente — sempre passa por revisão humana.

---

## 9. Decisões arquiteturais registradas

| Decisão | Escolha | Justificativa |
|---|---|---|
| Modelo padrão | Sonnet | Custo × qualidade ótimo |
| Modo econômico | Haiku (toggle) | Lojista decide trade-off |
| Output format | JSON estruturado | Preenche campos separados |
| Cache key | hash(brand_version + product_id + keywords) | Invalida quando produto ou brand guide mudam |
| TTL | 90 dias | Descrições de produto mudam raramente |
| Review | Manual sempre | Geração ≠ publicação automática |
| Batch | Background job (Trigger.dev) | Para geração em lote de todo catálogo |
| Vision | Opcional, só se imagem disponível | +$0,0003/imagem |
