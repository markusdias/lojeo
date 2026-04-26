# 6. Configurações

Esta é a área mais densa do painel — e também a mais importante. Tudo que define como sua loja se comporta vive aqui. Recomendamos visitar todas as abas pelo menos uma vez antes de abrir a loja para o público.

## 6.1 Identidade da loja

Em **Configurações > Identidade**:

- **Nome da loja** (aparece no cabeçalho e e-mails)
- **Logo** (PNG/SVG até 2 MB)
- **Favicon** (ícone da aba do navegador)
- **Cores primária e secundária**
- **Idioma e moeda padrão**

[screenshot: aba Identidade com upload de logo e seletor de cores]

## 6.2 Brand guide IA

O **Brand Guide** ensina a IA do Lojeo o tom de voz da sua marca. Quanto melhor preenchido, mais coerentes ficam descrições, e-mails e respostas do chatbot.

**Campos:**

- Tom de voz (formal, descontraído, técnico, etc.)
- Palavras a usar e a evitar
- Público-alvo (idade, perfil, interesses)
- Exemplos de boas descrições da sua loja

> 💡 **Dica:** Após preencher, regenere descrições antigas em **Produtos > Ações em massa > Regenerar descrições**.

## 6.3 Gateways de pagamento

Em **Configurações > Pagamentos**:

- **Mercado Pago** (recomendado para Brasil)
- **Pagar.me**
- **Stripe** (internacional)
- **PayPal**

Conexão é via **OAuth 1 clique** — você é redirecionado ao site do gateway, autoriza, e volta. Sem copiar chaves manualmente.

## 6.4 Frete

Em **Configurações > Frete**, ative as transportadoras: Correios, Melhor Envio, Jadlog, DHL, FedEx. Cada uma tem fluxo OAuth próprio. Defina **prazo de despacho**, **embalagem padrão** e regras de **frete grátis**.

## 6.5 SEO técnico (robots.txt e sitemap)

O Lojeo gera **sitemap.xml** automaticamente. Em **Configurações > SEO**, edite **robots.txt** se precisar bloquear áreas (recomendamos manter o padrão).

## 6.6 Pixels

[Ver Marketing > Pixels](./05-marketing.md)

## 6.7 Papéis de usuário

Em **Configurações > Usuários**, crie acessos para sua equipe sem compartilhar sua senha.

**Papéis padrão:**

- **Owner** — acesso total
- **Gerente** — tudo, exceto faturamento e exclusão da loja
- **Operador** — pedidos, clientes, suporte
- **Marketing** — campanhas, pixels, UGC
- **Visualizador** — somente leitura

## 6.8 Autenticação 2FA

Em **Configurações > Segurança**, **2FA é obrigatório** para Owner e Gerente. Use Google Authenticator, Authy ou 1Password.

> ⚠️ **Atenção:** Guarde os **códigos de recuperação** num local seguro. Sem eles e sem o app 2FA, você perde acesso.

## 6.9 Logs de auditoria

Em **Configurações > Logs**, veja tudo que aconteceu na sua loja: quem logou, quem editou produto, quem cancelou pedido. Logs ficam disponíveis por 12 meses.

> 💡 **Dica:** Use logs para investigar suspeitas de uso indevido por colaboradores.
