# Lojeo Admin — UI kit

Hi-fi recreation of the Lojeo SaaS admin interface (the application all merchants use, regardless of their storefront template). Built with the Lojeo design system tokens from `../../colors_and_type.css`.

## Files

- `index.html` — interactive shell. Switches between Dashboard / Pedido / Produtos / Login via the floating tabs in the top-right.
- `Sidebar.jsx` — collapsible left nav + topbar with universal search, notifications and "+ Novo" CTA. Exports `Sidebar`, `Topbar`, `Icon`.
- `Dashboard.jsx` — homepage with KPI cards, weekly revenue chart, integration health, latest orders, and an "IA Insights" card.
- `Screens.jsx` — `Products` (list with filter chips + dense table), `Orders` (detail view with vertical timeline + totals + customer panel) and `Login` (Google/Apple OAuth + e-mail fallback).
- `admin.css` / `dashboard.css` / `screens.css` — layered styles. All consume the root tokens (`--accent`, `--paper`, etc).

## Notes for designers

- All numerical/ID values use **JetBrains Mono** with `tabular-nums` so columns align.
- Status colors come straight from semantic tokens. `b-success` / `b-warn` / `b-error` / `b-info` / `b-neutral` / `b-accent` / `b-ai`.
- AI surfaces (the "Insights de hoje" card, badges) use the subtle accent gradient — no purple/pink.
- Empty states, error toasts and microcopy follow the PT-BR voice (see `preview/brand-voice.html`).
- Tables are dense by default; the design system also supports a "compacto" mode (TODO).

## Coverage gaps (TODO)

- Settings tabs (identidade, gateways, frete, e-mail, equipe, IA)
- AI Analyst chat-style page (Briefing C)
- Estúdio Criativo IA (geração de imagem)
- UGC moderation queue
- Customer (CRM) detail with LTV/RFM
- Dark mode toggle (tokens are ready, just needs the switch)
