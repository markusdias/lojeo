# Sprint 8 — Research: Churn + Previsão de Estoque (heurísticas v1)

**Data:** 2026-04-26  
**Protocolo:** Research-first (OBRIGATÓRIO antes de codar)  
**Escopo:** Parte não-IA do Sprint 8 — churn scoring heurístico + stock forecasting sem ML

---

## 1. Churn scoring heurístico (sem ML)

### Referências consultadas
- RFM extensions: customer lifetime value em marketing direto (Hughes 1994)
- `lifetimes` Python lib (Fader et al. BG/NBD model) — muito pesado para v1
- Shopify Analytics churn indicator: dias sem compra relativo ao ciclo médio do cliente
- Industry standard: B2C e-commerce churn ~60-90 dias pós-último pedido

### Heurística escolhida para v1

**Variáveis:**
- `days_since_last_order` — dias desde o último pedido
- `avg_order_cycle` — intervalo médio entre pedidos históricos do cliente
- `order_count` — total de pedidos (clientes com 1 pedido têm maior risco base)

**Score de churn (0–100):**
```
churn_score = weighted_score(
  recency_ratio = days_since_last_order / max(avg_order_cycle, 30),
  frequency_penalty = 1 / max(order_count, 1),
)
score = min(100, round(recency_ratio * 60 + frequency_penalty * 40))
```

**Categorias:**
| Score | Categoria | Ação sugerida |
|---|---|---|
| 80–100 | 🔴 Alto risco | Campanha de reativação urgente |
| 50–79 | 🟡 Risco médio | Email de engajamento |
| 20–49 | 🟢 Em dia | Nada / newsletter padrão |
| 0–19 | 💎 Ativo recente | Fidelizar |

**Cutoff de churn absoluto:** cliente sem pedido há >180 dias = risco alto independente do ciclo.

### Implementação
- Calcular em `packages/engine/src/churn.ts` (pura, sem DB)
- Inputs: mesmos que `RfmInput` + `orderDates: Date[]`
- Testar com Vitest (mock de dados)
- API route no admin: `GET /api/customers/churn` — lista ordenada por score

---

## 2. Previsão de estoque (velocidade média)

### Referências consultadas
- Holt-Winters (statsmodels Python) — muito complexo para v1 sem dados históricos suficientes
- Prophet (Meta) — requer Python runtime, não justificado no MVP
- **Escolha v1:** velocidade média de vendas (janela deslizante 30/60/90 dias) + `lead_time`

### Fórmula

```
daily_velocity = units_sold_last_N_days / N
days_until_stockout = current_stock / max(daily_velocity, 0.001)
reorder_point = lead_time_days * daily_velocity * 1.2  # 20% buffer
```

**Janela escolhida:** 30 dias (padrão) com fallback para 90 dias se dados insuficientes (<5 vendas nos 30d).

**Alertas:**
| Dias até ruptura | Alerta |
|---|---|
| ≤ 7 | 🔴 Crítico — pedir agora |
| 8–14 | 🟡 Alerta — preparar pedido |
| 15–30 | 🔵 Monitorar |
| > 30 | ✅ Estável |

### Implementação
- `packages/engine/src/inventory-forecast.ts` (pura, sem DB)
- `GET /api/inventory/forecast` no admin — lista produtos com days_until_stockout
- JOIN com `order_items` (últimos 90 dias) + `inventory` (current stock)
- Testar com Vitest

---

## 3. Decisões arquiteturais

1. **Lógica pura em `packages/engine`** — testável sem DB, reutilizável em jobs futuros (Trigger.dev Sprint 8 completo)
2. **Janela de 30 dias para velocidade de vendas** — balanceia sazonalidade vs relevância
3. **Lead time configurável por produto** — campo `warrantyMonths` já existe; criar campo virtual no admin settings (leadTimeDays padrão)
4. **Score de churn não persiste no banco** — calculado on-demand por ora (batch diário quando Trigger.dev disponível)
5. **v1 sem ML** — heurística suficiente para alertas; ML entra na Fase 2 com dados históricos reais
