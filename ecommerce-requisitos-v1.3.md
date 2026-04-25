# Plataforma de E-commerce — Documento de Requisitos v1.3

> **Visão:** Um motor único de e-commerce, adaptável via templates, que serve como laboratório de duas lojas próprias (joias e café) e evolui para SaaS multi-tenant. A IA não é um plugin — é uma camada nativa que diferencia a plataforma de todos os concorrentes no segmento de MEI e PME.

---

## 1. Conceito e arquitetura do produto

### Como o sistema funciona

O produto é um **motor único** que não conhece o nicho em que está operando. Ao inicializar, ele lê uma configuração de instância e carrega o template correspondente. Trocar o template muda a identidade visual, os campos de produto, o tom de voz da IA e os blocos da homepage — sem alterar nenhuma lógica de negócio.

**Fase 1 — Laboratório:** duas instâncias independentes, cada uma com seu template e configuração. A loja de joias valida o mercado brasileiro; a loja de café valida o mercado internacional. O mesmo código roda nos dois servidores.

**Fase 2 — SaaS:** o motor evolui para multi-tenant. Novos lojistas se cadastram, escolhem um template e têm sua loja no ar em minutos. A estrutura técnica do laboratório já prevê essa evolução — nenhuma reescrita necessária.

### O que é o template

Um template é um pacote que combina **design + configuração + vocabulário do nicho**. Ele define:

- Layouts e componentes visuais de cada página
- Design tokens: cores, fontes, espaçamentos — incluindo combinações tipográficas curadas para o nicho
- Campos de produto específicos do segmento
- Tom de voz padrão para a IA gerar descrições e copies
- Seções configuráveis da homepage

O que o template **não** define: lógica de negócio, pagamentos, frete, banco de dados, autenticação ou segurança — tudo isso vive no motor.

---

## 2. As duas instâncias de laboratório

| | Joias | Café |
|---|---|---|
| **Mercado** | Brasil | Internacional (gringa) |
| **Idioma** | Português (PT-BR) | Inglês (EN-US) |
| **Moeda** | Real (BRL) | Dólar (USD) |
| **Pagamentos** | Pix, cartão, boleto | Stripe, PayPal |
| **Frete** | Correios, Jadlog, FedEx | Correios Internacional, DHL, FedEx |
| **Campos de produto** | Material, pedra, quilate, tamanho, aro | Origem, processo, torra, notas sensoriais, moagem, peso |
| **Tom de voz IA** | Sofisticado, emocional, exclusivo | Artesanal, terroir, specialty coffee |
| **Visual** | Elegante, minimalista, fotografias grandes | Quente, storytelling, narrativa de origem |
| **Trust signals** | Certificado, garantia, embalagem presente | Certificações SCA, origem rastreável, data de torra |

O que é **idêntico** nas duas instâncias: todo o motor — pedidos, pagamentos, catálogo, admin, IA, segurança. Apenas o template e as variáveis de ambiente mudam.

---

## 3. Fator moleza — onboarding e configuração sem atrito

> Princípio: qualquer lojista, mesmo sem experiência técnica, deve conseguir ter a loja funcionando em menos de uma hora. Cada configuração que exige mais de um clique é um problema a resolver.

### 3.1 Setup guiado por IA

Ao criar uma nova instância, um assistente de configuração faz perguntas simples ao lojista e configura tudo automaticamente:

- "Qual é o nome da sua loja e o que você vende?" → define nome, slogan, seleciona o template mais adequado ao nicho
- "Me manda seu logo" → aplica ao template, gera favicon automaticamente
- "Quais são as suas cores de marca?" → IA aplica o esquema de cores ao template. Se não tiver, sugere paletas alinhadas ao nicho
- "Cole aqui os dados dos seus primeiros produtos" → IA preenche descrições, tags e SEO automaticamente
- "Escolha como quer receber pagamentos" → configura gateways com fluxo de autorização direto, sem copiar chaves

### 3.2 Integrações com 1 clique

Todas as integrações funcionam no modelo de 1 clique — sem necessidade de copiar chaves de API manualmente nem acessar documentação externa:

- "Conectar Stripe" abre o fluxo OAuth do Stripe — o lojista autoriza e a conexão está feita
- "Conectar Mercado Pago" abre o fluxo de autorização OAuth direto com o gateway
- "Conectar Melhor Envio" conecta automaticamente todas as transportadoras disponíveis na conta
- "Conectar FaqZap" vincula a conta e já configura os eventos que serão enviados
- "Conectar Google Analytics" abre o fluxo de autorização e insere o código automaticamente
- O mesmo padrão se aplica a todos os pixels (Meta, TikTok), ERPs, Microsoft Clarity, ferramentas de email e marketplaces

### 3.3 Templates plug-and-play com tipografia curada

- Biblioteca de templates com preview ao vivo antes de aplicar
- Trocar de template não perde dados — produtos, pedidos e clientes são independentes do template
- Cada template vem com configurações completas prontas para uso: paleta de cores do nicho, combinação tipográfica curada, seções da homepage com conteúdo de exemplo e campos de produto já definidos

**Tipografia por nicho — combinações curadas:**

O lojista não escolhe fonte de uma lista genérica com centenas de opções. Cada template oferece de 3 a 5 combinações tipográficas pré-selecionadas por um curador de design, todas coerentes com o universo do nicho. O lojista escolhe qual combinação ressoa mais com sua marca — o sistema aplica tudo de uma vez (títulos, corpo, destaques).

