---
status: accepted
---

# Filipino for the rest of the shop, and form problems as codes

[ADR 0017](0017-filipino-pwa-and-funnel.md) translated the main shopping pages and left the account pages, Recipes, Articles, Shopping Lists, Freshness Claims and the address form in English. The owner approved finishing that pass on 2026-10-27. Those pages show form problems that the customers, claims and cart modules wrote in English next to their rules, as [ADR 0009](0009-module-results-and-errors.md) rule 3 says. A module cannot know the page's language, and a Server Action cannot read it (`next/root-params` refuses).

## Decision

1. **Translated now**: the account page (name, reminders, sign out), order history, addresses and the address form (also on Checkout), invite friends, Shopping Lists and Save to a list, Recipes and the Recipe panel (also on Home), the page around an Article, and the Freshness Claim page and its section on the Order page. Article and Recipe text stays as staff write it.
2. **Shop form problems are codes.** Where a module checks a form a Customer fills in (`saveAddress`, `updateName`, `fileClaim`, `createShoppingList`, `renameShoppingList`), it keeps the shape of ADR 0009 rule 3, `{ ok: false, errors: { [field]: problem } }`, but `problem` is a snake_case code (`not_served`, `photo_needed`, `name_taken`) instead of English words. This narrows rule 3: staff forms (catalogue admin, claim decisions) still write their English message next to the rule.
3. **The action words the code.** Each form sends the page's language in a hidden `lang` field, as Checkout does; the Server Action reads it with `langOf` and turns codes into words from the dictionary, adding the details it knows (the barangay typed, `MAX_ADDRESSES`). Actions that redirect use the same field, so a Filipino form lands on a Filipino page.

## Consequences

- The dictionaries hold the words for every code under `problems` in each section. The English words are the ones the modules used, so English pages read as before; a few limits the action cannot see ("Choose 1 to 5", "Keep this under 40 characters") became plainer sentences without the number.
- Database tests now expect codes, not sentences.
- Still English: sign-in, the delivery areas page, the pages that answer a message link (a Substitution's yes or no, stopping reminders) and the messages themselves. Sending messages in Filipino needs the Customer's language stored, which is a data model decision for later.
- The Filipino is still Claude's draft for a native speaker to check before launch.
