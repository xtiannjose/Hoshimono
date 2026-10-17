# Storefront mockup v4: "calm and premium" direction

> **Frozen concept, 2026-10-17.** Kept for reference only. Do not edit, move or delete anything in this folder; build the app from [mockup v2](../../mockup-v2/README.md). The exact original is also preserved as the git tag `concept-v4-premium`.

An alternative visual direction for the Sariwa storefront, built for comparison with [mockup v2](../../mockup-v2/README.md). It is **not** the spec: [05-DESIGN-SYSTEM.md](../../05-DESIGN-SYSTEM.md) describes v2, which was chosen for the app.

Content, sample data, page structure and behaviour are the same as v2 (same `sariwa.js`, same totals). The visual language and the Home layout change.

## View it

Open `index.html` for all six screens with a System / Light / Dark switch. Any screen also takes `?theme=dark` or `?theme=light`. If local files are blocked, serve the folder with `python -m http.server 8767 --directory docs/concepts/v4-premium`.

## The idea

A high-end grocer: quiet, spacious and photography-led. Deep forest green does the work, stone neutrals keep it calm, and a small amber accent marks the few things that matter (cart count, savings, brand line). Large light-weight headlines, thin lines, no card boxes around Products.

## Choices

| | v4 |
|---|---|
| Palette | Forest `#1E3A2F` for actions, stone `#EFEEE9` background, amber `#D9962B` accent; dark mode is a deep forest night `#0F1A15` |
| Type | Manrope only: weight 300 for display, 400 to 600 for the rest |
| Shape | 10 px controls, 12 px images and panels, pills for chips and the stepper |
| Product card | No box: tall 4:5 photo, name, price and a small outlined **Add** on one line |
| Home hero | Large photo left, light headline right |
| Categories | Horizontal rail of tall photos with scroll snap (keyboard scrollable) |
| Recipe | Wide 21:9 photo with the ingredient panel overlapping its corner |
| Savings | Quiet headline beside a 2 x 2 grid of deals |
| Selected state | Ink outline, no fill |

## Tokens and contrast

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#EFEEE9` | `#0F1A15` |
| `--surface` | `#F8F8F5` | `#16231C` |
| `--ink` | `#1C2B24` | `#ECEBE4` |
| `--muted` | `#596058` | `#A7B0A6` |
| `--btn-bg` / `--btn-fg` | `#1E3A2F` / `#F8F8F5` | `#ECEBE4` / `#0F1A15` |
| `--amber` / `--amber-text` | `#D9962B` / `#85550F` | `#E3A640` / `#E3A640` |
| `--sale` | `#A8361F` | `#F08A73` |

Measured: ink on bg 12.7 light and 14.9 dark; muted on the quietest surface 5.0 and 6.5; button text 11.6 and 14.9; amber text 5.5 and 8.3; sale 6.1 and 6.7; input edges 3.6 and 5.0. Amber as a fill always carries dark text.

Manrope includes the peso sign (U+20B1) and tabular figures, checked on 2026-10-17.

## Checks run on 2026-10-17

- axe-core 4.10 (WCAG 2.2 AA and best-practice rules): no violations on all six screens in light and dark.
- Interaction script: 24 of 24 checks pass (Add and stepper, focus handoff, live region, totals, free-delivery threshold, no horizontal scroll at 390 px, reduced motion).

## Trade-offs to weigh

1. Big photos and white space look premium, but show fewer Products per screen; it depends on real photography more than any other direction.
2. Light 300-weight headlines feel elegant on good screens and thin on cheap ones in sunlight; keep them for large sizes only.
3. Quiet tags (text only, no fill) are calm but easier to miss; "Only a few left" and sale prices rely on colour plus words.