Exemplo do tipo de combinação que o template de joias oferece:
- *Combinação A:* fonte serifada clássica nos títulos (transmite herança, luxo e atemporalidade) com fonte sans-serif moderna e fina no corpo e preços (transmite clareza e sofisticação contemporânea)
- *Combinação B:* fonte display elegante com alto contraste de espessura nos títulos com fonte humanista discreta no corpo
- *Combinação C:* tipografia minimalista monoespaço com uso intencional de espaço em branco — para posicionamento de nicho ultra-premium

O template de café ofereceria combinações com fontes que transmitem artesanalidade, origem e autenticidade — completamente diferentes das de joias, embora o motor seja o mesmo.

Além da escolha da combinação, o lojista pode ajustar apenas a hierarquia de tamanhos (títulos maiores ou menores) dentro da combinação escolhida — sem possibilidade de quebrar a harmonia visual.

### 3.4 Instruções contextuais no admin

Em toda tela do painel administrativo há instruções curtas e objetivas explicando o que aquela seção faz e como usar. Nenhuma funcionalidade exige buscar ajuda externa para ser configurada pela primeira vez.

---

## 4. Internacionalização e operação multi-mercado

> Vender para o exterior é mais do que traduzir o site. A loja precisa se adaptar a cada mercado em endereço, formato, impostos, prazos e expectativas — desde o primeiro dia.

### 4.1 Endereçamento adaptativo

O sistema reconhece o país escolhido pelo cliente e adapta o cadastro de endereço dinamicamente:

- Brasil: CEP, estado, cidade, rua, número, complemento
- EUA: ZIP code de 5 dígitos, state (sigla), city, street address, apt
- Reino Unido: postcode no formato próprio (ex: SW1A 1AA), county opcional
- União Europeia: postcode com letras conforme país, com validação por país
- Outros: fallback genérico com campos universais

A validação do endereço acontece em tempo real — o sistema usa o CEP/ZIP/postcode para autocompletar quando possível.

### 4.2 Telefone, data, hora e moeda

- Seletor de DDI internacional com bandeira e validação
- Formatação de data e hora conforme locale do cliente (US: 04/25/2026; UK e BR: 25/04/2026)
- Moeda exibida no formato local com símbolo correto e separadores adequados
- Fuso horário do cliente respeitado em comunicações ("seu pedido será enviado amanhã" considerando o fuso dele)

### 4.3 Impostos, tarifas e mensagens claras

- Aviso claro no checkout sobre possível incidência de VAT, taxas alfandegárias e impostos de importação no destino — para evitar reclamação após a entrega
- Cálculo estimado de impostos quando possível (baseado no país e categoria do produto)
- Restrição automática por país: alguns produtos podem não ser exportáveis para certos destinos — o sistema bloqueia o checkout com mensagem clara
- Prazo de entrega realista exibido em destaque: envio internacional pode levar 7 a 30 dias dependendo da rota e da alfândega — informação que evita 80% das reclamações pós-venda

### 4.4 Conteúdo localizado

- Páginas estáticas (Sobre, Política, Trocas) podem ter versões diferentes por idioma
- Emails transacionais e mensagens de FaqZap respeitam o idioma do cliente
- Tom de voz da IA se adapta ao idioma e ao mercado configurado na instância

---

## 5. Sincronização com gateways de pagamento

> O princípio é simples: a loja é a fonte da verdade. O que acontece aqui se reflete automaticamente nos gateways — de forma segura, dentro das boas práticas da indústria e sem expor dados sensíveis.

### 5.1 O que é automatizado (a loja comanda, o gateway obedece)

Estas ações realizadas no admin disparam automaticamente no gateway conectado:

| Ação na loja | O que acontece no gateway |
|---|---|
| Produto criado | Produto e preço criados no gateway |
| Preço alterado | Novo preço criado; preço anterior arquivado |
| Produto pausado ou arquivado | Produto desativado — impossível iniciar nova cobrança |
| Estoque zerado | Marcado como indisponível — impede compra mesmo por link direto |
| Produto reativado | Reativado no gateway e disponível |
| Plano de assinatura recorrente criado | Plano criado com frequência e preço definidos |
| Plano alterado | Novo plano criado; assinantes existentes migrados ou notificados conforme regra |
| Reembolso solicitado no admin | Estorno iniciado diretamente no gateway |
| Cliente criado na loja | Customer criado no gateway para cobranças futuras |
| Cupom de desconto criado | Coupon criado no gateway |

### 5.2 O que NÃO é automatizado (requer ação manual no gateway — por segurança)

Estas configurações são sensíveis demais e devem ser feitas diretamente na plataforma do gateway pelo titular da conta:

- Dados bancários e configurações de saque (payout)
- Configurações fiscais e tributárias do gateway
- Regras de antifraude no nível do gateway
- Verificações de identidade e compliance (KYC)
- Limites de transação e gestão de disputas
- Configurações de risco e bloqueio de países
- Rotação de chaves de API

A loja nunca armazena nem manipula dados de cartão — toda tokenização é feita diretamente pelo SDK do gateway no navegador do cliente.

### 5.3 Visibilidade e saúde da integração

O admin exibe em tempo real o status de cada gateway:

- Verde: conectado e operacional
- Amarelo: conectado com alertas (ex: produto fora de sincronia)
- Vermelho: desconectado ou erro de autorização

