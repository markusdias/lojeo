# Briefing Claude Design — D) Componentes IA NO STOREFRONT do template jewelry-v1

> **Camada:** Template jewelry-v1 (storefront) — extensão do Checkpoint B. NÃO é Lojeo (admin).
> **Bloqueia:** Sprint 9 (chatbot widget visual no storefront), Sprint 12 (homepage personalizada visual no storefront).
> **Pré-requisito:** Checkpoint B (template jewelry-v1) entregue.
> **Output esperado:** componentes específicos adicionados ao pacote `templates/jewelry-v1/components/` + Figma + handoff bundle.

---

## Contexto

A IA do Lojeo (Core) gera resultados que **aparecem no storefront** — o cliente final da loja de joias interage com chatbot, vê recomendações personalizadas, vê hero customizado pelo seu perfil. A inteligência vem do Core Lojeo, mas a CARA visual desses componentes segue identidade do **template ativo** (jewelry-v1) — não do Lojeo (admin).

Este briefing entrega componentes específicos que ESTENDEM o pacote `templates/jewelry-v1/` definido no Checkpoint B. Reusa tokens, paleta, tipografia, sombras, animações de jewelry-v1.

## Princípios

1. **IA invisível pro cliente** — cliente não precisa saber que é IA. Não mostrar badge "AI", não usar copy tipo "nossa IA recomenda" — só mostrar o resultado relevante.
2. **Coerência total com template** — chatbot e recomendações respeitam paleta, tipografia, mood do template ativo (sem identidade visual própria de "feature de IA")
3. **Discreto, premium** — joalheria premium não tem widget de chat berrante. Tudo discreto, classy.
4. **Mobile-first** — maioria do tráfego é mobile, componentes IA precisam funcionar bem em tela pequena

## Componentes a entregar

### 1. Chatbot Widget Storefront (Sprint 9)

**Posição:** canto inferior direito (sticky), abaixo de qualquer outro elemento flutuante (cookies, etc).

**Estado fechado (FAB):**
- Bolha discreta (48px diâmetro)
- Cor: accent do template (default dourado fosco `#B8956A`)
- Ícone: sutil, não usar ícone de "chat bubble" cartoon — preferir ícone "sparkle" ou "•••" minimalista
- Hover: pequeno lift + tooltip "Posso ajudar?"
- Animação de entrada: fade-in 1s após scroll inicial (não aparece imediatamente — deixar cliente olhar a loja primeiro)

**Estado aberto:**
- Painel flutuante (380px largura desktop, full-width mobile com slide-up)
- Header:
  - Avatar/símbolo da loja (pequeno)
  - Nome (config do lojista, ex: "Atendimento [Nome da Loja]")
  - Status: online (verde sutil) / offline (cinza)
  - Botão minimizar (–) e fechar (×)
- Body:
  - Mensagem de boas-vindas contextual (ex: "Vejo que está olhando o anel Aurora — posso ajudar?")
  - Sugestões rápidas (chips clicáveis): "Tabela de aros", "Prazo de entrega", "Política de troca", "Falar com humano"
  - Histórico de mensagens (rolagem natural, scroll automático)
  - Cada mensagem do bot:
    - Bubble alinhado à esquerda
    - Cor: surface (`#FFFFFF`) com border sutil
    - Tipografia: corpo do template (Inter no default)
    - Pode incluir card de produto inline (quando bot sugere produto) — usar mesmo card de produto da PLP em mini
    - Pode incluir link/CTA
  - Mensagens do cliente:
    - Bubble alinhado à direita
    - Cor: accent do template (dourado fosco) com texto contrastante
- Footer:
  - Input de mensagem com placeholder "Pergunte sobre joias, frete, prazo…"
  - Botão enviar (ícone)
  - Texto micro: "Posso enganar — confirme detalhes em [WhatsApp do FaqZap]"

**Estados:**
- Bot digitando: 3 pontos animados em bubble vazio
- Bot pensando profundo (>3s): "Procurando…" com sparkle animado
- Erro: "Não consegui te ajudar agora. Quer falar no WhatsApp?" + botão direto
- Escalado pra humano: badge muda pra "Atendimento humano" + cor sutil diferente

**Mobile:**
- FAB no canto inferior direito (mesmo)
- Aberto: slide-up cobrindo viewport inteira
- Botão fechar bem visível

### 2. Card de Produto em Recomendação (Sprint 11)

Já existe card de produto no Checkpoint B. Aqui adicionar variantes para contextos de recomendação:

**RelatedProducts (PDP):**
- Carrossel horizontal abaixo da descrição
- Header: "Você também pode gostar"
- 4-6 cards visíveis no desktop, scroll horizontal mobile

**FrequentlyBoughtTogether (PDP + carrinho):**
- Card combo: produto principal + 1 ou 2 sugestões com preço total
- CTA: "Adicionar combo ao carrinho" (com desconto se configurado)
- Layout horizontal com "+" entre produtos

**YouMayAlsoLike (carrinho):**
- 3 cards horizontais antes do CTA checkout
- Mensagem sutil: "Que tal completar com…"

### 3. Hero Personalizado (Sprint 12)

Estende hero do Checkpoint B com 4 variantes:

**Variante "Default" (cliente novo / anônimo):**
- Hero clássico do template (já no Checkpoint B)

