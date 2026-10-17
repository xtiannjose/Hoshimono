# Storefront mockup v2

A clickable static mockup of the Sariwa storefront: six screens built to [05-DESIGN-SYSTEM.md](../05-DESIGN-SYSTEM.md) v0.2. It replaces the v0.1 canvas mockup in [../mockup/](../mockup/README.md) as the visual spec.

## View it

Open `index.html` in any browser. It shows all six screens with a System / Light / Dark switch, and each title opens the full screen.

Any single screen also takes `?theme=dark` or `?theme=light`. Fonts and icons load from Google Fonts and unpkg, so you need a network connection.

If a browser blocks local files (some automation tools do), serve the folder instead:

```bash
python -m http.server 8765 --directory docs/mockup-v2
```

## Screens

| File | Size | What it demonstrates |
|---|---|---|
| `home.html` | 1440 wide | Header with search, delivery button and cart total; split hero; lime service strip; category mosaic; Fresh picks grid; recipe panel with live total; savings row with promo tile; footer |
| `category.html` | 1440 wide | Breadcrumb, filter chips and sort, sticky filter sidebar, 12 cards covering in-cart, sale, low stock, weighed and out-of-stock states |
| `product.html` | 1440 wide | Gallery, sticky buy panel, weighed-item note, Substitution Preference as radio cards, trays stepper, delivery promise, accordion, related Products |
| `checkout.html` | 1440 wide | Address with landmark, day and Slot radio cards (Full, Only a few left, Held), payment options, weighed-item note, order summary with Voucher |
| `mobile-home.html` | 390 x 844 | Compact header, category chips, hero, first Products above the fold, recipe teaser, floating cart bar, tab bar |
| `mobile-cart.html` | 390 x 844 | Cart as a bottom sheet: Slot row, free-delivery hint, Cart Lines with steppers and Substitution Preference, live totals |

Shared files: `sariwa.css` holds all tokens and components; `sariwa.js` holds the small amount of mockup behaviour.

## What works when you click

- **Add** turns into a quantity stepper, and back to Add at zero. The header cart total and count update. Focus follows the control, and a polite live region announces the change.
- The recipe total and item count follow the ticked ingredients. The servings stepper updates the heading only; quantity scaling is not mocked.
- In the mobile Cart, steppers update line totals, subtotal, delivery fee, the free-delivery hint and the Checkout button. Cart Lines stop at 1.
- Chips, Slots, days, payment options and Substitution Preference are native radios and checkboxes styled with `:has()`, so they work without script.

Money in `sariwa.js` is integer centavos, formatted only when painted, as [ADR 0002](../adr/0002-money-as-integer-centavos.md) requires.

## Reading it correctly

- **All Products, prices and the Customer are sample data**, kept identical to v1 so totals still reconcile. Cart lines add to ₱1,045.50; voucher -₱50.00; delivery ₱59.00; total ₱1,054.50. The two weighed lines (₱160.00 and ₱142.50) explain the "up to ₱30.25" note, which is 10% of ₱302.50.
- **Motion is partly shown.** The Add-to-stepper pop, count bump and sheet spring are CSS approximations. The Home fade-up and the draggable sheet are specified in the design system but not mocked.
- **Fonts and icons** match the build stack: Bricolage Grotesque, Plus Jakarta Sans and Phosphor Regular.

## Photography needed

Every photo area is a labelled placeholder. Real images are needed at:

| Placement | Size | Subject |
|---|---|---|
| Home hero | 1200 x 960 | Produce basket on a market table, natural light |
| Fruit tile | 1200 x 700 | Mangoes and calamansi in a crate |
| Vegetables tile | 800 x 500 | Baguio greens and carrots |
| Recipe panel | 1000 x 1100 | Chicken adobo over rice, steam rising |
| Product page gallery | 1200 x 1200, 4 shots | Chicken breast fillet on a board, plain background |
| Product cards | 800 x 800 per Product | Product on a neutral background (the 200 hero SKUs first, per the roadmap) |

## Checks run on 2026-10-17

- Contrast for every token pair in both modes (script results are in the design system, section 3).
- axe-core 4.10 with WCAG 2.2 AA and best-practice rules: no violations on all six screens in light and dark.
- No horizontal scroll at 390 px on the four desktop screens; each declares its own collapse.
- Interaction script: Add and stepper, focus handoff, live region, cart totals, recipe total, free-delivery threshold, reduced-motion fallback.

## Design decisions to review

1. Lime is the only accent; light-mode actions are ink with lime text. Is lime too loud for the brand at scale?
2. The full-width **Add** pill on every card replaces v1's small round plus button: easier to hit, but cards are taller.
3. A filled ink stepper on a card means "in your Cart", so a grid shows the basket at a glance.
4. Delivery area and next Slot moved from a separate top strip into a header button, saving a row of height.
5. Mobile Home drops the hero photo so Products appear above the fold.