Quando há divergência entre o estado da loja e o gateway, o sistema detecta, alerta o lojista e oferece um botão "Ressincronizar" para corrigir com 1 clique.

---

## 6. Funcionalidades — Motor

### 6.1 Configuração da instância

Cada deploy possui um arquivo de configuração que diz ao motor "quem ele é":

- Identidade: nome, logo, favicon, slogan, paleta de cores, combinação tipográfica ativa
- Template ativo
- Idioma e moeda padrão; mercados habilitados
- Gateways de pagamento habilitados
- Transportadoras e regras de frete
- Campos customizados de produto por nicho

### 6.2 Catálogo de produtos

**Obrigatório para lançar:**
- Produto com nome, descrição rich text, preço, preço promocional, custo (para cálculo de margem), SKU, status e URL amigável
- Variantes com até 3 dimensões, cada uma com estoque e preço próprio
- Galeria de imagens e vídeos múltiplos por produto e variante, com ordem arrastável
- Coleções — agrupamento manual ou automático por regras
- Controle de estoque por SKU com alerta de estoque baixo
- SEO nativo: meta title, meta description e Open Graph editáveis
- Campos de metadados customizados consumidos pelo template
- **Garantia por produto:** período configurável (12 meses, 2 anos), gravado no pedido na hora da compra
- **Política de troca por produto:** prazo configurável, alguns produtos podem ser marcados como não trocáveis (ex: itens de higiene)
- **NCM e regime tributário** por produto para a emissão fiscal correta
- **Restrições de exportação:** lista de países bloqueados por produto, quando aplicável

**IA no catálogo — estúdio criativo de imagem e vídeo:**

A partir de uma única foto do produto, o lojista gera:

*Imagens:* composições com cenário, variações de ângulo, lifestyle, troca de fundo

*Vídeos:* produto em rotação 360°, composição animada estilo reels, unboxing simulado, lifestyle com movimento de câmera

Resultado: foto de celular vira conjunto profissional pronto para loja, redes sociais e anúncios.

**Produtos relacionados com atualização inteligente:**

A IA mantém uma lista de produtos relacionados de forma assíncrona — não roda a cada visita. Processo em segundo plano observa produtos vistos, adicionados e comprados juntos, atualiza periodicamente a lista no banco e o cliente vê uma lista pré-computada. Custo zero por requisição. Lojista pode ajustar manualmente.

**Importante:**
- Importação e exportação de catálogo via CSV
- Pré-venda com data prevista de envio
- **Feeds de catálogo automáticos** para Google Shopping, Meta Catalog, Instagram Shopping — gerados continuamente do catálogo

### 6.3 Storefront (o que o cliente vê)

**Obrigatório para lançar:**
- Homepage com hero, coleções em destaque, banners e seções configuráveis
- Listagem de produtos (PLP) com filtros, ordenação, paginação ou scroll infinito
- Página de produto (PDP) com galeria de imagens e vídeos, variantes, campos do nicho, urgência com dados reais
- **Busca semântica** — cliente busca por intenção, IA retorna produtos relevantes mesmo sem palavra exata. Versão inicial.
- Carrinho com edição, estimativa de frete e resumo
- Checkout otimizado com mínimo de etapas
- **Conta do cliente** com histórico de pedidos, garantias ativas, endereços, rastreamento, **abertura de troca/devolução** e **acesso a NF-e**
- Páginas estáticas com editor simples

**Importante:**
- **Avaliações com moderação interna obrigatória** — cliente que comprou pode avaliar (nota + comentário + foto opcional). A avaliação fica em fila no admin antes de ser publicada. Nunca vai ao ar automaticamente.
- Lista de desejos com notificação automática em promoções
- Produtos vistos recentemente
- Social proof discreto com dados reais
- Opção de presente no checkout
- Página de rastreamento branded
- Login social (Google, Apple)

**Histórico de compras com inteligência de recompra:**

Na área logada, cliente vê seção "Seus produtos" com:
- Data da compra e produto adquirido
- Status e validade da garantia de cada item
- Botão de recompra direta (1 clique para o carrinho)
- Sugestão contextual de presente: "Você comprou este item há 8 meses — que tal presentear alguém com o mesmo?"
- Alerta quando garantia está próxima do vencimento — momento de propor upgrade ou reposição

### 6.4 Pedidos, pagamentos e frete

**Obrigatório:**
- Ciclo de vida: pendente → pago → em separação → enviado → entregue → cancelado — com sincronização automática no gateway
- Pagamentos Brasil: Pix, cartão com parcelamento configurável, boleto
- Pagamentos internacional: Stripe, PayPal
- Transportadoras: Correios, Jadlog, Loggi (Melhor Envio), DHL, FedEx, Correios Internacional
- Cálculo de frete em tempo real com múltiplas opções e prazo
- Emails transacionais automáticos em cada etapa
- Webhooks de pagamento com validação de assinatura

**Importante:**
- Cupons de desconto sincronizados automaticamente no gateway
- Recuperação de carrinho abandonado por email e WhatsApp
- Gift card / vale-presente
- **Plano de assinatura recorrente:** qualquer produto pode ser configurado em ciclo recorrente — frequência e desconto definidos pelo lojista. Plano gerenciado de forma sincronizada com o gateway. Funcionalidade genérica, nicho e nome livres.

### 6.5 Trocas, devoluções e logística reversa

> O Código de Defesa do Consumidor obriga aceitar arrependimento em 7 dias. Sem fluxo claro, esse processo vira um caos de mensagens de WhatsApp.

