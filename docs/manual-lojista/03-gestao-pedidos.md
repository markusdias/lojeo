# 3. Gestão de pedidos

A fila de pedidos é onde sua loja ganha vida. Esta seção mostra como acompanhar cada pedido do momento da compra até a entrega — incluindo emissão de nota fiscal e cancelamentos.

## 3.1 A fila /pedidos

Acesse **Pedidos** no menu lateral. A tela principal lista todos os pedidos com filtros por status, data, cliente e valor. Cada linha mostra: número do pedido, cliente, valor, status, forma de pagamento e prazo de envio.

[screenshot: tela /pedidos com lista de pedidos e filtros laterais]

> 💡 **Dica:** Salve filtros como "Pedidos pagos aguardando envio" para acessar com 1 clique todo dia.

## 3.2 Transição de status

Todo pedido percorre uma trilha de status automática:

1. **pending** — pedido criado, aguardando pagamento
2. **paid** — pagamento confirmado pelo gateway
3. **preparing** — você marcou como em preparação
4. **shipped** — você gerou etiqueta e despachou
5. **delivered** — transportadora confirmou entrega
6. **canceled** — pedido cancelado (ver 3.5)

A transição **pending → paid** é automática (notificada pelo gateway). De **paid** em diante, é você quem avança.

**Para mover um pedido:**

1. Clique no pedido na fila.
2. Use o botão grande no topo: **Marcar como em preparação**, **Marcar como enviado**, etc.
3. Ao marcar como enviado, informe transportadora e código de rastreio. O cliente recebe e-mail automático.

## 3.3 Tracking (rastreamento)

Quando você informa o código de rastreio, o Lojeo consulta a transportadora periodicamente e atualiza o status sozinho. O cliente também acompanha pelo e-mail recebido e pela área **Minha conta** na loja.

> ⚠️ **Atenção:** Códigos de rastreio inválidos geram aviso depois de 24h. Reconfira a digitação.

## 3.4 NF-e (Nota Fiscal Eletrônica)

Se você conectou **Bling** ou **Olist** em [Configurações > Integrações](./06-configuracoes.md), o Lojeo emite NF-e automaticamente quando o pedido entra em **preparing**.

**Para emitir manualmente:**

1. Abra o pedido.
2. Clique em **Emitir NF-e**.
3. Confirme dados fiscais do cliente (CPF/CNPJ, endereço).
4. O PDF da nota fica disponível para download e é anexado ao e-mail do cliente.

> 🚫 **Não faça:** Nunca cancele uma NF-e direto na SEFAZ — sempre cancele pelo painel Lojeo para manter os registros sincronizados.

## 3.5 Cancelamento

Você pode cancelar um pedido enquanto ele estiver em **pending**, **paid** ou **preparing**. Depois de **shipped**, o cancelamento exige acordo com o cliente e estorno manual.

**Passos:**

1. Abra o pedido.
2. Clique em **Cancelar pedido** no menu de ações.
3. Escolha o motivo (estoque, fraude, solicitação do cliente).
4. Se já houve pagamento, marque **Estornar valor** — o gateway processa o estorno em até 7 dias úteis.

[ver FAQ](./09-faq-resolucao.md) para casos especiais como pedido travado em pending.
