# Briefing Claude Design — C) UX features de IA NO ADMIN Lojeo

> **Camada:** Lojeo (sistema/admin) — extensão do design system entregue no Checkpoint A. NÃO é template (jewelry-v1, coffee-v1).
> **Bloqueia:** Sprint 8 (IA Analyst), Sprint 10 (Editor compre o look), Sprint 11 (Estúdio criativo + Painel de uso IA).
> **Pré-requisito:** Checkpoint A (design system Lojeo) entregue.
> **Output esperado:** componentes específicos de IA em Tailwind/Figma + handoff bundle.

---

## Contexto

O Lojeo tem **IA nativa profunda** como diferencial competitivo central. Estas features vivem TODAS no admin Lojeo — usadas pelo lojista pra criar conteúdo, gerar imagens, analisar dados, gerenciar moderação UGC. A IA é parte do **Core Lojeo, independe do template ativo** (joalheria, café, etc).

Identidade visual destas telas = identidade Lojeo (Checkpoint A). Reusar tokens, tipografia, paleta, componentes-base do design system Lojeo. Esta entrega adiciona componentes específicos de IA NÃO existentes no Checkpoint A.

## Princípios de UX para IA

1. **Transparência de custo** — toda ação de IA mostra impacto no consumo (cota mensal, custo estimado em USD)
2. **Modo degradado visível** — quando IA falha, lojista vê mensagem clara e consegue continuar trabalhando manualmente
3. **Loading honesto** — geração de imagem/vídeo demora 30-60s. Mostrar progresso real, não fake spinner.
4. **Cache visível** — quando resultado vem de cache (não consumiu IA nova), mostrar badge sutil "do cache" (educativo)
5. **Brand consistency** — tudo que IA gera respeita brand guide configurado pelo lojista no template ativo
6. **Edição humana sempre** — IA gera, lojista edita. Nunca "salva automático".

## Componentes de IA específicos a criar

### 1. AI Badge (sutil)

- Indica visualmente que um botão/feature usa IA
- Gradiente sutil (não chamativo) — usar accent verde Lojeo com leve gradiente para um tom análogo
- Tamanhos: inline (16px), badge (20px), prominent (24px)
- Variantes: free (grátis para o lojista), premium (consome cota), heavy (consome cota e demora)

### 2. AI Generate Button

- Botão "Gerar com IA" — usado em descrição de produto, SEO, copy de email, etc
- Estados: idle, generating (com progresso real ou skeleton), error, regenerate
- Microcopy: "Gerar descrição", "Gerando…", "Tente outro tom", "Refazer"
- Mostra custo estimado em hover/tooltip (ex: "≈ R$0,02")

### 3. AI Result Card

- Resultado gerado pela IA com ações: aceitar, regenerar, editar, descartar
- Comparador "antes/depois" quando aplicável (especialmente imagem)
- Histórico inline (últimas 3 gerações para escolher)
- Badge "do cache" quando resultado veio sem nova chamada

### 4. AI Cost Meter

- Visualização de consumo:
  - Barra de progresso (% da cota usada)
  - Custo acumulado mês em R$ (e em USD secundário)
  - Estimativa de quando vai esgotar (baseado em ritmo)
  - Alerta visual quando próximo do teto
- Modo econômico toggle (Haiku vs Sonnet) com explicação clara do trade-off

## Layouts a entregar

### A) IA Analyst (Sprint 8)

> "Pergunte ao seu negócio em linguagem natural"

**Página dedicada no admin** acessível via menu lateral.

Layout:
- **Sidebar esquerda:** histórico de perguntas + favoritos + perguntas sugeridas (ex: "Por que minhas vendas caíram?", "Quais clientes estão prestes a churnar?", "Quais produtos vão zerar estoque?")
- **Área central:** chat-like interface
  - Input de pergunta no rodapé (sticky), placeholder rotativo com sugestões
  - Histórico de mensagens (rolagem natural)
  - Cada resposta da IA tem:
    - Texto de análise
    - Gráficos inline (line, bar, donut, funnel — usar Recharts)
    - Cards de "ações sugeridas" ao final ("Criar campanha de reengajamento", "Repor estoque de X", "Investigar checkout step 3")
    - Tools usadas (transparência: "Consultei: revenue_by_period, conversion_funnel")
    - Custo da resposta (≈ R$0,15)
    - Ações: copiar análise, salvar como favorito, exportar PDF