**Solicitação pelo cliente:**
- A partir do pedido na área logada, cliente abre solicitação informando motivo, item específico (em pedido com múltiplos produtos) e fotos quando aplicável
- Sistema valida automaticamente se o produto está dentro do prazo de troca configurado
- Solicitações fora do prazo ainda podem ser abertas, mas exigem aprovação manual

**Fluxo de aprovação no admin:**
- Estados claros: solicitada, em análise, aprovada, recusada, aguardando produto, recebida, finalizada
- Mensagens automáticas para o cliente em cada transição
- Histórico completo da conversa preservado no pedido

**Operacional:**
- Geração de etiqueta de postagem reversa com 1 clique (via Melhor Envio para nacional, transportadoras parceiras para internacional)
- Reembolso integrado ao gateway no clique de aprovação final
- **Crédito em loja como alternativa ao reembolso:** gera gift card automaticamente — útil para reter receita
- **NF-e de devolução** emitida automaticamente

### 6.6 Fluxo fiscal completo

**Para a loja BR:**
- Emissão automática de NF-e ao confirmar pagamento (regra configurável: alguns lojistas preferem emitir só ao despachar)
- NF-e disponível no email do cliente, na área logada e no admin (PDF + DANFE + XML)
- NF-e de devolução automática em trocas e cancelamentos
- Pedido fica em status "aguardando emissão fiscal" se a NF falhar — alerta no admin para resolver
- Suporte a NCM, CFOP, CST, regime tributário por produto
- Integração com Bling ou Olist via 1 clique

**Para a loja gringa:**
- Não há NF-e, mas há **fatura comercial (commercial invoice)** para alfândega — gerada automaticamente
- Documento de envio (packing slip) com lista de itens, valores e dados do remetente para inspeção alfandegária
- Sistema preenche automaticamente os campos exigidos pelos Correios Internacional e transportadoras

### 6.7 Painel administrativo

**Obrigatório:**
- **Dashboard** com receita por período, pedidos recentes, produtos mais vendidos, visitantes, taxa de conversão, status de saúde dos gateways, alertas pendentes
- Gestão de produtos com estúdio de IA, variantes, estoque, garantia, política de troca, fiscal
- Gestão de pedidos com filtros, detalhe completo, atualização de status, etiqueta
- **Fila de moderação de avaliações** com preview, aprovação ou rejeição em 1 clique, resposta pública opcional
- **Fila de solicitações de troca/devolução** com aprovação, rejeição e ações operacionais
- Configurações da loja com edição completa via interface
- Editor de aparência dentro dos limites do template

---

## 7. CRM — Gestão de clientes e relacionamento

### 7.1 Visão do cliente no admin

Cada cliente possui perfil completo com:
- Dados de cadastro e contato
- Histórico completo de pedidos com valor, data e produtos
- LTV (valor total gasto)
- Número de pedidos
- Segmento RFM automático: campeão, fiel, em risco, hibernado, novo
- Canal de aquisição (origem da primeira compra)
- Avaliações enviadas
- Tickets de atendimento abertos e histórico

### 7.2 Garantias por cliente

Painel exibe todos os itens comprados com:
- Produto e variante
- Data da compra
- Período de garantia
- Data de expiração
- Status: ativa, expirada, próxima do vencimento (alerta 30 dias antes)

Lojista filtra clientes com garantia expirando nos próximos 30, 60 ou 90 dias — lista pronta para ação de retenção.

### 7.3 Inteligência de recompra

Admin sugere proativamente:
- Clientes que compraram determinado produto há X meses (provável reposição)
- Clientes com garantia próxima do vencimento (oportunidade de upgrade)
- Clientes que compraram um item e nunca voltaram (candidatos a sugestão complementar)
- Segmentos prontos para campanhas, com botão para disparar via FaqZap ou email

---

## 8. Equipe e permissões no admin

> Hoje você é o único usuário do admin. Mas atendimento, design, contador e gestão de pedidos podem ser pessoas diferentes — e cada uma deve ver só o que precisa. No SaaS, isso é obrigatório.

### 8.1 Sistema de papéis (roles)

Cada papel tem permissões claras:

| Papel | Pode | Não pode |
|---|---|---|
| **Owner** | Tudo, incluindo desligar a loja | — |
| **Administrador** | Quase tudo | Excluir a loja, alterar dados financeiros |
| **Operador de pedidos** | Ver e atualizar pedidos, gerar etiquetas | Editar produtos, ver faturamento, mexer em config |
| **Editor de catálogo** | Criar/editar produtos, gerar imagens com IA | Ver pedidos, dados de cliente, financeiro |
| **Atendimento** | Ver pedidos, responder tickets, abrir trocas | Editar produtos, ver financeiro |
| **Financeiro / Contador** | Ver relatórios, exportar fiscal, reembolsos | Editar produtos, mexer em pedidos operacionais |

### 8.2 Convite e gestão

- Convite por email com 1 clique (padrão fator moleza)
- Lojista vê quais usuários estão ativos, quando logaram pela última vez
- Pode revogar acesso a qualquer momento
- Logs de auditoria registram quem fez o quê
- 2FA obrigatório para todos os papéis administrativos

---

## 9. Suporte ao cliente final — sistema de tickets

> FaqZap atende perguntas frequentes via WhatsApp. Mas reclamação séria, defeito, ou casos que precisam acompanhamento são tickets — e exigem fluxo próprio.

### 9.1 Caixa de tickets

