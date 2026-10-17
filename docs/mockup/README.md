# Storefront mockup

> **Superseded on 2026-10-17 by [mockup v2](../mockup-v2/README.md)** (design system v0.2). This v1 mockup follows design system v0.1 and is kept for reference only.

A clickable design canvas of the Sariwa storefront: six screens built to the rules in [05-DESIGN-SYSTEM.md](../05-DESIGN-SYSTEM.md).

**View it:** https://claude.ai/artifact/VYLAZvNwc5vQHBB2hYZmPJ (private to the owner's Claude account; use Share on that page to give others access).

## Screens

| Screen | Size | What it demonstrates |
|---|---|---|
| Home | 1440 wide, scrolling page | Delivery strip, asymmetric hero, facts row, category tiles, product rail, recipe-to-cart block, savings bento, footer with tax and policy links |
| Category (Fruit) | 1440 wide | Breadcrumb, filter sidebar, sort and chips, 12 product cards covering in-cart, low stock, sale, weighed and out-of-stock states |
| Product (Chicken Breast Fillet) | 1440 wide | Weighed-item price note, per-item Substitution Preference, delivery promise, accordion details, related items |
| Checkout | 1440 wide | Address with landmark, delivery window picker with held slot, GCash, card and cash on delivery, order summary with voucher and weighed-item notice |
| Mobile Home | 390 x 844 | Compact header, category chips, 2-column cards with full-width add buttons, sticky cart bar, tab bar |
| Mobile Cart | 390 x 844 | Cart as a bottom sheet with per-line steppers and Substitution Preference |

Links between screens work in Play mode: category tiles open Category, cards open Product, the cart button opens Checkout.

## Reading it correctly

- **Photo areas are placeholders.** No product or lifestyle photography exists yet. Each slot is labelled with its size and subject. Real photography is a business-track deliverable ([07-ROADMAP.md](../07-ROADMAP.md)).
- **All products, prices and the customer are sample data.** Totals are internally consistent: the cart lines add to PHP 1,045.50, the voucher takes off 50.00 and delivery adds 59.00, giving 1,054.50. The two weighed lines (160.00 and 142.50) explain the "up to 30.25" note, which is 10% of 302.50.
- **Dark mode is built in.** The stylesheet follows the system colour scheme; switch your OS theme to see it.
- **Motion is not shown.** The design system specifies the motion (stepper morph, drawer spring); the mockup is static apart from links.
- **Fonts and icons** match the build stack: Geist and Phosphor Regular.

## Design decisions to review

1. Single accent (leaf green); sale red appears only on price drops.
2. Substitution control sits next to the add button on the Product page and under every line in the cart, not hidden in checkout.
3. Weighed items are explained in plain words at three points: product page, checkout payment panel, order summary footnote.
4. The recipe block lives on Home because it is the main V1 differentiator; it can move to its own page in Phase 5.
5. Delivery window is a first-class step on Checkout with visible capacity ("Only a few left", "Full").

## Source files

`source/` holds the artboard sources and shared stylesheet as published.

| File | Purpose |
|---|---|
| `Main.dc.html` | Home |
| `Category.dc.html`, `Product.dc.html`, `Checkout.dc.html` | Desktop screens |
| `MobileHome.dc.html`, `MobileCart.dc.html` | Phone screens |
| `canvas.json` | Board positions and notes |
| `sariwa-base.css` | Shared tokens and component styles. The published copy appends Phosphor glyph rules and points its `@font-face` at an uploaded font; the build uses `@phosphor-icons/react` instead |

The `.dc.html` files only render inside the design canvas. In the real app the same markup becomes React components (`ProductCard`, `QuantityStepper`, `SlotPicker`, and so on) styled with Tailwind v4 and the tokens from the design system. Treat the mockup as the visual spec, not as code to copy.

## Next steps for the mockup

- Replace photo slots once photography exists.
- Add the Picker screen (mobile) when Phase 4 starts.
- Validate layout against screenshots of the live reference site; see the limits noted in [02-RESEARCH-BUILTAMART.md](../02-RESEARCH-BUILTAMART.md).
