---
name: lojeo-design
description: Use this skill to generate well-branded interfaces and assets for Lojeo, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Layer awareness

Lojeo has two distinct visual layers — never confuse them:

1. **Lojeo (sistema/admin/marca corporativa)** — what THIS design system covers. Used by all merchants regardless of niche. Premium-acessível, monocromática + verde profundo `#00553D`, Inter + JetBrains Mono.
2. **Templates (jewelry-v1, coffee-v1, etc.)** — storefronts. Each has its own niche identity. NOT covered here.

If asked to design a storefront, ask which template — and warn that template identities are separate from this skill.

## Quick reference

- Tokens: `colors_and_type.css`
- Logo: `assets/lojeo-*.svg`
- Voice (PT-BR): "Tudo certo!" / "Não rolou — vamos tentar de novo?" / "Um instante…" — never "Loading…", never infantilize.
- Admin UI patterns: `ui_kits/admin/`
- Visual foundations + iconography rules: in `README.md`