- Cada conversa de cliente vira um ticket com histórico, status (aberto, em andamento, aguardando cliente, resolvido), responsável atribuído, prioridade
- Ticket vinculado ao pedido quando aplicável — o atendente vê o pedido enquanto conversa
- Ticket vinculado ao cliente — atendente vê todo o histórico dele
- Filtros por status, responsável, data, urgência

### 9.2 Eficiência operacional

- **Templates de resposta** com variáveis (nome do cliente, número do pedido, produto) para agilizar respostas comuns
- **SLA configurável**: primeira resposta em até X horas, alerta visual se passar
- **Atribuição automática ou manual** de tickets para membros da equipe
- **Notas internas** visíveis só para a equipe (não enviadas ao cliente)

### 9.3 Integração com FaqZap

- Conversas que o bot não consegue resolver são escaladas e viram ticket aqui
- Atendente assume e responde do admin — a resposta vai para o WhatsApp do cliente automaticamente
- Histórico unificado: bot + humano no mesmo fio

---

## 10. Notificações para o lojista

> O documento fala muito sobre notificações para o cliente. Sem notificação ao lojista, ele perde tempo refrescando o admin ou perde oportunidade por não responder a tempo.

### 10.1 Eventos críticos

- Novo pedido recebido
- Pagamento aprovado, rejeitado ou chargeback
- Estoque baixo ou zerado em produto ativo
- Avaliação aguardando moderação
- Solicitação de troca ou devolução aberta
- Ticket de atendimento sem resposta há X horas
- Problema de sincronização com gateway
- Falha de emissão fiscal
- Garantia expirando para clientes premium (campeões / fiéis)

### 10.2 Canais de entrega

O lojista escolhe por onde quer ser notificado de cada evento:

- Email
- Push no celular (via PWA)
- WhatsApp via FaqZap (no número do próprio lojista)
- Slack ou Discord (para equipes)

### 10.3 Resumo diário

Opção de receber um resumo diário no horário escolhido:
- Vendas do dia
- Pedidos pendentes de envio
- Tickets em aberto
- Produtos sem estoque
- Alertas importantes consolidados

---

## 11. Inteligência Artificial — diferencial competitivo

> Nenhum concorrente nacional entrega IA nativa para MEI/PME. Shopify cobra em dólar e restringe a planos caros. Tray, Nuvemshop e Loja Integrada não têm nada relevante.

### 11.1 IA para o lojista (backoffice)

| Funcionalidade | Descrição | Prioridade |
|---|---|---|
| Geração de descrições de produto | Botão "Gerar com IA". Tom configurado pelo template e ajustado pelo brand guide. Multilíngue. | Alta |
| Geração de SEO automático | Meta title e meta description otimizados, revisáveis. | Alta |
| Remoção de fundo de imagens | Padroniza fotos no upload. | Alta |
| Estúdio criativo de imagem e vídeo | Composições, variações, lifestyle, vídeos rotacionando, animações, unboxing. | Alta |
| Insights em linguagem natural | "Por que minhas vendas caíram?" — IA analisa dados reais e responde com contexto. | Alta |
| Monitoramento de concorrência e sugestão de preço | Versão inicial. | Alta |
| Previsão de estoque | Análise de histórico e sazonalidade. | Média |
| Segmentação automática de clientes | RFM com ações sugeridas por segmento. | Média |
| Predição de churn | Detecta risco e sugere reengajamento. | Média |

### 11.2 IA para o comprador (storefront)

| Funcionalidade | Descrição | Prioridade |
|---|---|---|
| Busca semântica | Versão inicial. | Alta |
| Chatbot treinado no catálogo | Encaminha ao FaqZap quando necessário. | Alta |
| Recomendação de produtos relacionados | Atualizada em segundo plano, lida do banco em tempo real. | Alta |
| Homepage personalizada | Produtos em destaque mudam conforme histórico. | Média |
| Sugestão de recompra e presente | Na área do cliente, baseada em histórico e garantia. | Média |
| Send time optimization | Email disparado no horário de abertura habitual. | Média |
| Precificação dinâmica | Baseada no monitoramento de concorrência. | Alta |

### 11.3 Tom de voz da marca por instância

Embora o template defina o tom de voz padrão do nicho (joalheria sofisticada vs café artesanal), duas lojas do mesmo nicho podem ter personalidades muito diferentes. O lojista personaliza isso na sua instância:

- **Brand guide:** tom (formal, casual, divertido, irreverente), pessoa (você, vocês, tu), pronome de tratamento, palavras a evitar, palavras a preferir, slogan e tagline
- **Exemplo de copy aprovada:** o lojista cola um trecho que representa bem sua marca e a IA usa como referência de estilo para tudo que gerar dali em diante
- Garante consistência da marca ao longo de meses, mesmo com a IA gerando milhares de descrições

### 11.4 Política de uso e custo de IA

> IA custa dinheiro real. No SaaS, vira variável crítica de margem. Mesmo no laboratório precisa estar mapeado.

- **Painel de uso** mostrando quantas gerações de imagem, vídeo, descrição e busca semântica foram consumidas no mês
- **Limites configuráveis** por instância — alerta antes de chegar no teto, possibilidade de bloquear automaticamente
- **Cache inteligente:** descrição igual gerada duas vezes para o mesmo produto não consome duas vezes; composições de IA já feitas são reaproveitadas
- **Modo econômico opcional:** lojista pode escolher modelos mais simples para economizar quando o resultado já é satisfatório
- **No SaaS:** cada plano terá cota mensal de IA, com excedente cobrado à parte ou via créditos pré-pagos. O desenho do admin já contempla esse modelo desde a v1.

