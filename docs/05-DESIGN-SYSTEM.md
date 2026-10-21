# Design System

Status: draft v0.2, 2026-10-17. Source of truth for the look and feel of the storefront. Admin and Picker screens reuse the same tokens but follow the denser rules in section 9. The visual reference is [mockup v2](mockup-v2/README.md).

v0.2 is a visual overhaul of v0.1 (leaf green accent, Geist). Content, information architecture, domain rules and component responsibilities are unchanged; colour, type, shape and several layouts are new. The v0.1 mockup stays in [mockup/](mockup/README.md) for reference only.

## 1. Design read

> Reading this as: **consumer grocery storefront for Filipino households, mostly on mid-range phones, with a bright, market-fresh and price-forward language, leaning toward Tailwind v4 + shadcn/ui (customised, never default) + Motion + Phosphor icons.**

Dials (from the `design-taste-frontend` skill): **DESIGN_VARIANCE 6, MOTION_INTENSITY 4, VISUAL_DENSITY 6.** Variance rose from 4 because Home now uses a category mosaic, a savings row with a promo tile and large display type. Motion stays at 4: a shop is a utility on mid-range phones, so motion only confirms actions. Density is unchanged; product grids stay dense.

## 2. Principles

1. **Speed to basket.** Every Product card can add to Cart without leaving the page. On mobile the first Products appear above the fold.
2. **Price clarity.** Price, Unit Price and any weight caveat are always visible together. Prices are the loudest numbers on the screen.
3. **Trust through honesty.** Say plainly when stock is low, when weight is approximate, when a Slot is nearly full.
4. **Bright, not loud.** One lime accent, deep ink for actions, real photography. No decorative gradients, no glassmorphism. Translucency is allowed only on the sticky header and tab bar, where content scrolls underneath.
5. **Works on a bad day.** Weak network, small screen, bright sunlight, one hand.

## 3. Colour tokens

Two brand colours do all the work: **ink** (deep green-black) for text and actions, and **lime** (calamansi) as the single accent. Status colours are semantic and appear only to convey state. Neutrals carry a faint lime tint so the palette reads as one family. No pure black or pure white.

Define as CSS variables, mapped into Tailwind v4's `@theme`. Switch modes with `prefers-color-scheme` plus a manual `data-theme` override.

| Token                   | Light                 | Dark                  | Use                                                            |
| ----------------------- | --------------------- | --------------------- | -------------------------------------------------------------- |
| `--bg`                  | `#F6F8EE`             | `#0B1610`             | Page background                                                |
| `--surface`             | `#FCFDF7`             | `#122019`             | Cards, sheets, inputs                                          |
| `--surface-2`           | `#EBF0DC`             | `#1A2C22`             | Quiet fills, image placeholders, footer                        |
| `--border`              | `#DCE3CB`             | `#253A2E`             | Dividers and card edges (decorative)                           |
| `--border-strong`       | `#7E8F6E`             | `#6F8A78`             | Input, chip and option-card edges (3:1 UI boundary)            |
| `--ink`                 | `#10261A`             | `#EDF3E3`             | Body text, headings, selected states                           |
| `--muted`               | `#4B5A4C`             | `#A6B8A5`             | Secondary text                                                 |
| `--accent`              | `#C9E84E`             | `#D3EE62`             | Lime surfaces: service strip, promo tile, logo mark, highlight |
| `--accent-soft`         | `#E4F2A8`             | `#2C3A10`             | Add button, selected option cards, "In stock"                  |
| `--on-accent`           | `#10261A`             | `#0B1610`             | Text on lime surfaces (always dark)                            |
| `--btn-bg` / `--btn-fg` | `#10261A` / `#C9E84E` | `#D3EE62` / `#0B1610` | Primary buttons, filled stepper, cart bar                      |
| `--hl`                  | `#C9E84E`             | `#3F5414`             | Marker highlight behind one word of display type               |
| `--ring`                | `#10261A`             | `#D3EE62`             | Focus ring                                                     |
| `--sale`                | `#C4301B`             | `#FF8A70`             | Promotion prices and "Save" tags only                          |
| `--sale-soft`           | `#FBE3DD`             | `#3B1D16`             | Promotion tag background                                       |
| `--warn`                | `#7A4E00`             | `#F2C063`             | Low stock, approximate weight, "Only a few left"               |
| `--warn-soft`           | `#FFF1C9`             | `#3A2E10`             | Weighed-item note background                                   |
| `--err`                 | `#B3261E`             | `#FF8F85`             | Validation and failures                                        |

