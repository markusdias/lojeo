# 5. Marketing

O Lojeo entrega ferramentas de marketing que normalmente exigem desenvolvedor: pixels de rastreio, testes A/B, recomendações inteligentes e galeria de fotos de clientes (UGC). Tudo configurável sem código.

## 5.1 Pixels e analytics

Em **Configurações > Pixels e Analytics**, você cola apenas os IDs — o Lojeo cuida da injeção correta nas páginas e do consentimento LGPD.

**Pixels suportados:**

- **Google Tag Manager** (GTM-XXXXXXX)
- **Google Analytics 4** (G-XXXXXXXXXX)
- **Meta Pixel** (Facebook/Instagram)
- **TikTok Pixel**
- **Microsoft Clarity** (mapas de calor e gravação de sessão)

**Passos:**

1. Acesse **Configurações > Pixels**.
2. Cole o ID em cada campo correspondente.
3. Salve. Os pixels começam a disparar imediatamente — desde que o cliente consinta no banner de cookies.

[screenshot: tela de pixels com 5 campos de ID]

> ⚠️ **Atenção:** Pixels só disparam para visitantes que aceitaram cookies de marketing/analytics. Veja [LGPD](./08-lgpd-privacidade.md).

## 5.2 A/B testing (/experiments)

Testes A/B servem para validar mudanças com dados reais antes de aplicar para todo mundo.

**Para criar um experimento:**

1. Vá em **Marketing > Experiments**.
2. Clique em **Novo experimento**.
3. Escolha o que testar (ex: cor do botão "Comprar", título da home, posição da galeria).
4. Defina **variante A** (controle) e **variante B**.
5. Determine o **tráfego dividido** (50/50 é o padrão).
6. Defina a **métrica de sucesso** (taxa de conversão, ticket médio, tempo na página).
7. Inicie. O Lojeo coleta dados e avisa quando tiver significância estatística.

> 💡 **Dica:** Rode um experimento por vez no mesmo elemento. Vários simultâneos confundem os resultados.

## 5.3 Recomendações FBT (Frequently Bought Together)

Em cada página de produto, o Lojeo mostra automaticamente "Comprados juntos com frequência". O modelo aprende com o histórico de pedidos da própria loja.

**Configuração em Marketing > Recomendações:**

- Quantidade de itens sugeridos (3 a 6)
- Posição na página (depois da descrição, antes do rodapé)
- Modo manual: você fixa combinações específicas

> 💡 **Dica:** FBT começa a funcionar bem depois de 100+ pedidos. Antes disso, use recomendações manuais.

## 5.4 Galeria UGC (User Generated Content) e moderação

Clientes podem enviar fotos com seus produtos pelo Instagram (com hashtag definida) ou pelo formulário de avaliação. As fotos entram numa fila de moderação.

**Para moderar:**

1. Acesse **Marketing > UGC > Moderação**.
2. Veja cada foto pendente.
3. Clique em **Aprovar** (vai para galeria pública) ou **Rejeitar** (motivo opcional).
4. Aprovadas aparecem na home, página de produto ou galeria dedicada.

> 🚫 **Não faça:** Nunca aprove fotos sem autorização do cliente. O termo de uso do envio cobre isso, mas confira casos sensíveis.

[ver Configurações](./06-configuracoes.md) para gerenciar a hashtag de captura UGC.

## 5.5 Como criar experimento de hero (homepage)

A home da loja já está conectada ao motor de A/B test. Para testar variações do título, subtítulo e botão principal sem mexer em código:

1. Acesse **Marketing > Experiments** e clique em **Novo experimento**.
2. Em **key** (identificador único), use exatamente: `homepage-hero`.
3. Adicione 2 ou mais **variantes**, cada uma com um `payload` no formato:

   ```json
   {
     "headline": "Peças que ficam para sempre.",
     "subheadline": "Joalheria contemporânea feita à mão. Ouro 18k com garantia vitalícia.",
     "cta": { "label": "Explorar coleção", "href": "/produtos" }
   }
   ```

4. Defina o **peso** de cada variante (ex.: 50/50) e ative o experimento.
5. O motor distribui visitantes de forma determinística (mesma sessão sempre vê a mesma variante) e registra automaticamente exposição e cliques no CTA como conversão.

> 💡 **Dica:** Se o experimento estiver inativo ou sem variantes, a home volta ao conteúdo padrão automaticamente — não há risco de quebrar a vitrine.