### 11.5 IA conectada ao Microsoft Clarity

- IA consome heatmaps, mapas de scroll e sessões agregadas do Clarity
- Cruza comportamento físico na página (onde clicam, onde param, o que ignoram) com dados de compra
- Gera insights acionáveis: "usuários que chegam à terceira foto têm 3x mais chance de comprar — as duas primeiras imagens precisam ser mais impactantes"
- Alimenta o motor de recomendação com sinais de interesse não capturados pelos pedidos
- Integração via 1 clique

### 11.6 Coleta de comportamento (base de tudo)

Sistema rastreia silenciosamente e de forma anônima:
- Produto visualizado e tempo na página
- Scroll até galeria, vídeo assistido até o fim
- Variante selecionada mas não comprada
- Adicionado e removido do carrinho
- Busca realizada e resultado clicado
- Abandono em cada etapa do checkout

Trilha alimenta personalização e relatórios. Visitantes anônimos identificados por fingerprint de sessão, sem dado pessoal — compatível com LGPD.

---

## 12. Analytics, pixels, SEO e descobribilidade

### 12.1 Pixels e tags

- **Google Tag Manager** — container único, motor injeta o ID
- **Google Analytics 4** — funil completo, receita, LTV, origem
- **Meta Pixel** — Conversions API server-side + pixel client-side
- **TikTok Pixel** — mesmos eventos do Meta
- **Google Ads Conversion Tracking** — para otimização de ROAS
- **Microsoft Clarity** — heatmaps e sessões consumidos também pela IA

### 12.2 Funil e atribuição

- Parâmetros UTM preservados até o pedido
- Funil de conversão nativo com taxa em cada etapa
- Relatório de abandono por etapa do checkout
- A/B testing nativo integrado ao sistema de templates
- Atribuição multi-touch com modelo configurável

### 12.3 SEO técnico e descobribilidade orgânica

> Sem isso, a loja não aparece no Google e fica refém de tráfego pago. Investimento essencial no longo prazo.

- **Schema.org / dados estruturados** de produto, breadcrumb, organização, avaliações — para Google Shopping e rich results
- **Sitemap.xml automático** atualizado a cada mudança de catálogo
- **Robots.txt configurável** pelo admin
- **Redirects 301 automáticos** quando produto é arquivado ou URL muda — evita perder ranking
- **Canonical tags** em variantes para evitar conteúdo duplicado
- **hreflang** quando a loja tem versões em múltiplos idiomas no mesmo domínio (relevante no SaaS)
- **Blog ou área de conteúdo nativa:** o lojista pode publicar guias, histórias e conteúdo SEO. Para joias: "como escolher anel de noivado". Para café: "diferença entre processo natural e lavado". A IA ajuda na escrita seguindo o brand guide. Tráfego orgânico crítico no longo prazo.
- **Otimização automática de imagens** com alt text gerado por IA e nomes de arquivo descritivos

---

## 13. Métricas de saúde do negócio

> O dashboard mostra receita e pedidos. Mas saúde de negócio exige outras métricas — sem elas o lojista vende mas não sabe se está crescendo bem.

### 13.1 Métricas estratégicas no dashboard

- **CAC (Custo de Aquisição de Cliente):** calculado puxando gasto de Meta Ads e Google Ads via API e dividindo pelo número de novos clientes do período
- **LTV com projeção:** quanto cada cliente já gastou e quanto a IA prevê que vai gastar nos próximos 12 meses
- **Margem por produto e por pedido:** baseada no campo de custo do produto
- **Margem da loja como um todo:** receita líquida após custo de produto, frete, taxas de gateway e comissões
- **Taxa de recompra** e tempo médio entre compras
- **Análise de coorte:** clientes que compraram em determinado mês continuam comprando? Visualização visual da retenção ao longo do tempo
- **Ticket médio por canal** (orgânico, pago, indicação, redes sociais)
- **NPS (Net Promoter Score)** automatizado pós-entrega via FaqZap — métrica de satisfação que traduz em recomendação espontânea

### 13.2 Filtros e exportação

- Todos os relatórios filtráveis por período, canal, segmento de cliente, categoria de produto
- Exportação para CSV e PDF
- Relatórios programados que o lojista recebe por email (ex: "todo dia 1, manda o resumo do mês passado")

---

## 14. Conteúdo gerado por usuários (UGC)

> Avaliações com foto já são UGC, mas é só o começo. Para joias e café — produtos altamente "instagramáveis" — UGC é gasolina de marketing.

### 14.1 Galeria de clientes na PDP

- Cliente posta foto usando o produto com tag específica em redes sociais (ou faz upload direto pela área logada)
- Lojista revisa e seleciona quais fotos exibir na PDP
- Galeria "Como nossos clientes usam" enriquece a página de produto com prova social real

### 14.2 Compre o look

- Foto de cliente real com link direto para os produtos que aparecem nela
- Especialmente poderoso para joias (combinações de peças) e café (rituais de preparo)

### 14.3 Programa de embaixadores

- Clientes recebem código pessoal e ganham comissão por venda atribuída
- Vinculado ao programa de afiliados — mesmo motor, mesmo painel
- Painel próprio do embaixador onde acompanha vendas, ganhos e materiais de divulgação

---

