---
status: accepted
---

# How a module says no

By Phase 3 the modules said "this did not work" six ways: a result with a `reason`, a list of field errors, a map of field errors, a bare `message`, a boolean, and a thrown error. The 18 Oct review asked for one convention. On 2026-10-20 the owner chose to write down the rule the code mostly follows already and fix only the outliers, over rewriting every module to one shape (days of work, no visible change, more risk).

## Decision

1. **A read** returns the thing, or `null` when it does not exist or is not the caller's (`getOrder`, `getAddress`).
2. **A command that can be refused for a business reason** returns `{ ok: true, ...data } | { ok: false, reason: "snake_case", ...details }`. The app turns the reason into words (`placeOrder`, `holdSlot`, `setLineQuantity`).
3. **A command that checks a form** returns `{ ok: false, errors: { [field]: message } }`, with `form` as the key for a problem with the whole form. The message is written next to the rule it enforces (catalogue admin, addresses, profile). A CSV import keeps its list of row errors: it reports on rows, not fields.
4. **A command whose only "no" means "not allowed now" or "already done"** may return a boolean (`cancelOrder`, `transitionOrder`, `setSubstitution`). One with several outcomes that are not failures returns a string union (`handleWebhook`, `expireCheckout`). One whose answer is an amount or a count returns the number (`refundOrderPayment`, `expireUnpaidOrders`).
5. **Bugs and infrastructure failures throw.** They are never turned into a business "no": a database outage must not read as a wrong sign-in code. Only the edge (a Server Action, a route handler, the job runner) catches, logs, and shows a general message. Inside a module a throw may carry a refusal to the top of a transaction (`placeOrder`'s `Refused`), as long as the function returns the result in rule 2.

## Consequences

- Fixed on 20 Oct: the catalogue admin returned a list of `{ field, message }` that the app turned into a map; it returns the map now (`FieldErrors`, `fieldError`). The profile returned a bare `message`; it returns `errors.name`.
- New code picks the shape by what the caller must do with the "no": explain a reason (2), mark fields (3), or simply know (4). Anything unexpected throws (5).