**Variante "Cliente recorrente":**
- Hero com "Bem-vinda de volta, [Nome]" sutil em corner
- Imagem hero pode ser de coleção que o cliente nunca viu
- CTA personalizado: "Veja o que chegou desde sua última visita"

**Variante "Cliente VIP" (LTV alto, RFM Champion):**
- Hero com mensagem exclusiva: "Acesso antecipado — coleção Outono"
- Visual destacado (badge sutil "VIP")
- CTA: "Acesso exclusivo"

**Variante "Cliente em risco" (RFM At Risk):**
- Hero com oferta de retenção sutil: "Sentimos sua falta — 10% off na sua próxima"
- Não invasivo, classy

**Importante:** TODAS as variantes seguem identidade visual do template (mesma paleta, tipografia, mood). Apenas o CONTEÚDO muda. Cliente nem percebe que é personalizado — só sente relevância.

### 4. Sugestão de Recompra na Conta do Cliente (Sprint 12)

Card na home da área logada:

- Background sutil (surface diferente do bg principal)
- Header: "Está na hora de repor?" ou "Que tal um novo presente?"
- Cards horizontais de 2-3 sugestões baseadas em ciclo + garantia
- Cada card: imagem produto + nome + preço + CTA "Comprar de novo"

### 5. Galeria UGC na PDP (Sprint 10)

Já mencionado no Checkpoint B como slot. Aqui o spec:

- Header: "Como nossas clientes usam" (ou copy configurável)
- Carrossel horizontal de fotos UGC (real customers)
- 4-6 fotos visíveis desktop, scroll mobile
- Cada foto:
  - Quadrada (aspect ratio 1:1) ou retrato 4:5
  - Hover (desktop): mostrar tags "compre o look" sobre a imagem
  - Click: modal com foto grande + tags clicáveis (vai pra PDP do produto tagged)
- Footer: "Marque [@handle] no Instagram pra aparecer aqui"

### 6. Search semântica visual (Sprint 12)

Estende busca do template:

- Input de busca com placeholder rotativo:
  - "anel dourado para noivado"
  - "presente para o dia das mães"
  - "brinco para uso diário"
  - "colar minimalista"
- Quando cliente digita, mostra sugestões em dropdown:
  - Produtos relevantes (com mini-thumb)
  - Coleções relevantes
  - Frases populares
- Resultados da busca: PLP normal + sutil indicador "encontrei produtos para 'sua intenção'" no topo

### 7. "Avise-me quando voltar" (Sprint 5 — preparar visual aqui)

Já em PDP quando produto esgotado. Spec:
- CTA secundário substituindo "Adicionar ao carrinho": "Avise-me quando voltar"
- Ao clicar:
  - Se logado: confirmação inline "Te avisamos por email + WhatsApp"
  - Se anônimo: modal pedindo email
- Após inscrito: "Você está na lista. Vamos te avisar." com confetti sutil (1s)

## Estados a cobrir (todos componentes)

- Loading
- Erro
- Vazio
- Hover/foco
- Mobile vs desktop
- Quando IA do Core está OFF (modo degradado): widget chatbot mostra "FAQ + WhatsApp" sem bot, recomendações fallback pra "mais vendidos da categoria", hero usa default

## Microcopy (template default — lojista pode customizar)

- Chatbot welcome: "Oi! Sou o assistente da [Nome Loja]. Posso ajudar com produtos, prazo, troca…"
- Chatbot escalation: "Vou te conectar com nosso time, ok?"
- Recomendação: "Você também pode gostar"
- Combo: "Comprados juntos com frequência"
- Sugestão recompra: "Está na hora de repor?"
- Avise-me: "Avise-me quando voltar"

## Pergunta antecipada que Claude Design pode fazer

- **"Posso usar avatar/foto pro chatbot?"** — Símbolo discreto (logo da loja em pequeno), nunca foto humana real. Não usar emoji.
- **"Animações no chatbot?"** — Discretas. Fade, slide, dots animados. Sem confetti, sem bouncing.
- **"Recomendações em todas páginas?"** — PDP (related + bought together), carrinho (you may also like), área logada home (sugestão recompra), homepage (já no Checkpoint B). NÃO em checkout (concentração total na conversão).
- **"Cliente VIP precisa de identificação visual?"** — Não com badge gritante. Apenas mensagem mais exclusiva e oferta diferenciada. Discrição premium.
- **"Como hero personalizado se comporta sem dados (cliente sem histórico)?"** — Fallback pra default automaticamente. Nunca quebrar.

## Referências

- **Notion AI assist** — sutil, não invasivo
- **Apple intelligence prompts** — discrição, classy
- **Mejuri site** — chat se existe é discreto
- **Catbird NYC** — elegância dos componentes secundários
- **Vrai recommendations** — layout de carrosséis

NÃO usar como referência: Drift/Intercom (chat berrante), Tidio (FAB colorido), Shopify default (recomendações genéricas).

## Restrições

- Componentes IA NUNCA quebram identidade do template — coerência absoluta
- Sem badges "Powered by AI" visíveis ao cliente final
- Sem dark patterns (urgência falsa, escassez fake)
- Performance: chatbot widget não pode adicionar mais que 30KB ao bundle inicial (lazy load do conteúdo)
