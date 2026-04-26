# Para colar no Claude Design — Sessão C: Features de IA no admin Lojeo

> **PRÉ-REQUISITO:** Sessão A (Lojeo system identity) já concluída. Estes componentes ESTENDEM o design system Lojeo. Reusar tokens, paleta, tipografia já gerados em A.

## Campo 1 — "Company name and blurb"

```
Lojeo AI features (admin): extensão do design system Lojeo (sessão anterior) cobrindo componentes específicos de IA visíveis NO ADMIN — IA Analyst (chat-like analytics), Estúdio Criativo (geração de imagem/vídeo de produto), Painel de Uso de IA (consumo + custo + cota), Editor "Compre o Look" (tagear produtos em foto UGC), Fila de Moderação UGC (aprovar/rejeitar fotos com análise IA visível), Editor de Homepage Personalizada (variantes por perfil de cliente). TODOS reusam tokens do Lojeo (verde profundo accent, Inter, light/dark). NÃO confundir com componentes de IA no STOREFRONT (sessão D, identidade do template).
```

## Campo 2 — Assets para upload

- **Code on GitHub:** linkar repo Lojeo (após Sprint 0)
- **.fig file:** anexar Figma da Sessão A (design system Lojeo) para Claude Design herdar
- **Fonts/logos/assets:** já em A — não duplicar

## Campo 3 — "Any other notes?"