## 15. Segurança, conformidade e continuidade

### 15.1 Segurança da aplicação

- HTTPS obrigatório com HSTS
- Proteção contra ataques de formulário (CSRF)
- Sanitização de todos os inputs
- Limite de tentativas em ações sensíveis (login, checkout, IA)
- Upload com validação de tipo real e tamanho
- 2FA obrigatório para todos os papéis no admin
- Registro de auditoria detalhado
- Dados de cartão nunca passam pelo servidor — tokenização total via SDK do gateway
- Validação de assinatura em todos os webhooks de pagamento

### 15.2 Privacidade e conformidade legal

- **LGPD:** banner de cookies com consentimento granular, direito de acesso e exclusão, registro de consentimentos
- **GDPR:** para vendas ao mercado europeu
- Senhas com hash seguro
- Chaves de API nunca em texto plano
- Detecção de fraude no checkout com score de risco por pedido

### 15.3 Continuidade do negócio (disaster recovery)

> Backup é só metade da história. O que fazer quando o servidor cai na Black Friday, o gateway fica fora ou a IA está indisponível?

- **Modo degradado:** se a IA estiver fora, a loja continua vendendo — busca volta para texto simples, recomendação volta para regras pré-computadas, geração de copy volta a ser manual. Nada quebra.
- **Fallback de gateway:** se o gateway primário falhar, sistema tenta o secundário automaticamente quando configurado
- **Status page pública** da loja: cliente vê em tempo real se há instabilidade conhecida — reduz tickets de "está fora do ar?"
- **Backup automático diário** com retenção de 30 dias e procedimento de restore testado e documentado periodicamente
- **Plano de contingência** para falhas críticas durante alta demanda (Black Friday, lançamentos)
- **Alertas proativos ao lojista** quando algo crítico está acontecendo — antes do cliente perceber

---

## 16. Performance e experiência

- Core Web Vitals dentro dos limites do Google
- CDN global para assets — crítico para clientes no exterior
- PWA — instalável no celular, push notifications
- Acessibilidade WCAG 2.1 AA
- Otimização automática de imagens e vídeos no upload
- Carregamento progressivo (lazy loading)

---

## 17. Integração FaqZap

> O FaqZap é a ferramenta de comunicação nativa da plataforma — não um chatbot de terceiro.

| Gatilho no e-commerce | Ação no FaqZap |
|---|---|
| Pedido criado | Confirmação com detalhes no WhatsApp |
| Pix gerado | QR code e chave Pix no WhatsApp |
| Pagamento confirmado | Notificação imediata |
| Pedido enviado | Código de rastreio e link da página branded |
| Pedido entregue | Solicitação de avaliação e NPS |
| Carrinho abandonado | Mensagem com link para retomar — 5x mais eficaz que email |
| Garantia próxima do vencimento | Sugestão proativa de recompra ou upgrade |
| Cliente inativo | Reengajamento com produto recomendado |
| Cliente abre o widget de chat | Contexto da página passado para a IA |
| Bot não consegue resolver | Conversa escalada vira ticket no admin |
| Notificações ao lojista | Alertas críticos no WhatsApp do dono |

---

## 18. Estratégias de retenção e crescimento

- **Plano de assinatura recorrente** — qualquer produto, ciclo definido pelo lojista. Genérico por design.
- **Lista de desejos** com notificação automática em promoções
- **Gift card / vale-presente digital**
- **Opção de presente no checkout** com embalagem e mensagem
- **Programa de indicação e afiliados** com link de código pessoal
- **Programa de embaixadores** com painel dedicado
- **Notificação de volta ao estoque**
- **Sugestão de recompra e presente** baseada em histórico e garantia
- **Crédito em loja como alternativa a reembolso**
- Emails transacionais, recuperação de carrinho, reengajamento, newsletter com IA

---

## 19. Marketplaces e canais externos

> Mesmo que a estratégia seja vender direto, ignorar marketplaces é deixar receita na mesa. Para café artesanal exportar, Etsy e Amazon Handmade são quase obrigatórios.

### Direção estratégica

Não precisa estar na v1, mas o motor já é construído pensando nessa expansão:
- SKU único e estável por produto (não pode mudar quando o catálogo cresce)
- Estoque centralizado — venda em qualquer canal reduz o estoque na loja
- Catálogo enriquecido — atributos suficientes para satisfazer requisitos de cada marketplace

### Canais previstos

- **Mercado Livre, Shopee, Amazon Brasil** — integração nativa para o mercado BR
- **Etsy, Amazon Handmade** — integração nativa para a loja gringa
- **Google Shopping feed** — gerado automaticamente, indispensável para tráfego pago
- **Meta Catalog / Instagram Shopping** — feed para anúncios e compra direta no Instagram
- **Pedidos do marketplace puxados para o admin** — gestão unificada em uma única caixa

---

## 20. Integrações prioritárias

