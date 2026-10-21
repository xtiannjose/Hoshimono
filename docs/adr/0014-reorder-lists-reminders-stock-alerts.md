---
status: accepted
---

# Reorder, Shopping Lists, Cart Reminders and Stock Alerts

Batch 5.2 (PRD ACC-3 Reorder, CAT-1 "Buy again", the V1 retention items). The owner chose on 2026-10-21: Reorder adds to the current Cart, named Shopping Lists, one reminder email after 3 hours, and back-in-stock by email plus SMS. The other points are defaults Claude chose; the owner may revise them.

## Decision

1. **Reorder adds a past Order's lines to the current Cart**, on top of what is there, at today's prices and capped by stock, the same way a Recipe is added (one shared `cart.addLines`). What is no longer sold or sold out is named. Substitutes are not reordered: the Customer ordered the original.
2. **"Buy again" on Home** shows a signed-in Customer up to 12 Products from their delivered Orders, most often bought first, still sold. Guests and new Customers see nothing.
3. **Shopping Lists** are named lists a Customer keeps ("Weekly", "Office pantry"): up to 20 lists of up to 100 Products, each with a count. Products are saved from a Product page or the whole Cart at once; a list goes to the Cart in one tap, on top of what is there.
4. **Cart Reminder**: one email, 3 hours after the last change to a Cart that still has items and was not checked out, only for a signed-in Customer who said yes to "reminders and offers" and has an email. One per Cart, never after it becomes an Order; a Cart idle for more than 2 days gets none. The email has a link to stop them that works without signing in.
5. **Consent**: "Send me reminders and offers" is off until the Customer turns it on in their account (Data Privacy Act; PRD section 7). Order and delivery messages are not marketing and need no consent.
6. **Stock Alert**: on a sold-out Product, a signed-in Customer taps "Tell me when it's back". When the Hub has it again, one email and, with a mobile number, one SMS; then the alert ends. An alert older than 30 days ends unsent. A Customer asked for it, so it is not marketing.
7. **Both run from the cron tick** through the jobs outbox: marking a Cart reminded or ending an alert happens in the same transaction that queues its message, so none is sent twice and none is lost.

## Consequences

- New tables `shopping_lists`, `shopping_list_items`, `stock_alerts`; `carts.reminded_at`; `notifications.ref` (with a unique `template, channel, ref`) for messages not tied to an Order.
- The stop link is signed with `BETTER_AUTH_SECRET` (HMAC), opens a page with one button (a link alone never changes anything, since mail scanners follow links).
- Not now: SMS reminders, more than one reminder, offers or Vouchers in the reminder (Batch 5.3), a list shared between Customers, price-drop alerts.