```
ESTENDER o design system Lojeo já criado na sessão A. Reusar tokens, cores, tipografia, componentes-base. Esta sessão adiciona componentes ESPECÍFICOS de features de IA.

Princípios de UX para IA:
1. Transparência de custo — toda ação de IA mostra impacto no consumo (cota, custo R$/USD)
2. Modo degradado visível — quando IA falha, lojista vê mensagem clara e continua trabalhando manualmente
3. Loading honesto — geração imagem/vídeo demora 30-60s; mostrar progresso real, NÃO fake spinner
4. Cache visível — quando resultado vem de cache, badge sutil "do cache" (educativo)
5. Edição humana sempre — IA gera, lojista edita; nunca "salva automático"

Componentes específicos de IA:
- AI Badge sutil (gradiente verde Lojeo para tom análogo, NÃO roxo/rosa ChatGPT-style). Variantes free/premium/heavy.
- AI Generate Button (idle, generating com progresso real, error, regenerate). Mostra custo estimado em tooltip (ex "≈ R$0,02").
- AI Result Card (aceitar/regenerar/editar/descartar + comparador antes/depois quando aplicável + histórico inline + badge "do cache").
- AI Cost Meter (barra cota, custo acumulado mês, estimativa esgotamento, alerta visual, modo econômico Haiku/Sonnet toggle com explicação clara do trade-off).

Layouts a entregar:

A) IA ANALYST (Sprint 8)
- Página dedicada acessível via menu lateral
- Sidebar esquerda: histórico perguntas + favoritos + perguntas sugeridas ("Por que minhas vendas caíram?", "Quais clientes prestes a churnar?", "Quais produtos vão zerar estoque?")
- Área central chat-like: input de pergunta sticky no rodapé com placeholder rotativo, histórico de mensagens
- Cada resposta IA: texto + gráficos inline (Recharts: line/bar/donut/funnel) + cards de "ações sugeridas" + tools usadas (transparência: "Consultei: revenue_by_period, conversion_funnel") + custo da resposta + ações (copiar, salvar favorito, exportar PDF)
- Estados: vazio (welcome com 6 perguntas sugeridas em cards), generating (skeleton + "consultando dados…"), erro amigável, sem dados suficientes

B) PAINEL USO IA (Sprint 7+)
- Página em Configurações > IA
- Header: período + exportar CSV
- Cards resumo: total gasto R$+USD, cota %, estimativa esgotamento, modo ativo
- Tabela consumo por feature (descrições/SEO/imagens/vídeos/chatbot/analyst/moderação): chamadas, cache hit %, custo R$, última chamada
- Gráfico evolução diária consumo
- Configurações: limite mensal, bloqueio automático, alerta 80%, modo econômico padrão

C) ESTÚDIO CRIATIVO IA (Sprint 11) — feature mais complexa
- Acessível na edição de produto > "Gerar imagens com IA"
- 4 steps: upload → configurar composição → loading com progresso REAL → resultados
- Step 2 — Selector de estilo como cards visuais: Estúdio limpo / Lifestyle natural / Lifestyle modelo / Macro detalhe / Editorial fashion / Custom prompt
- Variações (1/3/5), tamanho (Instagram square/story/PDP padrão/banner), estimativa custo (≈ R$0,80) e tempo (45s)
- Step 3 — Barra progresso real, "Gerando 5 variações… 2 de 5 prontas", preview parcial conforme prontas, opção cancelar
- Step 4 — Grid 2x3 com hover comparador antes/depois, ações por resultado (salvar/descartar/regenerar/editar prompt)
- Histórico gerações lateral (últimas 10 deste produto)
- Estados erro provedor, cota excedida, baixa qualidade

D) EDITOR "COMPRE O LOOK" (Sprint 10)
- Acessível na fila UGC > foto aprovada > "Editar tags"
- Canvas central com foto UGC (70% width)
- Painel lateral: lista de tags adicionadas
- Adicionar tag: clique na foto → modal busca produto → seleciona → tag fixada
- Editar tag: arrastar reposicionar, clicar trocar produto, X remover
- Toolbar: modo editar/preview cliente
- Preview cliente mostra como cliente vê (hover na tag mostra card produto + link)

E) FILA MODERAÇÃO UGC (Sprint 10)
- Página "Conteúdo > UGC"
- Filtros (status, período, cliente)
- Grid de fotos pendentes (3-4 colunas), cada card: foto + nome cliente + data + selo "automaticamente flagged" + botões aprovar/rejeitar
- Click abre modal: foto grande, análise IA ("Provável conteúdo apropriado. Score: 0.95"), histórico cliente (% aprovação), botões Aprovar/Rejeitar com motivo opcional/Aprovar e abrir editor compre o look
- Bulk actions

F) EDITOR HOMEPAGE PERSONALIZADA (Sprint 12)
- Página Aparência > Homepage
- Sidebar esquerda: variantes (Cliente novo / Recorrente / VIP / Default)
- Canvas central: preview com variante selecionada
- Editor por seção: hero, coleções destaque, produtos featured. Cada seção toggle "diferente por variante"
- "Preview as user X" dropdown

Restrições:
- Sem cores fluorescentes ou neon
- Sem ilustrações 3D pseudo-IA (cérebros, robôs, redes neurais)
- AI badge sempre sutil — IA é poder, não show
- Microcopy nunca: "magia", "automaticamente", "instantâneo" — sempre realista ("em segundos", "estimativa", "geralmente em 30s")

Referências mood: Linear AI features, Notion AI, Vercel AI dashboard, Photoroom AI Studio, Pebblely, Anthropic Console.
NÃO referência: ChatGPT (gradiente roxo over-used), Midjourney (Discord terminal), DALL-E web (vazio).

Output esperado: extensões em packages/ui/ (componentes IA reutilizáveis), Figma com componentes adicionados ao design system Lojeo, handoff bundle.
```

---

## Notas para o stakeholder antes de iniciar sessão

- Esta é Sessão **C**. PRÉ-REQUISITO: Sessão **A** completa.
- Quando Claude Design perguntar:
  - **Charts lib:** Recharts
  - **Animação durante geração:** sutil (skeleton shimmer + barra progresso). NÃO fancy.
  - **Gradiente roxo/rosa típico de IA:** NÃO. Usar accent verde Lojeo com gradiente sutil pra tom análogo.
  - **Voice input no IA Analyst:** NÃO na v1.

Briefing detalhado completo (referência interna): `docs/design-briefs/C-ai-features-admin-lojeo.md`
