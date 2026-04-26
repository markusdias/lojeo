# Handoff · Claude Code

Pacote completo para implementação do template `jewelry-v1`.

## Estrutura

```
templates/jewelry-v1/
├── tokens/
│   └── colors_and_type.css       ← /colors_and_type.css
├── components/                    ← /ui_kits/storefront/*.jsx
│   ├── Primitives.jsx            (Icon, Button, Badge, Stars, ProductCard, SectionHeader)
│   ├── States.jsx                (SkeletonGrid, ErrorState, EmptyState, Toast, FormError)
│   ├── Chrome.jsx                (Header, Footer)
│   ├── Home.jsx
│   ├── PLP.jsx
│   ├── PDP.jsx                   (variantes por tipo: anel/colar/brinco)
│   ├── Cart.jsx
│   ├── Checkout.jsx              (4 steps + sticky resumo)
│   ├── Account.jsx               (5 telas + Tracking branded + WishlistPro)
│   ├── Auth.jsx                  (login/signup/recover)
│   ├── Static.jsx                (about/returns/privacy/terms + 404/500)
│   └── Emails.jsx                (4 templates email-safe)
└── config-schema.json
```

## O que está pronto

| Sprint                        | Status | Onde |
|-------------------------------|--------|------|
| Storefront base (Home/PLP/PDP/Cart) | ✓ | Home, PLP, PDP, Cart |
| Checkout multi-step (4 steps + Pix/Cartão/Boleto + sticky resumo) | ✓ | Checkout.jsx |
| Conta logada (5 telas)        | ✓ | Account.jsx |
| Login social + cadastro + recuperar senha | ✓ | Auth.jsx |
| Wishlist + voltou ao estoque + promoção | ✓ | Account.jsx · WishlistPro |
| Tracking branded (não Correios cru) | ✓ | Account.jsx · Tracking |
| Páginas estáticas (4 templates) | ✓ | Static.jsx |
| 404 / 500 com microcopy joia  | ✓ | Static.jsx · NotFound |
| 4 emails transacionais (table-based, email-safe) | ✓ | Emails.jsx |
| Variantes PDP por tipo (anel/colar/brinco) | ✓ | PDP.jsx · VariantPicker |
| Slots reservados marcados (UGC, FBT, Related, Chatbot FAB) | ✓ | PDP.jsx · SlotMark |
| Urgência (3 estados: normal / viewing / low-stock) | ✓ | PDP.jsx · UrgencyBadge |
| Estados globais (loading/erro/vazio/sucesso/validação) | ✓ | States.jsx |

## Como navegar o protótipo

Header → ícone "user" abre menu com atalhos para todas as telas:
- Conta · Pedidos · Wishlist · Login · Signup
- Sobre · Trocas · 404 · **Emails** · **Estados**

Para testar urgência na PDP, navegar via console:
```js
// abrir PDP com badge "12 pessoas vendo agora":
go({ name: "pdp", id: 1, urgency: "viewing" });
// abrir PDP com badge "Restam apenas 3 unidades":
go({ name: "pdp", id: 1, urgency: "low-stock" });
```

## Slots reservados (preenchimento Sessões C+D)

Marcados visualmente com pill `Slot reservado · IA Core`:
- **PDP**: Frequentemente comprado junto, Você também pode gostar, Como nossas clientes usam (UGC), Chatbot FAB
- **Cart**: Você também pode gostar (recomendações pós-add)

## Tokens

Definidos em `/colors_and_type.css`. Tweakable via `data-*` attrs no `<html>`:
- `data-typo="a|b|c"` (combinação tipográfica)
- `data-accent="champagne|smoke|warm"` (paleta acento)
- `data-bg-tone="warm|neutral"`
- `data-img-radius="0|4|8|16"`
- `data-type-scale="default|larger"`

## Decisões importantes

- **Urgência sempre baseada em telemetria real** — nunca falsa, nunca "5 pessoas viram nas últimas 24h" sem dado por trás.
- **Pix com 5% off** — incentivo configurável, padrão ativado.
- **Cartão até 6× sem juros** — limite editável pelo lojista.
- **Garantia 1 ano** — comunicada em PDP, conta, emails, política.
- **Frete grátis acima de R$ 500** — regra mockada no Cart, deve ir para config.

## Próximos passos sugeridos

1. Implementar tokens como CSS variables reais no `app/globals.css`
2. Substituir mocks (CATALOG, ViaCEP fake, QR code) por integrações
3. Migrar componentes JSX para TSX com tipagem do schema
4. Conectar slots de IA do Core (FBT, Related, Chatbot)
5. Substituir SVGs placeholder por fotografia real do ateliê
