---
name: jewelry-v1-design
description: Use this skill to generate well-branded interfaces and assets for the Jewelry-v1 storefront template (Lojeo) — a contemporary accessible-premium jewelry storefront in Brazilian Portuguese, with paper warm backgrounds, champagne-gold accents, and three curated typography combos. Either for production or throwaway prototypes/mocks.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files (`colors_and_type.css`, `config-schema.json`, `preview/*`, `ui_kits/storefront/*`, `assets/*`).

Key facts:
- This is a **storefront template**, not the Lojeo admin/system. Identity is jewelry-niche.
- Default mood: minimalist contemporary, paper background + matte gold, generous spacing, subtle animation.
- Lojista (store owner) configures via `config-schema.json` — they pick **whole curated packages** (one of 3 type combos, one of 5 accent metals, one of 4 background tones), never loose fonts.
- Copy in **Portuguese (BR)**, "você" formal-friendly. No emoji, no fake urgency.
- Iconography: Lucide 1.5 stroke. Inline SVGs in `ui_kits/storefront/Primitives.jsx`.

If creating visual artifacts (slides, mocks, throwaway prototypes), import `colors_and_type.css` and use the same data-attributes the storefront uses on `<html>`. Copy assets out of `assets/` (logo, favicon, hero/product placeholders).

If working on production code, treat `colors_and_type.css` as the single source of truth for tokens and the `config-schema.json` as the contract with the admin.

If the user invokes this skill without other guidance, ask them what they want to build, ask 4–8 questions (which combo? which accent? which screen? which sections?), and act as an expert designer who outputs HTML artifacts or production code depending on need.