- **Topbar:** botão "Nova conversa", filtro de período padrão

Estados:
- Vazio (primeira vez): tela de boas-vindas com 6 perguntas sugeridas em cards clicáveis
- Generating: skeleton de mensagem + indicador "consultando dados…"
- Erro: mensagem amigável + botão "tentar de novo"
- Sem dados suficientes: "ainda não tenho dados suficientes pra responder isso. Volte após X dias de operação."

### B) Painel de Uso de IA (Sprint 7+)

> Visualização e controle de consumo de IA

**Página em Configurações > IA** acessível via menu.

Layout:
- **Header:** seleção de período (este mês, mês passado, 30d, custom) + botão "Exportar CSV"
- **Cards de resumo (top):**
  - Total gasto no período (R$ + USD)
  - Cota usada / Cota total (% + barra)
  - Estimativa quando esgotará
  - Modo ativo (Sonnet / Haiku — toggle)
- **Tabela de consumo por feature:**
  - Feature (descrições, SEO, imagens, vídeos, chatbot, analyst, moderação UGC)
  - Chamadas
  - Cache hit rate (%)
  - Custo R$
  - Última chamada
- **Gráfico:** evolução diária do consumo
- **Configurações:**
  - Limite mensal (R$)
  - Bloqueio automático ao atingir limite (toggle)
  - Alerta a 80% do limite (toggle + email)
  - Modo econômico padrão (Haiku) — toggle com explicação:
    - "Modo econômico usa modelo mais simples e barato. Qualidade levemente inferior em descrições longas e análises complexas. Recomendado para descrições rápidas e chatbot. Não recomendado para análises estratégicas."

### C) Estúdio Criativo IA (Sprint 11)

> Foto de celular vira conjunto profissional pronto para loja e anúncios

**Página acessível na edição de produto > "Gerar imagens com IA"** OU como ferramenta dedicada na sidebar.

Layout:
- **Step 1 — Upload:**
  - Drag & drop área (suporta múltiplas fotos)
  - Foto base do produto isolada
- **Step 2 — Configurar composição:**
  - Selector de estilo (presets visuais como cards):
    - Estúdio limpo (fundo branco/marfim profissional)
    - Lifestyle natural (mesa de madeira, plantas, luz natural)
    - Lifestyle modelo (modelo usando — gera com IA)
    - Macro detalhe (close-up dramático)
    - Editorial fashion (fundo colorido, mood magazine)
    - Custom prompt (textarea — pra power user)
  - Variações (1, 3, 5)
  - Tamanho (Instagram square, Instagram story, PDP padrão, banner)
  - Estimativa de custo (≈ R$0,80) e tempo (45s)
- **Step 3 — Loading com progresso real:**
  - Barra de progresso (não fake)
  - "Gerando 5 variações… 2 de 5 prontas"
  - Preview parcial conforme prontas
  - Opção "cancelar" se demorar muito
- **Step 4 — Resultados:**
  - Grid 2x3 de resultados
  - Hover: comparador antes/depois (foto original vs gerada)
  - Ações por resultado: salvar na galeria do produto, descartar, regenerar essa, editar prompt e regenerar todas
  - Bulk actions: salvar todas, descartar todas
- **Histórico de gerações** (lateral): últimas 10 gerações deste produto

Estados:
- Erro de provedor: "Estúdio temporariamente indisponível. Tente novamente em alguns minutos."
- Cota excedida: "Você atingiu o limite mensal de gerações. Aumentar limite ou usar mês que vem."
- Resultado de baixa qualidade: badge "regenerar gratuitamente — primeira tentativa pode falhar"

### D) Editor "Compre o Look" (Sprint 10)

> Tagear produtos em foto UGC para clientes comprarem direto

