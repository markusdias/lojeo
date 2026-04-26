# 4. Clientes e suporte

Conhecer seus clientes e atendê-los rápido é o que separa lojas amadoras de lojas profissionais. O Lojeo centraliza base de clientes, atendimento e chatbot em um só lugar.

## 4.1 Base de clientes (/clientes)

Em **Clientes**, você vê todas as pessoas que já compraram (ou se cadastraram) na sua loja. Cada cliente tem ficha individual com:

- Dados de contato e endereços
- Histórico de pedidos
- **LTV** (Lifetime Value): quanto o cliente gastou no total
- **RFM**: classificação por Recência, Frequência e Valor monetário
- Tags personalizáveis (ex: "VIP", "atacado", "primeira compra")

[screenshot: ficha de cliente mostrando LTV, RFM e histórico]

> 💡 **Dica:** Filtre por **RFM = Campeões** para identificar seus melhores clientes e enviar campanhas exclusivas.

A segmentação por RFM é gerada automaticamente toda noite. Categorias incluem: Campeões, Leais, Em risco, Perdidos, Novos.

## 4.2 Tickets de suporte (/tickets)

Toda mensagem que chega — formulário de contato, e-mail, WhatsApp via FaqZap — vira um **ticket** na fila de suporte.

**Estrutura do ticket:**

- Status (aberto, em andamento, aguardando cliente, fechado)
- Prioridade (baixa, média, alta, urgente)
- **SLA**: tempo restante para resposta segundo a política da loja
- Histórico completo da conversa

**Para responder:**

1. Abra o ticket na fila.
2. Digite a resposta no campo de mensagem.
3. Use **Sugerir resposta com IA** para um rascunho baseado no contexto.
4. Clique em **Enviar**. O cliente recebe pelo canal original.

> ⚠️ **Atenção:** O SLA padrão é 4 horas para tickets normais e 1 hora para urgentes. Tickets vencidos aparecem em vermelho.

## 4.3 Templates de resposta

Em **Suporte > Templates**, crie respostas prontas para perguntas frequentes (prazo de envio, política de troca, status do pedido). Cada template aceita variáveis dinâmicas como `{{nome_cliente}}` e `{{numero_pedido}}`.

**Para usar:**

1. Ao responder um ticket, clique em **Inserir template**.
2. Escolha o template.
3. As variáveis são preenchidas automaticamente.
4. Edite se necessário e envie.

## 4.4 Configuração do chatbot

O chatbot do Lojeo atende clientes na própria loja, 24/7, baseado em IA. Configure em **Suporte > Chatbot**.

**Itens configuráveis:**

- **Persona**: nome, tom de voz, idioma
- **Base de conhecimento**: FAQs, política de troca, prazos (alimentada automaticamente do seu catálogo e configurações)
- **Escalação**: quando o bot deve transferir para humano (ex: dúvida fiscal, reclamação)
- **Horário comercial**: fora dele, o bot informa o horário de atendimento humano

> 💡 **Dica:** Revise as conversas do bot em **Suporte > Histórico do chatbot** uma vez por semana. Ajude o bot a melhorar marcando respostas como "boa" ou "ruim".

[ver Uso de IA](./07-ia-uso.md) para entender o custo do chatbot.
