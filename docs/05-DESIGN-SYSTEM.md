# Design System

Status: draft v0.1. Source of truth for the look and feel of the storefront. Admin and Picker screens reuse the same tokens but follow the denser rules in section 9. The visual reference is the [mockup](mockup/README.md).

## 1. Design read

> Reading this as: **consumer grocery storefront for Filipino households, mostly on mid-range phones, with a clean, fresh and utilitarian language, leaning toward Tailwind v4 + shadcn/ui (customised, never default) + Motion + Phosphor icons.**

Dials (from the `design-taste-frontend` skill): **DESIGN_VARIANCE 4, MOTION_INTENSITY 4, VISUAL_DENSITY 6.** A shop is a utility: predictable grids, fast scanning, dense product rails, motion only where it confirms an action. Expressive layout is reserved for the Home page hero and Recipe pages.

## 2. Principles

1. **Speed to basket.** Every Product card can add to Cart without leaving the page.
2. **Price clarity.** Price, Unit Price and any weight caveat are always visible together.
3. **Trust through honesty.** Say plainly when stock is low, when weight is approximate, when a Slot is nearly full.
4. **Fresh, not fancy.** Real photography, generous white space, one green accent. No gradients-for-decoration, no glassmorphism, no stock-photo smiles.
5. **Works on a bad day.** Weak network, small screen, bright sunlight, one hand.

## 3. Colour tokens

One accent (leaf green) used identically everywhere. Status colours are semantic and appear only to convey state. Neutrals carry a faint green tint so the palette reads as one family. No pure black or pure white.

Define as CSS variables, mapped into Tailwind v4's `@theme`. Switch modes with `prefers-color-scheme` plus a manual `data-theme` override.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F7F9F6` | `#0E1611` | Page background |
| `--surface` | `#FDFEFC` | `#152019` | Cards, sheets, inputs |
| `--surface-2` | `#EEF3EE` | `#1C2A21` | Quiet fills, image placeholders |
| `--border` | `#DDE5DD` | `#27382D` | Dividers, input borders |
| `--text` | `#14231B` | `#E6EEE8` | Body and headings |
| `--text-muted` | `#4B5D52` | `#A3B5A9` | Secondary text (4.5:1 or better on `--bg`) |
| `--accent` | `#1F7A4D` | `#4DBE86` | Primary buttons, links, active states, focus ring |
| `--accent-hover` | `#186340` | `#6FD0A0` | Hover and pressed |
| `--on-accent` | `#F7F9F6` | `#08130D` | Text on accent fills |
| `--accent-soft` | `#E1F1E7` | `#163526` | Selected chips, subtle highlights |
| `--sale` | `#C8341E` | `#FF7A63` | Price drops and Promotion tags only |
| `--sale-soft` | `#FBE9E5` | `#3A1C16` | Promotion tag background |
| `--warning` | `#8A5200` | `#F2B35C` | Low stock, approximate weight |
| `--error` | `#B42318` | `#FF8A7E` | Validation and failures |

Verify every text and fill pair with a contrast checker when the tokens are implemented; adjust the values, not the rule (AA minimum, body text 4.5:1, large text 3:1).

## 4. Typography

| Role | Font | Notes |
|---|---|---|
| UI and headings | **Geist** via `next/font` | Variable; weights 400, 500, 600 |
| Codes and numerals in tables | **Geist Mono** | Order numbers, voucher codes, admin tables |

- Prices use `font-variant-numeric: tabular-nums` so columns align.
- The peso sign (U+20B1) may be missing from some fonts; confirm Geist coverage at setup and let the system font stack supply the glyph if not.
- Scale (px / line height): 12/16 caption, 14/20 small, 16/24 body, 18/28 lead, 22/28 h3, 28/34 h2, 36/40 h1, 48/52 hero (desktop only). Hero headline at most two lines and five words wherever possible.
- Body text never smaller than 14 px on mobile; inputs 16 px to prevent iOS zoom.
- Line length for prose 65 characters.

## 5. Shape, space, elevation

- **Spacing:** 4 px base; common steps 4, 8, 12, 16, 24, 32, 48, 64.
- **Radius rule (one system):** controls (buttons, inputs, selects) **12 px**; cards and sheets **16 px**; images inside cards **12 px**; chips, badges and the quantity stepper **full pill**. No other radii.
- **Elevation:** prefer borders and spacing. Where a shadow is needed, tint it to the background hue: `0 1px 2px rgb(20 35 27 / .06), 0 8px 24px rgb(20 35 27 / .08)`. Cards in grids have a 1 px border, no shadow.
- **Layout:** content width `max-w-7xl` (1280 px) centred, 16 px side gutter on mobile, 24 px from `md`. Use CSS Grid for all grids. Breakpoints: 640, 768, 1024, 1280, 1536.
- **Z-index scale** (single file `src/config/z.ts`): `base 0`, `sticky 10`, `header 20`, `drawer 30`, `modal 40`, `toast 50`.
- Hero and full-height sections use `min-h-[100dvh]`, never `h-screen`.

## 6. Components

Built on shadcn/ui primitives with the tokens above applied. None ship in default state.

**Primitives to install:** button, input, label, checkbox, radio-group, select, textarea, badge, skeleton, separator, tabs, accordion, popover, command (search), dialog, sheet (cart drawer), drawer (mobile bottom sheet), sonner (toasts), form.

**Domain components (custom):**