**Página acessível na fila de UGC > foto aprovada > "Editar tags".**

Layout:
- **Canvas central:** foto UGC ocupando 70% do width
- **Painel lateral direito:**
  - Lista de tags adicionadas (com mini-thumbnail do produto + nome)
  - Adicionar tag: clique na foto na posição desejada → modal de busca de produto (search inline) → seleciona → tag fixada na posição
  - Editar tag: arrastar pra reposicionar, clicar pra trocar produto, X pra remover
- **Toolbar topo:**
  - Modo: editar tags / preview cliente (toggle)
  - Salvar / Cancelar
- **Preview cliente:** mostra como cliente vai ver no storefront (hover na tag mostra card de produto + link)

### E) Fila de Moderação UGC (Sprint 10)

> Aprovar/rejeitar fotos enviadas por clientes

**Página acessível em "Conteúdo > UGC".**

Layout:
- **Filtros topo:** status (pendente, aprovado, rejeitado, suspeito), período, cliente
- **Grid de fotos pendentes** (3-4 colunas):
  - Cada card: foto + nome cliente + data + selo "automaticamente flagged" se aplicável + botões aprovar/rejeitar
  - Clique abre modal com:
    - Foto em tamanho grande
    - Análise IA (ex: "Provável conteúdo apropriado. Score: 0.95")
    - Histórico do cliente (quantas fotos já enviou, % aprovação)
    - Botões: Aprovar, Rejeitar (com motivo opcional), Aprovar e abrir editor "compre o look"
- **Bulk actions:** selecionar várias e aprovar/rejeitar em batch

### F) Editor de Homepage Personalizada (Sprint 12)

> Variantes de hero e seções por perfil de cliente

**Página em Aparência > Homepage.**

Layout:
- **Sidebar esquerda:** variantes (Cliente novo / Cliente recorrente / Cliente VIP / Default)
- **Canvas central:** preview da homepage com variante selecionada
- **Editor por seção:**
  - Hero: imagem/vídeo + título + subtítulo + CTA
  - Coleções destaque: selecionar 3 coleções
  - Produtos featured: regras (mais vendidos, novidades, manualmente)
  - Cada seção: toggle "diferente por variante" → permite customizar
- **Preview as user X:** dropdown pra simular como X tipo de cliente vai ver

## Pergunta antecipada que Claude Design pode fazer

- **"Charts vão usar qual lib?"** — Recharts (compatível com React/Tailwind, padrão Lojeo)
- **"Animação durante geração de imagem?"** — Sutil, não distrair. Skeleton shimmer + barra de progresso + label "X de Y prontas". Não animação fancy.
- **"Como mostrar produtos sugeridos pelo IA Analyst?"** — Cards com mini-thumb + nome + métrica relevante (ex: "venda caiu 40% nos últimos 30d")
- **"Histórico de chat tem busca?"** — Sim, search no topo da sidebar.
- **"Posso usar gradiente roxo/rosa típico de IA?"** — NÃO. AI badge usa accent verde Lojeo com gradiente sutil pra tom análogo. Sem roxo/rosa "ChatGPT-style".
- **"Voice input no IA Analyst?"** — Não na v1. Postergar para Fase 2.

## Referências (mood)

- **Linear AI features** — sutilezas, badge discreto
- **Notion AI** — chat interface, ações pós-resposta
- **Vercel AI dashboard** — métricas de uso
- **Photoroom AI Studio** — fluxo de geração de imagem
- **Pebblely** — UX de geração de cenário pra produto
- **Anthropic Console** — clareza de cost meter

NÃO usar como referência: ChatGPT (gradiente roxo over-used), Midjourney (terminal Discord), DALL-E web (muito vazio).

## Restrições

- Sem cores fluorescentes ou neon
- Sem ilustrações 3D pseudo-IA (cérebros, robôs, redes neurais)
- AI badge sempre sutil — IA é poder, não show
- Microcopy nunca menciona "magia", "automaticamente", "instantâneo" — sempre realista ("em segundos", "estimativa", "geralmente em 30s")
