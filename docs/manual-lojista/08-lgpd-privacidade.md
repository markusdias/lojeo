# 8. LGPD e privacidade

A Lei Geral de Proteção de Dados (LGPD) é obrigatória para qualquer loja que opere no Brasil. O Lojeo já chega com tudo configurado — você só precisa preencher informações da sua empresa e revisar o tom dos textos.

## 8.1 Banner de cookies

Toda loja Lojeo exibe automaticamente um banner de cookies na primeira visita do cliente. O banner pergunta o que ele aceita rastrear.

**Em Configurações > LGPD > Banner**, você pode:

- Editar texto do banner (idioma, tom)
- Escolher posição (rodapé ou popup central)
- Customizar cores (segue tema da loja por padrão)
- Definir tempo de re-consentimento (padrão: 12 meses)

[screenshot: banner de cookies na loja com 3 botões: Aceitar tudo, Rejeitar, Personalizar]

## 8.2 Consent granular (essencial / analytics / marketing)

O cliente pode aceitar ou recusar por categoria:

- **Essencial** (sempre ativo, não pode ser recusado): carrinho, login, checkout
- **Analytics**: GA4, Clarity, métricas internas
- **Marketing**: pixels Meta, TikTok, Google Ads, remarketing

**Como funciona internamente:**

- Pixels só disparam se o cliente aceitou a categoria correspondente
- Se recusar marketing, a loja continua funcionando 100% — apenas sem rastreio publicitário
- A escolha é registrada com data/hora e IP (prova legal de consentimento)

> ⚠️ **Atenção:** Não tente "forçar" o aceite (dark patterns como botão "Rejeitar" escondido). A LGPD exige aceite livre e informado.

## 8.3 Direito de acesso (/conta/privacidade)

Todo cliente cadastrado pode acessar `/conta/privacidade` e:

- **Ver os dados** que a loja tem dele
- **Baixar os dados** em formato JSON ou CSV
- **Corrigir dados** incorretos
- **Solicitar exclusão** da conta

Você é notificado por e-mail e pelo painel quando há solicitação.

**Em Configurações > LGPD > Solicitações**:

1. Veja a fila de solicitações pendentes
2. Para acesso/exportação: o sistema processa automaticamente em até 24h
3. Para exclusão: você precisa aprovar (pode haver pedido em andamento)

## 8.4 Exclusão de conta

Quando o cliente solicita exclusão e você aprova, o Lojeo:

1. Anonimiza dados pessoais (nome vira "Cliente removido", e-mail é apagado, endereço é apagado)
2. **Mantém o histórico de pedidos** anonimizado — exigência fiscal de 5 anos
3. Remove o cliente de listas de marketing
4. Envia e-mail de confirmação

> 🚫 **Não faça:** Não delete pedidos de clientes "para limpar" o sistema. É infração fiscal e LGPD.

## 8.5 Política de privacidade

O Lojeo gera um modelo de política em **Configurações > LGPD > Política**. Personalize com:

- Nome e CNPJ da empresa
- E-mail do encarregado de dados (DPO)
- Endereço físico

> 💡 **Dica:** Se você tem CNPJ ativo, considere indicar um DPO (mesmo sendo você mesmo). Aumenta a credibilidade jurídica.
