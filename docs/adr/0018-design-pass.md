---
status: accepted
---

# Design pass: a shop-first Home, quiet placeholders and an admin of its own

The 18 Oct review listed what makes the app read as AI-made (roadmap section 9). The owner chose on 2026-10-22 to do the design pass right after the general checkup, and picked: a shop-first Home, quiet photo tiles until real photos arrive, a sidebar frame for the staff screens, and keeping the "h" mark until a designer makes the real one. The rest are defaults Claude chose; the owner may revise them.

## Decision

1. **Home opens on the shop, not a hero.** A slim strip says where we deliver, the next open Slot and the fee (or asks for an area), then the top-level Categories in one row, "Buy again", fresh picks, the Recipe of the week and what is on sale. The headline with one highlighted word, the empty picture box, the pill button and the three equal service tiles go. This departs from `docs/mockup-v2/home.html`; docs/05 records it.
2. **Product photos keep their square space** so nothing moves when real photos arrive, but the space is a plain soft tint with one small icon chosen by the Product's top-level Category. No stripes. Pages that have no photo at all (the hero) do not draw an empty box.
3. **Staff screens get their own frame**: no shopper header, Cart or language switch. A left menu grouped by job on wide screens, a menu button on phones, and the staff member's name, "View shop" and "Sign out" at the top. Status values show as words.
4. **The logo stays** as it is.
5. **One button, one field**: one set of button classes (the `Button` component, links and client components all use it; no class merging library in the browser) and one field style at 44 px. Choice cards (address, Slot, payment, Substitution) are one RadioCard.
6. **Copy reads like people talk**: contractions are fine ("we'll", "you're"), one wording for weighed items, typographic quotes, no "Showing 1 to 6 of 6" when everything fits on one page.

## Consequences

- `docs/05-DESIGN-SYSTEM.md` sections 6, 8 and 9 change; the mockup stays as history.
- The admin layout stops using the shop's root shell.
- Not now: a new logo (business track), real photos (business track), terms and privacy pages (Batch 6.3).
