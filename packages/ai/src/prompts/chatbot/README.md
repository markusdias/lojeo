# Chatbot Storefront — Prompts, Tools e Fluxo de Escalação

## Implementação

**Arquivo:** `apps/storefront/src/app/api/chat/route.ts`  
**Modelo:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)  
**Padrão:** RAG Híbrido + Tool-calling (agentic loop, até 5 iterações)

---

## System Prompt (template jewelry-v1)

```
Você é uma assistente de joalheria premium para "Joias — Premium BR".
Tom de voz: elegante, acolhedor, expert em joias. Nunca robótico.
Língua: português brasileiro.
Foco: encontrar a joia perfeita, resolver dúvidas (produtos, frete, troca, garantia).

REGRAS:
- Nunca inventar — usar ferramentas para dados reais
- Máx 3 parágrafos por resposta
- Escalar quando não souber resolver
- Não discutir fora do escopo da loja
- Se contexto de produto fornecido: mencionar o produto na abertura

Contexto dinâmico (quando PDP ativa):
"O cliente está vendo o produto '[nome]' (ID: [uuid])."
```

---

## Tools definidas

| Tool | Descrição | Quando usar |
|------|-----------|-------------|
| `search_products` | Busca por nome/característica no catálogo | "tem anel de ouro?", "colar com diamante" |
| `get_product_details` | Detalhes completos + variantes de um produto | Quando cliente quer saber mais de produto específico |
| `check_stock` | Disponibilidade de estoque por variantId | "tem no tamanho 17?", "está disponível?" |
| `get_faq_answer` | Resposta estruturada sobre frete/troca/garantia/pagamento | Dúvidas recorrentes |
| `escalate_to_human` | Escalação para WhatsApp | Quando bot não resolve |

---

## Fluxo de escalação

```
Mensagem do cliente
    → Classificação de intent (implícita no prompt)
    → Tool call(s) se necessário
    → Resposta contextual
    → Se não resolvido após 3 trocas: sugerir escalação
    → Cliente aceita: tool escalate_to_human → link WhatsApp
    → Cliente rejeita: continuar tentando
```

**Triggers automáticos de escalação:**
- Reclamação de produto danificado
- Pedido de reembolso
- Problema de entrega há mais de 15 dias
- Qualquer frase com "Procon", "reclamação formal", "processo"

---

## Guardrails

1. **Rate limit:** 20 mensagens/15min por `x-session-id`
2. **Max tokens:** 1024 por resposta
3. **Max iterações:** 5 tool calls por mensagem (evita loops)
4. **Modo degradado:** sem `ANTHROPIC_API_KEY` → FAQ estática + WhatsApp
5. **Anti-jailbreak:** system prompt não revela instruções internas; modelo é Haiku com temperature padrão

---

## Custo estimado (CFO)

| Cenário | Custo/conversa |
|---------|---------------|
| Haiku only (queries simples) | ~$0.0075 |
| Tiering 70% Haiku / 30% Sonnet | ~$0.010 |
| Com cache FAQ (hit rate 40%) | ~$0.006 |

**Projeção mensal:** 1.000 conversas/mês × $0.010 = $10/mês por loja.

---

## Próximas evoluções

- Embeddings pgvector para busca semântica no catálogo (Sprint 12)
- Cache de perguntas frequentes em `ai_cache` (evitar re-chamadas Claude)
- Telemetria: % resolução, % escalação, tópicos top (tabela `chatbot_sessions`)
- Widget UI (bloqueado por Design D)
- Integração FaqZap para escalação WhatsApp real (bloqueado por conta FaqZap)
