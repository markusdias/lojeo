# 2. Gestão de produtos

O catálogo é o coração da sua loja. O Lojeo foi projetado para que cadastrar, editar e organizar produtos seja rápido — mesmo que você tenha centenas de SKUs. Esta seção cobre todo o ciclo de vida de um produto.

## 2.1 Criando um produto

No menu lateral, clique em **Produtos > Novo produto**. Você verá um formulário dividido em abas: Informações básicas, Variantes, Imagens, SEO, Estoque e Preço.

**Passos:**

1. Preencha **nome**, **categoria** e **descrição curta**.
2. Clique em **Gerar com IA** ao lado do campo de descrição longa para que o Lojeo escreva uma descrição completa baseada no nome e categoria.
3. Defina o **preço de venda** e, opcionalmente, o **preço promocional**.
4. Indique o **estoque inicial** e o **SKU** (código interno).
5. Salve o rascunho. O produto fica oculto até você publicar.

[screenshot: formulário de criação de produto com aba Informações básicas em destaque]

> 💡 **Dica:** A descrição gerada pela IA respeita o tom de voz definido no [Brand Guide](./06-configuracoes.md). Você pode regenerar quantas vezes quiser e editar manualmente.

## 2.2 Variantes (tamanho, cor, material)

Se o produto tem variações — por exemplo, um anel disponível em três tamanhos — ative o switch **"Este produto tem variantes"**. O sistema cria automaticamente uma matriz combinando os atributos.

Exemplo para joias: aro 14, 16, 18 × ouro amarelo, ouro branco. Resultado: 6 variantes geradas, cada uma com SKU, preço e estoque próprios.

> ⚠️ **Atenção:** Mudar atributos depois que existem pedidos é arriscado — pode quebrar histórico. Prefira criar um produto novo.

## 2.3 Imagens

Você pode adicionar imagens de duas formas:

- **Arrastar e soltar** (drag & drop) na área pontilhada da aba Imagens.
- **Seletor tradicional**: clique em **Selecionar arquivos**.

O Lojeo aceita JPG, PNG e WebP até 10 MB cada. As imagens são otimizadas automaticamente (compressão + conversão para WebP) e servidas via CDN.

> 💡 **Dica:** Use o botão **Remover fundo com IA** se enviar foto com fundo branco imperfeito. Resultado em segundos.

## 2.4 SEO automático com IA

Na aba **SEO**, clique em **Gerar SEO com IA**. O sistema preenche automaticamente:

- Título da página (máx. 60 caracteres)
- Meta descrição (máx. 160 caracteres)
- Slug amigável

## 2.5 Importação por CSV

Para cadastros em massa, vá em **Produtos > Importar CSV**. Baixe o template, preencha em uma planilha e faça upload. O sistema valida linha a linha e mostra erros antes de confirmar.

## 2.6 Coleções automáticas

Em **Produtos > Coleções**, crie agrupamentos baseados em regras (ex: "todos com preço acima de R$ 500"). A coleção se atualiza sozinha quando você cadastra novos produtos.

[ver Marketing](./05-marketing.md) para usar coleções em campanhas.
