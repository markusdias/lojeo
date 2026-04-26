# 9. FAQ e resolução de problemas

Esta seção concentra as 15 dúvidas mais comuns que recebemos no suporte. Antes de abrir um ticket, dê uma olhada por aqui — provavelmente você acha a resposta em segundos.

## 9.1 Como adicionar um produto?

Vá em **Produtos > Novo produto**, preencha nome, categoria, preço e estoque, salve. Veja [Gestão de produtos](./02-gestao-produtos.md) para o passo a passo completo.

## 9.2 Cliente não recebe e-mails — o que faço?

1. Confira na ficha do cliente se o e-mail está correto.
2. Vá em **Configurações > Logs > E-mails enviados** e veja se houve tentativa.
3. Peça ao cliente para verificar **spam/lixo eletrônico**.
4. Se mesmo assim falhar, em **Configurações > E-mail** confirme se o domínio remetente está validado (SPF/DKIM).

> 💡 **Dica:** Domínios próprios precisam validar SPF e DKIM uma vez. O Lojeo guia você no processo.

## 9.3 Pedido travou em "pending" — como resolvo?

Pendências comuns:

- Cliente fechou a página antes de finalizar pagamento
- Pix expirou (30 minutos sem pagar)
- Cartão recusado pelo banco

**Ação:** aguarde 24h. Se não pagar, o pedido é cancelado automaticamente. Se quiser cancelar antes, abra o pedido e clique em **Cancelar**.

## 9.4 Como conectar Mercado Pago?

Vá em **Configurações > Pagamentos > Mercado Pago > Conectar**. Você é redirecionado, faz login, autoriza, volta. Pronto.

## 9.5 O que é RFM e por que importa?

**Recência, Frequência, Valor monetário** — três dimensões que classificam clientes. Veja [Clientes](./04-clientes-suporte.md). Use para campanhas direcionadas.

## 9.6 Posso ter colaboradores sem dar minha senha?

Sim. **Configurações > Usuários > Convidar**. Veja [Configurações](./06-configuracoes.md) para os papéis disponíveis.

## 9.7 Como fica meu site se a IA falhar?

A loja continua vendendo normalmente. IA é usada para conveniências (descrições, chatbot, etc.) — nada disso bloqueia o checkout.

## 9.8 Esqueci a senha do painel — como recuperar?

Na tela de login, **Esqueci minha senha**. Se você tem 2FA ativo e perdeu o app, use os **códigos de recuperação** que anotou na configuração inicial.

> ⚠️ **Atenção:** Sem códigos de recuperação e sem o app 2FA, recuperação exige envio de documentos. Demora 3-5 dias úteis.

## 9.9 Como emitir nota fiscal?

Conecte Bling ou Olist em **Configurações > Integrações**. NF-e passa a ser emitida automaticamente. Veja [Pedidos](./03-gestao-pedidos.md).

## 9.10 Estou gastando muito com IA — como reduzir?

Ative **modo econômico** em **IA > Configurações** e defina um **teto mensal**. Veja [Uso de IA](./07-ia-uso.md).

## 9.11 Cliente pediu seus dados (LGPD) — o que fazer?

A solicitação chega na fila em **Configurações > LGPD > Solicitações**. Acesso/exportação é automática; exclusão exige sua aprovação. Veja [LGPD](./08-lgpd-privacidade.md).

## 9.12 Como fazer A/B testing?

**Marketing > Experiments > Novo experimento**. Veja [Marketing](./05-marketing.md).

## 9.13 Posso importar produtos de outra loja?

Sim, via **CSV** em **Produtos > Importar**. Para Shopify, WooCommerce ou Nuvemshop, suportamos exportações nativas.

## 9.14 Como desativar a loja temporariamente (manutenção)?

**Configurações > Geral > Modo manutenção**. Visitantes veem uma página de aviso até você reabrir.

## 9.15 Suporte direto — como falar com humano?

**Ajuda > Falar com suporte** no menu superior, ou e-mail `suporte@lojeo.com`. Atendimento de segunda a sexta, 9h-18h. Para urgências (loja fora do ar), há canal 24/7 listado no painel.

> 💡 **Dica:** Antes de abrir ticket, copie o número do pedido ou ID do produto envolvido. Acelera muito o atendimento.