| Component | Notes |
|---|---|
| `ProductCard` | Image (4:5), name (2 lines max), pack size, `PriceTag`, add button that morphs into `QuantityStepper`. Out-of-stock and low-stock states. |
| `PriceTag` | Current price, optional compare-at strikethrough, Unit Price line, "approx." marker for Weighed Products |
| `QuantityStepper` | Pill; minus, count, plus; 44 px targets; long-press repeat; announces count to screen readers |
| `CategoryTile` | Image + name; grid on Home and category index |
| `CartDrawer` | Sheet on desktop, bottom drawer on mobile; line list, Substitution Preference per line, totals, Checkout button |
| `SubstitutionSelect` | Three options: "Pick a similar item", "I'll choose", "No substitute" |
| `SlotPicker` | Day tabs and time chips; shows "Few left" when under 20% capacity; disabled when full |
| `AddressForm` | Landmark required; map pin; Zone coverage check inline |
| `DeliveryBanner` | Sticky strip with area and next available Slot; opens address/zone picker |
| `OrderTimeline` | Vertical steps with timestamps and Rider contact |
| `RecipeCard` | Photo, time, servings, "Add all to cart" |
| `StockBadge` | "In stock", "Only a few left", "Out of stock" |

**Every component documents and implements:** default, hover, focus-visible, active (`scale-[0.98]` push), disabled, loading (skeleton shaped like the final layout), empty and error states. No generic spinners.

## 7. Motion

Library: **Motion** (`import { motion } from "motion/react"`). Do not mix GSAP in the same tree. Motion lives only in small `"use client"` leaf components. Use springs (`stiffness 300, damping 30` for sheets; `stiffness 500, damping 32` for the stepper), never linear easing.

Every animation must answer "what does it communicate?"

| Motion | Communicates | Spec |
|---|---|---|
| Add button morphs into stepper | Feedback: item added | 150 ms spring, `layout` animation on the control only |
| Cart badge bump | Feedback: count changed | scale 1 to 1.15 to 1, 200 ms |
| Cart drawer / bottom sheet | State change; spatial origin | Spring slide; bottom sheet is draggable with velocity-based dismiss (see the `apple-design` skill) |
| Skeleton shimmer | Loading | Opacity pulse only, 1.2 s |
| Home sections fade-up | Hierarchy, once | `whileInView`, `once: true`, 24 px, 400 ms, stagger 60 ms; Home only |
| Toast | Transient confirmation | Slide and fade, 200 ms |

Rules: animate only `transform` and `opacity`; no scroll-jacking, parallax, marquees or infinite loops; use `useMotionValue` for pointer or drag values, never `useState`; wrap everything with `useReducedMotion()` and degrade to instant. Search the Motion docs through the `mcp__motion__search-motion-docs` tool before writing animation code, and audit finished work with the `motion` skill's MotionScore.

## 8. Imagery, icons, copy

- **Photography:** Products on a neutral background, square master, natural light for produce. Hero and category imagery shows real food and real Philippine pantry staples. Placeholders in the mockup are labelled slots; replace with real shots before launch.
- **Icons:** `@phosphor-icons/react`, `regular` weight, 20 or 24 px, one family only. No emoji anywhere in UI. No hand-drawn SVG icons.
- **Formatting:** `₱1,249.00` on Product and Cart pages; whole pesos are acceptable in compact tiles (`₱249`). Weights `500 g`, `1.5 kg`. Dates `Sat, 18 Oct`; times `2:00 to 4:00 PM`. Use a hyphen or "to" for ranges, never an en or em dash.
- **Voice:** plain, warm, concrete. Say "Delivery today, 2:00 to 4:00 PM", not "Seamless same-day experience". Avoid "elevate", "seamless", "unleash". Filipino phrases only where natural and only after the Filipino language pass in Phase 5.
- **Empty states** explain how to fill them ("Your cart is empty. Start with today's fresh picks.").
- **Error messages** say what happened and what to do next, next to the field.

## 9. Admin and Picker screens

Dense and functional, same tokens and fonts, no Motion beyond focus and state transitions.

- Tables use TanStack Table with sticky headers, row hover, keyboard navigation and numeric columns in Geist Mono.
- The Picker view is **mobile-first and one-handed**: large tap rows (56 px), aisle-ordered list, big "Short" and "Substitute" buttons, final weight keypad, haptic-friendly confirmations.
- Charts use the `dataviz` skill's palette rules; never colour-only encodings.

## 10. Accessibility checklist (per component and per page)

- Contrast: text 4.5:1, large text and UI boundaries 3:1.
- Fully operable by keyboard; visible `:focus-visible` ring (2 px `--accent`, 2 px offset).
- Real `<button>`, `<a>`, `<input>` with `<label>`; `aria-label` on icon-only buttons; errors linked with `aria-describedby`.
- Quantity changes and cart updates announced through a polite live region.
- Touch targets at least 44 px; at least 8 px between adjacent targets.
- Pinch-zoom never disabled.
- Honour `prefers-reduced-motion` and `prefers-color-scheme`.
- Images have meaningful alt text; decorative images use `alt=""`.
- Automated `axe` check on Home, Category, Product, Cart, Checkout in CI; manual screen-reader pass (TalkBack, VoiceOver) before launch.

## 11. Performance budget

| Budget | Value |
|---|---|
| LCP on Home, Category, Product (4G, mid-range Android) | under 2.5 s |
| CLS | under 0.1 |
| INP | under 200 ms |
| JavaScript on a Category page | under 170 KB gzipped |
| Product image on a card | under 40 KB (AVIF/WebP, correct `sizes`) |

The hero image uses `next/image` with `priority`; below-the-fold images lazy-load; every image reserves its aspect ratio.