**The primary button flips between modes.** Lime on the light background is only 1.3:1, too weak to mark a button edge. So in light mode a primary button is ink with lime text (11.5:1), and in dark mode it is lime with dark text (14.2:1). Never use lime as a boundary-only element on a light surface; lime surfaces always carry `--on-accent` text.

Measured contrast (WCAG 2.x): ink on bg 14.9 light and 16.3 dark; muted on surface-2 6.3 and 7.0; sale on its soft tag 4.5 and 6.6; warn on its soft note 6.4 and 7.9; border-strong on surface 3.4 and 4.5. Re-measure any token change; adjust the value, not the rule (AA minimum, body text 4.5:1, large text and UI boundaries 3:1).

## 4. Typography

| Role                      | Font                                         | Notes                                                                                |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| Display, headings, prices | **Epilogue** via `next/font/google`          | Variable, weights 400 to 700; headings at 500, prices and h3 at 600, wordmark at 700 |
| UI and body               | **Plus Jakarta Sans** via `next/font/google` | Variable, weights 400 to 700                                                         |
| Codes in admin tables     | **Geist Mono**                               | Order numbers, voucher codes                                                         |

- Epilogue replaced Bricolage Grotesque on 2026-10-17 for a more elegant, lighter heading voice (option C of the font comparison).
- Both families were checked on 2026-10-17: each contains the peso sign (U+20B1) and tabular figures (`tnum`). The peso sign lives in the `latin-ext` subset, so load `subsets: ['latin', 'latin-ext']`.
- Prices use Epilogue 600 with `font-variant-numeric: tabular-nums`. Centavos stay visible but render at 0.66em on cards (`₱160` + `.00`). Product and Cart pages show the full amount at one size.
- Scale (px / line height): 12/16 caption, 13/18 fine print, 14/20 small, 16/24 body, 18/28 lead, 24/30 h3, 32/38 h2, 44/48 h1, display `clamp(44px, 5.2vw, 76px)` / 1.02. Tracking tightens with size: display -0.045em, h1 and h2 -0.035em, h3 -0.025em, body 0.
- Emphasis in display type uses the lime highlight (`--hl`, a marker band behind the word), never a second font.
- Body text never smaller than 14 px on mobile; inputs 16 px to prevent iOS zoom. Prose line length at most 65 characters.

## 5. Shape, space, elevation

- **Radius rule (one system, three steps):** everything you press is a **pill** (buttons, chips, quantity stepper, search, tags, cart bar). Fields and things inside cards are **14 px** (inputs, selects, image slots, option cards, notes). Containers are **20 px** (cards, panels, category tiles, sheets). No other radii.
- **Spacing:** 4 px base; common steps 4, 8, 12, 16, 24, 32, 48, 56, 80.
- **Elevation:** borders and tinted surfaces first. Only floating layers get a shadow: the mobile cart bar and bottom sheets (`--shadow-float`, tinted to the ink hue). Cards in grids have a 1 px border, no shadow; hover darkens the border.
- **Layout:** content width 1280 px centred (`max-w-7xl` plus 24 px gutters), 16 px gutter on mobile. CSS Grid for all grids. Breakpoints: 640, 768, 1024, 1280, 1536. Every multi-column layout declares its collapse below 860 px and 640 px.
- **Z-index scale** (single file `src/config/z.ts`): `base 0`, `sticky 10`, `header 20`, `drawer 30`, `modal 40`, `toast 50`.
- Hero and full-height sections use `min-h-[100dvh]`, never `h-screen`.

## 6. Components

Built on shadcn/ui primitives with the tokens above applied. None ship in default state.

**Primitives to install:** button, input, label, checkbox, radio-group, select, textarea, badge, skeleton, separator, tabs, accordion, popover, command (search), dialog, sheet (cart drawer), drawer (mobile bottom sheet), sonner (toasts), form.

**Domain components (custom):**

