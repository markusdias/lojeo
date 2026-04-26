# Storefront UI kit — jewelry-v1

Click-thru prototype demonstrating the **jewelry-v1** template applied to a fictional store ("Atelier"). Open `index.html`.

## What's in here

| File | Purpose |
|---|---|
| `index.html` | Boots React + Babel, wires up routing between screens |
| `App.jsx` | Top-level state (route, cart, wishlist) |
| `Chrome.jsx` | Header (sticky, blur) + Footer (dark) |
| `Home.jsx` | Hero · collections · new arrivals · about · UGC · trust |
| `PLP.jsx` | Filters sidebar + product grid + sort + pagination |
| `PDP.jsx` | Gallery · variants · description · reviews · related slot · chatbot FAB |
| `Cart.jsx` | Itens · CEP frete · cupom · YouMayAlsoLike slot |
| `Primitives.jsx` | Button, Chip, Badge, Icon, ProductCard, etc. |
| `data.js` | Fake catalog of 12 placeholder pieces |

## Screens covered (from brief)

- ✅ Homepage (hero · coleções · novos · about · UGC · trust)
- ✅ PLP filtros laterais + sort + pagination
- ✅ PDP galeria + variantes + descrição + nicho fields + reviews + slots reservados
- ✅ Cart com CEP + cupom + recomendações
- ⏳ Checkout multi-step — slot reservado, mock simplificado (não no foco MVP)
- ⏳ Conta / wishlist / tracking / 404 — não mockados aqui (mantemos UI kit focado)

## Reusing components

All Primitives (`Button`, `Badge`, `Chip`, `Icon`, `ProductCard`) are pure visual; pull them into other files. Read tokens from `../../colors_and_type.css`.

## Data

Imagery uses `assets/product-placeholder.svg`. Não há produtos reais — o lojista cadastra; a IA gera copy via brand guide.
