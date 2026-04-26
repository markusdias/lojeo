# 7. Uso de IA

O Lojeo usa inteligência artificial em várias frentes: gerar descrições de produto, escrever respostas de suporte, criar variações de imagem, sugerir SEO, alimentar o chatbot. Tudo isso consome recursos — e por isso você tem total controle e visibilidade do gasto.

## 7.1 Painel /ia-uso

Acesse **IA > Uso e custos** no menu lateral. Você vê:

- **Consumo do mês corrente** em reais (R$) e em tokens
- **Distribuição por funcionalidade**: descrições, chatbot, imagens, suporte, etc.
- **Histórico mensal** dos últimos 12 meses
- **Projeção de gasto** até o final do mês

[screenshot: painel /ia-uso com gráfico de consumo mensal e distribuição por feature]

> 💡 **Dica:** Confira o painel toda segunda-feira. É a forma mais rápida de pegar consumo anormal antes que vire problema.

## 7.2 Orçamento mensal

Em **IA > Configurações**, defina um **teto mensal de gasto**. Quando atingir 80%, você recebe e-mail de aviso. Ao atingir 100%, o sistema entra automaticamente em **modo econômico** (próxima seção).

**Como definir:**

1. Acesse **IA > Configurações**.
2. No campo **Orçamento mensal (R$)**, digite o valor (ex: 200).
3. Escolha o que fazer ao estourar: **modo econômico** (recomendado) ou **bloquear IA**.
4. Salve.

> ⚠️ **Atenção:** Bloquear IA totalmente desativa o chatbot, geração de descrições e tudo mais que dependa de IA. Modo econômico é mais seguro.

## 7.3 Modo econômico (Haiku)

No modo econômico, o Lojeo troca automaticamente para o modelo **Claude Haiku** — mais barato e mais rápido, com qualidade ligeiramente menor para tarefas longas.

**O que muda:**

- Descrições ficam mais curtas e diretas
- Chatbot responde com menos contexto
- Imagens geradas usam pré-cache quando possível
- Custo cai cerca de 80%

Você pode ativar manualmente a qualquer momento, mesmo sem estourar orçamento — útil em períodos de baixa margem.

> 💡 **Dica:** Para datas de pico (Black Friday, Natal), considere ativar modo econômico no chatbot e manter modelo completo só para descrições novas.

## 7.4 Brand Guide impactando descrições

Toda chamada de IA respeita o **Brand Guide** definido em [Configurações](./06-configuracoes.md). Se você atualizar o brand guide, descrições futuras refletem o novo tom imediatamente. Para regerar descrições antigas, use **Produtos > Ações em massa > Regenerar descrições com IA**.

**Boas práticas:**

- Atualize o brand guide a cada mudança de posicionamento
- Mantenha exemplos no brand guide (3 a 5 descrições "modelo")
- Liste palavras proibidas (jargões que sua marca não usa)

> 🚫 **Não faça:** Não regenere todas as descrições da loja de uma vez se você customizou várias manualmente — você perde o trabalho. Filtre por "descrição padrão" antes.
