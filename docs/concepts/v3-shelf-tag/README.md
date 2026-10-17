# Storefront mockup v3: "shelf tag" direction

> **Frozen concept, 2026-10-17.** Kept for reference only. Do not edit, move or delete anything in this folder; build the app from [mockup v2](../../mockup-v2/README.md).

An alternative visual direction for the Sariwa storefront, built for comparison with [mockup v2](../../mockup-v2/README.md). It is **not** the spec: [05-DESIGN-SYSTEM.md](../../05-DESIGN-SYSTEM.md) still describes v2. If v3 is chosen, the design system gets rewritten from this folder's `market.css`.

Content, sample data, page structure and behaviour are the same as v2 (same `sariwa.js`, same totals). Only the visual language and the Home layout change.

## View it

Open `index.html` in a browser for all six screens with a System / Light / Dark switch. Any screen also takes `?theme=dark` or `?theme=light`. If local files are blocked, serve the folder:

```bash
python -m http.server 8766 --directory docs/concepts/v3-shelf-tag
```

## The idea

Borrow the most trusted object in a supermarket: the yellow shelf tag. Every price sits on a yellow label (red when on sale), set in big condensed numerals, so price clarity becomes the brand. Everything else steps back: black, white, ruled lines and square corners, like a printed price board or a till receipt.

## How it differs from v2

| | v2 | v3 |
|---|---|---|
| Palette | Ink green and calamansi lime | Off-black, paper and shelf-tag yellow; sale tags red |
| Type | Bricolage Grotesque + Plus Jakarta Sans | Archivo only (condensed 62% for display and prices, normal width for text) + Geist Mono for receipts and unit prices |
| Shape | Pills, 14 px fields, 20 px cards | Square everywhere; 1 to 2 px rules instead of card boxes |
| Product grid | Separate rounded cards | Ruled grid of cells, images edge to edge |
| Price | Bold numerals, centavos smaller | Yellow shelf tag, centavos raised |
| Selected state | Ink border on soft lime | Yellow fill, like a highlighted tag |
| Home hero | Split headline and photo | Poster headline across the page, wide photo below |
| Categories | Mosaic with two large tiles | Two-column ruled index with thumbnails |
| Recipe | Panel with checklist | Till receipt with monospaced lines and a total |
| Savings | Lime promo tile in a row | Full-width yellow "weekly flyer" over a ruled deal grid |
| Mobile cart bar | Floating pill | Full-width bar docked above the tab bar |

## Tokens

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F3F4F0` | `#121412` |
| `--surface` | `#FBFBF8` | `#1A1D1A` |
| `--ink` | `#141614` | `#EEF0EA` |
| `--muted` | `#555A54` | `#A9AEA6` |
| `--tag` (yellow, both modes) | `#FFD23F` with `#141614` text | same |
| `--sale` tag | `#C8231B` with white text | same |
| `--btn-bg` / `--btn-fg` | `#141614` / `#FBFBF8` | `#EEF0EA` / `#121412` |

Measured contrast: ink on bg 16.5 light and 16.1 dark; muted on the quietest surface 5.8 and 6.6; dark text on yellow 12.6; white on sale red 5.7; input edges 4.9 and 5.2. Yellow against light paper is only 1.3:1, so it is used for labels and selected fills, never as the only edge of a control.

Archivo and Geist Mono both include the peso sign (U+20B1), checked on 2026-10-17. Archivo has tabular figures; Geist Mono is monospaced. Load Archivo with its width axis (`wdth 62..125`).

## Checks run on 2026-10-17

- axe-core 4.10 (WCAG 2.2 AA and best-practice rules): no violations on all six screens in light and dark.
- Interaction script (24 checks): Add and stepper, focus handoff, live region, cart and recipe totals, free-delivery threshold, cart line minimum, no horizontal scroll at 390 px, reduced-motion fallback. All pass.

## Trade-offs to weigh

1. Uppercase condensed headlines are loud and recognisable, but slower to read than sentence case; v3 keeps them for display type, buttons and labels only.
2. Square, ruled layouts look precise and fit more Products per screen, but can feel colder than v2's rounded cards.
3. One font family is lighter to load than two, but the width axis makes the Archivo file bigger; measure it before Phase 0.
4. Yellow and red tags lean on supermarket convention. That builds instant trust, but sits closer to discount-store territory than v2's fresh-market feel.

Photography placeholders are the same as v2; see the list in [mockup v2's README](../../mockup-v2/README.md#photography-needed).
