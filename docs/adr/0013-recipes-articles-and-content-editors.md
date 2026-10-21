---
status: accepted
---

# Recipes, Articles and Content Editors

Batch 5.1 opens Phase 5 (PRD CAT-7, ADM-9). The owner chose on 2026-10-21: a new Content Editor role, one box per cooking step, Articles together with Recipes, and out-of-stock ingredients marked with a similar Product offered while the rest are added. The other points are defaults Claude chose; the owner may revise them.

## Decision

1. **Staff edit Recipes and Articles without code**, at `/admin/recipes` and `/admin/articles`. A new role, **Content Editor** (`content_editor`), may open only that area (`content`). Admins may too. Merchandisers may not: content and the catalogue stay separate jobs. Every save is audited and shows on the shop at once.
2. **A Recipe** has a title, a short intro, one photo, base servings, prep and cook minutes, its ingredients, and numbered steps (one text box per step, reordered by buttons). It is a Draft until published; a published Recipe can be featured on Home (the newest featured one shows).
3. **An ingredient is a Product to buy**, or plain text for something we do not sell (water). A Product ingredient says how many to buy for the base servings and whether that number grows with servings: chicken does, a bottle of soy sauce does not. Scaled counts round up. An ingredient can be marked "usually at home" (salt, oil): it starts unticked. A short note says how it is used ("6 cloves, crushed"). Prices are never typed into a Recipe: they always come from the catalogue.
4. **One button adds the ticked ingredients to the Cart**, on top of what is already there, each capped by stock. An ingredient that is sold out or no longer sold is marked, a similar Product in stock is offered unticked, and the button adds the rest. The server recomputes every count from the Recipe; the browser sends only the servings and which rows are ticked.
5. **An Article** (a guide, tip or story) has a title, intro, one photo, sections (an optional heading and text each, one box per section) and Products linked from it, shown at the end to add to the Cart.
6. **Pages**: `/recipes`, `/recipes/[slug]`, `/articles`, `/articles/[slug]`, a Recipes link in the shop menu, the featured Recipe on Home, both in the sitemap, Recipe structured data for search engines. A slug is made from the title when the item is created and does not change after.
7. **Photos** are one per Recipe or Article, at least 1000 pixels wide, stored as a 1600-pixel-wide WebP through the same media store as Product photos (local disk until R2).

## Consequences

- New tables `recipes`, `recipe_ingredients`, `articles`, `article_products`; `StaffRole` gains `content_editor`; a seeded Content Editor test account (`editor@hoshimono.test`).
- Recipe text does not scale with servings (the note "6 cloves" stays as written); only the counts to buy do.
- Not now: Recipe results in the search box, ratings and comments, nutrition, video, rich-text formatting, scheduled publishing, more than one photo.