| Categoria | Integração |
|---|---|
| Pagamento BR | Mercado Pago / Pagar.me |
| Pagamento Internacional | Stripe, PayPal |
| Frete nacional | Melhor Envio (Correios, Jadlog, Loggi) |
| Frete internacional e premium | DHL, FedEx, Correios Internacional |
| Logística reversa | Melhor Envio (etiqueta de devolução nacional) |
| Fiscal BR | Bling ou Olist (NF-e, NFC-e) |
| Documento internacional | Geração própria de commercial invoice e packing slip |
| Email | Resend ou SendGrid |
| Analytics | Google Analytics 4 + GTM |
| Comportamento | Microsoft Clarity |
| Anúncios | Meta Pixel, TikTok Pixel, Google Ads |
| Imagens e vídeos com IA | Serviços de geração de mídia |
| Remoção de fundo | Remove.bg ou Photoroom |
| Comunicação | FaqZap (WhatsApp Business API) |
| IA | Anthropic Claude API |
| Monitoramento de preços | Serviço de monitoramento de concorrência |
| Marketplaces BR | Mercado Livre, Shopee, Amazon |
| Marketplaces internacionais | Etsy, Amazon Handmade |
| Catálogos sociais | Google Shopping, Meta Catalog |
| Automação | Zapier ou Make (futuro) |

---

## 21. Estratégias de IA comportamental (big players)

| Estratégia | Como funciona | Onde aparece |
|---|---|---|
| "Quem viu isso também viu" | Trilha de visualizações, atualizado em segundo plano | PDP |
| "Frequentemente comprado junto" | Histórico real de pedidos combinados | PDP e carrinho |
| Homepage personalizada por perfil | Destaques mudam conforme histórico | Homepage |
| Urgência com dados reais | Pessoas vendo agora, compras hoje, unidades restantes | PDP |
| Reengajamento preditivo | IA detecta padrão de abandono antes do cliente sumir | Email e WhatsApp |
| Segmentação RFM automática | Classificação por recência, frequência e valor | Admin e campanhas |
| Send time optimization | Email no horário de abertura habitual | Campanhas |
| Garantia como gatilho de recompra | Garantia expirando = momento de propor upgrade ou presente | Email, WhatsApp e área do cliente |
| Insights do Clarity cruzados com compras | Comportamento físico + dados de pedido | Motor de IA |

---

## 22. Roadmap estratégico

### Fase 1 — Laboratório (0 a 12 meses)

**Sprint inicial:** motor + template de joias com obrigatórios. Loja em produção vendendo. Validar checkout, sincronização com gateway, estúdio de IA, busca semântica, fluxo fiscal completo, trocas e devoluções, CRM com garantias, avaliações com moderação, sistema de tickets.

**Segundo sprint:** template de café com tipografia própria, internacionalização real, pagamentos internacionais, plano de assinatura recorrente, fatura comercial.

**Terceiro sprint:** marketplaces principais, blog/SEO de conteúdo, programa de afiliados/embaixadores, métricas estratégicas (CAC, LTV, coorte, NPS).

**Meta:** operar as duas lojas por pelo menos 6 meses antes de abrir o SaaS.

### Fase 2 — SaaS MVP (12 a 24 meses)

Motor multi-tenant. Onboarding self-service com IA. Equipe e permissões totalmente funcional. Planos com cota de IA. Marketplace de templates com comissão para designers externos. Modo degradado e disaster recovery testados.

**Meta:** 100 lojistas pagantes nos primeiros 6 meses de SaaS.

---

## 23. Posicionamento e diferenciais vs concorrentes

| Diferencial | Shopify | Nuvemshop | Tray | Esta plataforma |
|---|---|---|---|---|
| Templates com tipografia curada por nicho | Não | Não | Não | ✓ Nativo |
| Estúdio de imagem e vídeo por IA | Não | Não | Não | ✓ Nativo |
| Busca semântica na versão inicial | Não | Não | Não | ✓ Versão inicial |
| Monitoramento de concorrência + precificação | Via app caro | Não | Não | ✓ Versão inicial |
| Sincronização automática com gateway | Parcial | Parcial | Parcial | ✓ Completo |
| CRM com garantias e inteligência de recompra | Não | Não | Não | ✓ Nativo |
| Avaliações com moderação interna | Via app | Via app | Via app | ✓ Nativo |
| Trocas e devoluções com fluxo nativo | Via app | Limitado | Limitado | ✓ Nativo completo |
| Sistema de tickets integrado ao FaqZap | Não | Não | Não | ✓ Nativo |
| IA para MEI/PME inclusa no básico | Caro/dólar | Não | Não | ✓ Incluso |
| Internacional simples para lojista BR | Sem BR nativo | Não | Não | ✓ Nativo |
| WhatsApp nativo (FaqZap) | Não | Via app | Via app | ✓ Integração própria |
| Clarity integrado com IA de insights | Não | Não | Não | ✓ Nativo |
| Métricas de saúde (CAC, LTV, NPS, coorte) | Caro/restrito | Limitado | Limitado | ✓ Nativo |
| Onboarding guiado por IA | Não | Não | Não | ✓ Nativo |
| Modo degradado e fallback de gateway | Não | Não | Não | ✓ Nativo |
| LGPD nativo | Parcial | Parcial | Parcial | ✓ From scratch |

**Mensagem de posicionamento:** A única plataforma brasileira que combina facilidade extrema de configuração, estúdio criativo com IA, templates com identidade visual profissional por nicho, fluxos operacionais completos (trocas, fiscal, tickets) e sincronização inteligente com os principais gateways — sem cobrar por cada funcionalidade extra.

---

*Documento v1.3 — incorporando trocas e devoluções, fluxo fiscal completo, equipe e permissões, sistema de tickets, notificações ao lojista, brand guide para IA, política de uso de IA, internacionalização real, SEO técnico, métricas de saúde do negócio, UGC, marketplaces, modo degradado e disaster recovery.*

*Próximo passo: levar para o Claude Code para construção da Fase 1.*
