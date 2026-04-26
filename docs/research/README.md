# Pesquisa de IA — research-first protocol

Antes de implementar **qualquer** feature de IA, criar `<sprint>-<feature>.md` aqui com:

1. **Concorrentes/referências** — implementações reais (Shopify Magic, Klaviyo AI, Tidio Lyro, Yotpo, Bazaarvoice, etc.) e papers / blog posts relevantes.
2. **Open source de ponta** — links de repos GitHub que resolveram problema similar.
3. **Patterns considerados** — RAG, tool-calling, hybrid search, RFM ML, agentic data analysis.
4. **Benchmark mínimo (3 variações × inputs reais)** — comparação custo × qualidade.
5. **Decisão arquitetural** — registrada também em `DECISION_LOG.md`.

## Cobertura obrigatória por sprint

| Sprint | Feature | Arquivo |
|---|---|---|
| 7 | Descrições + SEO IA | `7-descricoes-seo.md` |
| 8 | IA Analyst + churn + previsão | `8-ia-analyst.md` |
| 9 | Chatbot storefront | `9-chatbot-storefront.md` |
| 10 | Moderação UGC com vision | `10-ugc-moderation.md` |
| 11 | Estúdio criativo (imagem/vídeo) | `11-estudio-criativo.md` |
| 12 | Busca semântica + Clarity-IA + personalização | `12-busca-clarity-personalizacao.md` |

## Imagem/vídeo (Sprint 11) — escopo extra

- Pesquisar prompts e best practices por modelo: Flux, DALL-E 3, Ideogram, SD3, Recraft, Midjourney, Veo, Runway, Pika
- Casos de sucesso e-commerce: Pebblely, Booth.ai, Photoroom AI, Stylar AI
- Benchmark obrigatório: mesmo produto × 3 modelos × 3 prompts cada
- Custo por tentativa documentado; estratégia scout → probe → final formalizada