| Component            | Notes                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductCard`        | Square image, optional tags row (sale, stock, "By weight"), name (2 lines max), pack size, `PriceTag`, then a full-width **Add** pill (`--accent-soft`). Once the Product is in the Cart the pill becomes a filled `QuantityStepper`, so "in Cart" reads at a glance across a grid. Out-of-stock: greyed image, "Out of stock today" tag, **Notify me** button. |
| `PriceTag`           | Current price (sale price in `--sale`), compare-at strikethrough, Unit Price line, "approx." marker for Weighed Products                                                                                                                                                                                                                                        |
| `QuantityStepper`    | Pill; minus, count, plus; 44 px targets; long-press repeat; announces "Name, 2 in cart" to screen readers. **Filled** variant on cards; **ghost** variant for servings, trays and Cart Lines. Cart Lines stop at 1 and offer Remove separately.                                                                                                                 |
| `CategoryMosaic`     | Home only. 8 Categories in a 4 x 3 grid with no empty cell: Fruit 2 x 2 on `--accent-soft` with a photo, Vegetables 2 x 1 on `--surface-2` with a photo, six 1 x 1 tiles                                                                                                                                                                                        |
| `ServiceStrip`       | Lime band under the hero: delivery fee, freshness check, payment methods                                                                                                                                                                                                                                                                                        |
| `DeliveryButton`     | Header pill with area and next Slot (replaces v0.1's separate top strip); opens the address and Zone picker                                                                                                                                                                                                                                                     |
| `CartButton`         | Desktop header: primary pill with running total and count. Mobile: `CartBar` floating above the tab bar with count, "View cart" and total                                                                                                                                                                                                                       |
| `CartDrawer`         | Sheet on desktop, bottom sheet on mobile; delivery Slot row, free-delivery hint, Cart Lines with Substitution Preference, totals, Checkout button                                                                                                                                                                                                               |
| `SubstitutionSelect` | Three radio cards: "Pick a similar item", "I'll choose", "No substitute"                                                                                                                                                                                                                                                                                        |
| `SlotPicker`         | Day radio cards, then time radio cards. States: Available, "Only a few left" (under 20% capacity, `--warn`), Full (dashed, struck through, disabled), selected ("Held for you for 10 minutes")                                                                                                                                                                  |
| `AddressForm`        | Landmark required; map pin; Zone coverage check inline                                                                                                                                                                                                                                                                                                          |
| `OrderTimeline`      | Vertical steps with timestamps and Rider contact (not in the mockup yet)                                                                                                                                                                                                                                                                                        |
| `RecipePanel`        | Photo, servings stepper, time, two-column ingredient checklist, "Add 5 items, ₱423.00" total that updates as items are ticked                                                                                                                                                                                                                                   |
| `PromoTile`          | Lime tile spanning two grid cells in the savings row; one headline figure taken from real Promotion data                                                                                                                                                                                                                                                        |
| `StockBadge`         | "In stock" (`--accent-soft`), "Only a few left" (`--warn`), "Out of stock today" (quiet)                                                                                                                                                                                                                                                                        |

**Every component documents and implements:** default, hover, focus-visible, active (`scale(0.97)` push), disabled, loading (skeleton shaped like the final layout), empty and error states. No generic spinners.

## 7. Motion

Library: **Motion** (`import { motion } from "motion/react"`). Do not mix GSAP in the same tree. Motion lives only in small `"use client"` leaf components. Use springs, never linear easing, and prefer Motion's `visualDuration` and `bounce` form so values match the `apple-design` guidance (critically damped by default; a little bounce only after a gesture with momentum).

Every animation must answer "what does it communicate?"

| Motion                           | Communicates                 | Spec                                                                                                                                                                                                                                                                                 |
| -------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add pill becomes stepper         | Feedback: item added         | The new control pops in (scale 0.92 to 1, fading in, as in mockup v2) with spring `visualDuration 0.2, bounce 0.1`. Built with `domAnimation` instead of a `layout` morph to keep about 20 KB out of every page (Batch 1.5). Plays only after the shopper acts, never on first paint |
| Count bump (stepper, cart badge) | Feedback: count changed      | scale 1 to 1.18 to 1, same spring                                                                                                                                                                                                                                                    |
| Bottom sheet / cart drawer       | State change; spatial origin | Spring `visualDuration 0.3, bounce 0.2`. Drag tracks the finger 1:1; on release, project the end point from velocity and snap to the nearest detent; rubber-band past the top. Enters and leaves along the same edge.                                                                |
| Skeleton                         | Loading                      | Opacity pulse only, 1.2 s                                                                                                                                                                                                                                                            |
| Home sections fade-up            | Hierarchy, once              | `whileInView`, `once: true`, 24 px, stagger 60 ms; Home only                                                                                                                                                                                                                         |
| Toast                            | Transient confirmation       | Slide and fade, 200 ms                                                                                                                                                                                                                                                               |

Rules: animate only `transform` and `opacity`; no scroll-jacking, parallax, marquees or infinite loops; use `useMotionValue` for pointer or drag values, never `useState`; wrap everything with `useReducedMotion()` and degrade to cross-fades. Search the Motion docs through the `motion` MCP tools before writing animation code, and audit finished work with the `motion` skill's MotionScore.

The static mockup uses CSS `linear()` approximations of the same springs (`--spring-snap`, `--spring-sheet` in `mockup-v2/hoshimono.css`). Do not copy them into the app: a sampled curve cannot be interrupted mid-flight, and a Motion spring can.

## 8. Imagery, icons, copy

- **Photography:** Products on a neutral background, square master, natural light for produce. Hero and category imagery shows real food and real Philippine pantry staples. The mockup's photo slots are labelled with size and subject; replace them with real shots before launch. Never use stock-photo people.
- **Icons:** `@phosphor-icons/react`, `regular` weight, 20 or 24 px, one family only. No emoji anywhere in UI. No hand-drawn SVG icons.
- **Logo:** lime circle with a lowercase "h" plus the "hoshimono" wordmark in Epilogue 700. Both live in `src/config/brand.ts` so renaming stays a five-minute job.
- **Formatting:** `₱1,249.00` everywhere (centavos smaller on cards, never dropped). Weights `500 g`, `1.5 kg`. Dates `Sat, 18 Oct`; times `2:00 to 4:00 PM`. Use a hyphen or "to" for ranges, never an en or em dash.
- **Voice:** plain, warm, concrete. Say "Delivery today, 2:00 to 4:00 PM", not "Seamless same-day experience". Avoid "elevate", "seamless", "unleash". Filipino phrases only where natural and only after the Filipino language pass in Phase 5.
- **Empty states** explain how to fill them ("Your cart is empty. Start with today's fresh picks.").
- **Error messages** say what happened and what to do next, next to the field.

## 9. Admin and Picker screens

Dense and functional, same tokens and fonts, no Motion beyond focus and state transitions. Lime appears only in the logo mark and selected states; actions use ink.

- Tables use TanStack Table with sticky headers, row hover, keyboard navigation and numeric columns in tabular figures (Geist Mono for codes).
- The Picker view is **mobile-first and one-handed**: large tap rows (56 px), aisle-ordered list, big "Short" and "Substitute" buttons, final weight keypad, haptic-friendly confirmations.
- Charts use the `dataviz` skill's palette rules; never colour-only encodings.
- As built (Batch 4.4): admin tables are plain HTML tables with server-side search and filters; TanStack Table waits until a screen needs sorting in the browser. The daily report is number tiles and a 7-day table, no chart yet.
- **Recipe panel** (Batch 5.1): the mockup's Recipe card as one client component, used on Home and on the Recipe page: a heading that follows the servings ("Chicken Adobo for 4"), the ghost servings stepper, a checkbox row per ingredient with its line price, "usually at home" rows unticked, a sold-out row with a similar Product offered unticked under it, and one primary button "Add 5 items, ₱423.00". Recipe and Article photos are cropped to fit (4:3 on Recipes, 16:9 on Articles); an icon shows until a photo is added.
- **Printouts** (pick sheet, delivery receipt) are ordinary pages: the site header, category bar, footer and admin menu carry `print:hidden`, and a Print button calls `window.print()`. Black on white, body size, boxes to tick on the pick sheet.

## 10. Accessibility checklist (per component and per page)

- Contrast: text 4.5:1, large text and UI boundaries 3:1. Lime is never the only edge of a control on a light surface.
- Fully operable by keyboard; visible `:focus-visible` ring (2 px `--ring`, 2 px offset; ink in light mode, lime in dark).
- Real `<button>`, `<a>`, `<input>` with `<label>`; option cards are labelled native radios; `aria-label` on icon-only buttons; errors linked with `aria-describedby`.
- When Add and the stepper swap places, focus moves to the stepper's plus button, and back to Add when the count reaches 0.
- Quantity changes and cart updates announced through a polite live region.
- Touch targets at least 44 px; at least 8 px between adjacent targets.
- Pinch-zoom never disabled.
- Honour `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-color-scheme`.
- Images have meaningful alt text; decorative images use `alt=""`.
- Automated `axe` check on Home, Category, Product, Cart, Checkout in CI; manual screen-reader pass (TalkBack, VoiceOver) before launch. Mockup v2 passed axe-core 4.10 (WCAG 2.2 AA and best-practice rules) on all six screens in both themes on 2026-10-17.

## 11. Performance budget

| Budget                                                 | Value                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| LCP on Home, Category, Product (4G, mid-range Android) | under 2.5 s                                                                                       |
| CLS                                                    | under 0.1                                                                                         |
| INP                                                    | under 200 ms                                                                                      |
| JavaScript on a Category page                          | under 170 KB gzipped                                                                              |
| Product image on a card                                | under 40 KB (AVIF/WebP, correct `sizes`)                                                          |
| Web fonts                                              | under 120 KB woff2 in total (both families, `latin` + `latin-ext`; measured 118 KB on 2026-10-17) |

The hero image uses `next/image` with `priority`; below-the-fold images lazy-load; every image reserves its aspect ratio. If fonts hurt LCP on real devices, self-host files subset to Latin plus U+20B1 with `next/font/local`.

Motion is never in a page's first load: only islands that animate import `components/motion.tsx` (the live Add button and stepper, the Cart count, Cart Lines), and they load lazily. The Add button itself is plain markup until the first tap or until the Cart holds that Product. Measured on 19 Oct (production build, compressed): Home 157 KB, Category 164 KB, Product 157 KB of JavaScript.

## 12. Tailwind v4 mapping (Phase 0)

```css
@import "tailwindcss";

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-ink: var(--ink);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-on-accent: var(--on-accent);
  --color-btn: var(--btn-bg);
  --color-btn-fg: var(--btn-fg);
  --color-sale: var(--sale);
  --color-warn: var(--warn);
  --color-err: var(--err);
  --radius-field: 14px;
  --radius-card: 20px;
  --font-display: var(--font-epilogue);
  --font-sans: var(--font-jakarta);
}
```

Token values live once in `:root` and the dark blocks (copy them from `mockup-v2/hoshimono.css`); components use the semantic utilities (`bg-btn text-btn-fg`, `rounded-card`), never raw hex.

**Implemented in `src/app/globals.css` (Batch 0.2), with two deviations from the snippet above:**

- shadcn already owns the names `muted` and `muted-foreground`. To keep generated components working, `bg-muted` is the quiet fill (`--surface-2`) and **secondary text is `text-muted-foreground`**, not `text-muted`. shadcn names (`background`, `foreground`, `card`, `primary`, `secondary`, `destructive`, `input`) are aliases onto our tokens; our names stay the source.
- Dark mode is driven by `data-theme` on `<html>`, set by `next-themes`, with the `prefers-color-scheme` block as a no-JavaScript fallback. The Tailwind `dark:` variant matches `[data-theme="dark"]`.

Type utilities `type-display`, `type-h1` to `type-h3`, `type-lead`, `type-small`, `type-fine`, `type-price`, the marker `hl` and the page width `wrap` are defined there too.

### As built in Phase 2 (deviations to revisit)

- `CartDrawer` is built on vaul: a bottom sheet on phones and a right sheet from `md`, both following the finger and closing on a fast or long drag. It keeps vaul's own transition, not the Motion spring from section 7, and has no detents: decided 20 Oct, as the Cart has one height and vaul already gives drag, fling-to-close and focus handling; a Motion rebuild would add JavaScript for little visible change. Its delivery row shows the Slot held for the Cart ("Held for you until 8:50 AM"), else the next open Slot for the Customer's address, with Change to Checkout; a guest sees the general line. It is fetched when the drawer opens (`loadDelivery`), so pages load nothing extra.
- `CartButton` shows the goods total, not the total with delivery: the fee depends on the address chosen at Checkout.
- The Rider's screen (`/admin/deliveries`) follows the Picker rules: one card per stop with the landmark and the Customer's note, a 56 px Call button, the PIN on a numeric keypad, the cash pre-filled.
- The Picker view (`/admin/pick`) follows section 9: one card per line in aisle order, 56 px buttons (Found all, Short, Offer substitute), a numeric keypad for grams, the Picker Note on a warn tint. No haptics yet: the web cannot vibrate on iOS.
- Admin tables (Products, Orders, audit log) are server-rendered HTML tables with sticky headers and links per row, filtered with plain GET forms, not TanStack Table: nothing on them sorts or edits in the browser yet. Add TanStack when a table needs client-side sorting or inline edits.
- Customer copy says "delivery slot", never "delivery window" (GLOSSARY).
- The selected Slot shows when its hold ends ("Held for you until 4:12 PM") and stops promising it once the hold lapses.
