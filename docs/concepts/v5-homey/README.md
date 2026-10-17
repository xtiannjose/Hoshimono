# Storefront mockup v5: "warm and homey" direction

> **Frozen concept, 2026-10-17.** Kept for reference only. Do not edit, move or delete anything in this folder; build the app from [mockup v2](../../mockup-v2/README.md).

An alternative visual direction for the Sariwa storefront, built for comparison with [mockup v2](../../mockup-v2/README.md). It is **not** the spec: [05-DESIGN-SYSTEM.md](../../05-DESIGN-SYSTEM.md) still describes v2.

Content, sample data, page structure and behaviour are the same as v2 (same `sariwa.js`, same totals). The visual language and the Home layout change.

## View it

Open `index.html` for all six screens with a System / Light / Dark switch. Any screen also takes `?theme=dark` or `?theme=light`. If local files are blocked, serve the folder with `python -m http.server 8768 --directory docs/concepts/v5-homey`.

## The idea

The neighbourhood market stall and the family kitchen. Terracotta (palayok clay) leads, sage green confirms and reassures, mango marks savings. Round friendly headings, soft cards with gentle shadows, and big easy buttons.

## Choices

| | v5 |
|---|---|
| Palette | Terracotta `#A9452A` for actions, sage `#4E6B4A` for confirmations and selected states, mango `#F2B33D` for savings, soft grey `#F3F1EF` background with slate text |
| Type | Baloo 2 (rounded) for headings and prices, Radio Canada (humanist) for text |
| Shape | 16 px controls (not pills), 18 px images, 24 px cards, 32 px hero and recipe panels, circles for category photos |
| Product card | White card with a soft shadow, terracotta outlined **Add**, terracotta stepper when in the Cart |
| Home hero | Rounded terracotta-tint panel with copy and photo inside, perk badges below |
| Categories | Row of eight round photos with labels |
| Recipe | Sage panel with ingredient chips that dim when unticked |
| Savings | Mango banner over a 4-card row; sale tags are mango |
| Selected state | Sage fill and border |
| Mobile | Rounded tab bar and a terracotta cart bar; hero sits in a tinted card |

## Tokens and contrast

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F3F1EF` | `#1C1F22` |
| `--surface` | `#FCFBFA` | `#24282C` |
| `--ink` | `#2B3035` | `#F0ECE8` |
| `--muted` | `#5B6167` | `#B0B4B8` |
| `--terra` / `--on-terra` | `#A9452A` / `#FFFFFF` | `#E58361` / `#1C1F22` |
| `--sage` / `--sage-soft` | `#4E6B4A` / `#E1EADD` | `#9DBB95` / `#2C3A2B` |
| `--mango` (both modes) | `#F2B33D` with dark text | same |

Measured: ink on bg 11.8 light and 14.1 dark; muted on the quietest surface 5.0 and 6.2; button text 5.9 and 6.1; terracotta text 5.2 and 6.1; sage text 5.8 and 7.1; mango tag text 7.2 and 8.9; input and option-card edges (`--edge`) 3.1 and 3.9. Terracotta links switch to ink on sage panels, where they would miss AA in dark mode.

Baloo 2 and Radio Canada both include the peso sign (U+20B1) and tabular figures, checked on 2026-10-17.

## Checks run on 2026-10-17

- axe-core 4.10 (WCAG 2.2 AA and best-practice rules): no violations on all six screens in light and dark.
- Interaction script: 24 of 24 checks pass (Add and stepper, focus handoff, live region, totals, free-delivery threshold, no horizontal scroll at 390 px, reduced motion).

## Trade-offs to weigh

1. Rounded type and soft shapes feel welcoming and family-friendly, but can read less premium than v4.
2. Shadows and tinted panels add warmth but more visual weight; keep them off dense admin screens.
3. Terracotta, sage and mango are three colours with jobs (act, confirm, save). That only stays clear if each keeps its single job.
