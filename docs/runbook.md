# Operations runbook

What to do when something goes wrong at Hoshimono. Written for three people:

- **The owner.**
- **The Dispatcher or Admin at the Hub.**
- **The technical person on call.** Only they touch the database, the hosting dashboard or the provider settings.

Every scenario has the same five parts: how you notice, what to check first, the steps, what to tell the Customer, and when to call the technical person.

Status: written 27 Oct 2026 against the code on the latest local branch (Batch 5.5, the checkup and the design pass). Real accounts do not exist yet for PayMongo, the SMS sender, Resend, Vercel, Neon or Sentry. Steps that happen in one of their dashboards are marked **(dashboard only)**. Check them during the PayMongo test-mode run and the go-live setup (Batch 6.3), and fix this page where the real screens differ.

> **Today, the app sends no real email or SMS.** It only has console senders, which write `[email]` and `[sms]` lines to the server log, and a production build refuses to send without a real provider. Everything below about texts and emails assumes Resend and the SMS sender are connected before launch.

## Contents

| If this happens                                                                    | Go to                                                                                                    |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Customer paid but the Order says "Waiting for payment", or they were charged twice | [1. A stuck payment](#1-a-stuck-payment)                                                                 |
| A refund is too much, too little, or stuck in "Refunds to check"                   | [2. A wrong refund](#2-a-wrong-refund)                                                                   |
| Power cut, flood, typhoon, or no Riders                                            | [3. A Hub shutdown](#3-a-hub-shutdown)                                                                   |
| GCash or card down, texts or emails not arriving, the site down                    | [4. A provider outage](#4-a-provider-outage)                                                             |
| Unpaid Orders not cancelling, no new delivery days, no reminders                   | [5. Cron not running](#5-cron-not-running)                                                               |
| A Rider's cash does not match                                                      | [6. A Rider's cash does not match](#6-a-riders-cash-does-not-match)                                      |
| The Customer cannot give the Delivery PIN, or nobody is home                       | [7. Delivery PIN or failed delivery](#7-the-customer-cannot-give-the-delivery-pin-or-the-delivery-fails) |
| Sold something that is not on the shelf, or the count is off                       | [8. Stock is wrong](#8-stock-is-wrong)                                                                   |
| A Customer disputes a Freshness Claim decision                                     | [9. A Freshness Claim dispute](#9-a-freshness-claim-dispute)                                             |
| The database is lost or damaged                                                    | [10. Restoring the database](#10-restoring-the-database)                                                 |

## Before anything goes wrong

Fill this in before launch and keep a printed copy at the Hub.

| Who                                          | Name | Mobile |
| -------------------------------------------- | ---- | ------ |
| Owner                                        |      |        |
| Technical person on call                     |      |        |
| Backup technical person                      |      |        |
| Holds the PayMongo dashboard login           |      |        |
| Holds the Vercel, Neon and SMS sender logins |      |        |
| Hub phone (for texting Customers by hand)    |      |        |

### Who can open which screen

Staff sign in at `/sign-in` and land on `/admin`. The left menu shows only what their role may open.

| Role         | Screens                                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Admin        | Everything, including **Zones and Slots** (`/admin/setup`), **Refunds to check** (`/admin/refunds`), **Staff** and **Audit log** |
| Dispatcher   | **Orders**, **Dispatch**, **Cash**, **Stock**, **Daily report**, **Freshness Claims**                                            |
| Picker       | **Picking**                                                                                                                      |
| Rider        | **My deliveries**                                                                                                                |
| Merchandiser | **Products**, **Categories**, **Import and export**, **Promotions**, **Vouchers**                                                |

Only an Admin can close Slots or settle a refund. If no Admin is reachable, call the owner.

### Texting a Customer by hand

The app has no way to send a Customer a message you write. Text from the Hub phone, so the Customer can reply. The ready-made texts below start with "Hoshimono:" like the app's own texts. Fill in the parts in `<angle brackets>`.

Find the Customer's mobile number on the Order page: open **Orders** (`/admin/orders`), search the Order Number, name, email or mobile, then open the Order. The **Customer** box shows it.

### Words on screen

**Order status:**

| Status in the code | On screen           |
| ------------------ | ------------------- |
| `pending_payment`  | Waiting for payment |
| `confirmed`        | Confirmed           |
| `picking`          | Picking             |
| `picked`           | Ready for the Rider |
| `out_for_delivery` | On the way          |
| `delivered`        | Delivered           |
| `delivery_failed`  | Delivery failed     |
| `cancelled`        | Cancelled           |

**Payment status:**

| Status in the code   | On screen        |
| -------------------- | ---------------- |
| `unpaid`, `failed`   | Not paid         |
| `paid`               | Paid             |
| `partially_refunded` | Partly refunded  |
| `refunded`           | Refunded         |
| `cod_pending`        | Cash on delivery |
| `cod_collected`      | Cash collected   |

**Refund status** (the **Refunds** box on the Order page):

| Status in the code | On screen       |
| ------------------ | --------------- |
| `pending`          | Waiting to send |
| `sending`          | Sending         |
| `sent`             | Sent            |
| `needs_review`     | Needs a check   |

### Where the technical person looks

- **Health check:** `GET https://<domain>/api/health` answers `{"ok":true}`. It answers `{"ok":false}` with HTTP 503 when the app cannot reach the database. Point the uptime monitor here.
- **Alerting check:** `GET https://<domain>/api/health?deep=1` also answers 503 when something needs a person, and names it in `problems`: `jobs_behind` (a job due over 10 minutes ago never ran: the cron is not ticking, [section 5](#5-cron-not-running)), `jobs_failed` (a job gave up after 5 tries today), `payment_events_unmatched` (a provider event matched no Payment, [section 1](#1-a-stuck-payment)), `refunds_to_check` (**Refunds to check** has something, [section 2c](#2c-a-refund-in-refunds-to-check)) and `no_open_slot` (no Slot in the next day takes Orders). Point a second monitor here that alerts the technical person.
- **Host logs (dashboard only):** in the Vercel logs, the app's own lines start with:
  - `[payments]`: webhooks and refunds;
  - `[jobs]`: a notice or refund job failed;
  - `[cron]`: a cron step failed;
  - `[checkout]`: a hosted checkout could not open;
  - `[health]`: the database is unreachable.
- **Sentry is not wired in yet.** Errors reach only the host logs.
- **The database:** use read-only queries first. The app has no screen for the Payment Event ledger (`payment_events`), the jobs outbox (`jobs`) or the last cron run. Useful queries are under each scenario.

---

## 1. A stuck payment

Background (docs/03 section 8, ADR 0003):

- **How an online Order is confirmed:**
  - Checkout places it as "Waiting for payment" and holds its stock and Slot place.
  - The Customer pays on PayMongo's hosted checkout.
  - Only a signed `checkout_session.payment.paid` webhook to `/api/webhooks/paymongo` confirms it. The page the Customer returns to never confirms anything.
- **The Payment Window:**
  - An online Order waits 15 minutes from when it was placed.
  - On the first cron tick after that, the app asks PayMongo to close the checkout, then cancels the Order. Stock and the Slot place go back, and the Order's lines return to the Customer's Cart.
  - If PayMongo refuses to close the checkout because it is paid or a payment is still going through, the app leaves the Order alone and waits for the webhook. **The app never cancels an Order that PayMongo says is paid.**
- **Money after cancellation:** if money arrives after the Order was cancelled, the app refunds all of it on its own (refund reason "late payment").

### How you notice

- A Customer says "I paid, but my order still says waiting for payment", or "I paid and my order disappeared and my items are back in my cart."
- A Customer says they were charged twice.
- In **Orders**, an Order shows **Waiting for payment** long after it was placed.
- The technical person sees `[payments] ... paid X, Payment Y expects Z` or `... after its Order closed: refunding it` in the logs.

### Check first

1. Open **Orders** (`/admin/orders`). Search the Order Number or the Customer's mobile, and open the Order.
2. Read the status line at the top, then **History**. The first line shows when the Order was placed.
3. Use this table:

| What you see                                                                                                         | What it means                                                   | Go to                                                        |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| **Confirmed**, Payment: **Paid**                                                                                     | It worked. The Customer may be looking at an old page           | Tell them it is confirmed                                    |
| **Waiting for payment**, under 15 minutes old                                                                        | Normal. The webhook usually lands in seconds                    | Ask them to wait a few minutes                               |
| **Waiting for payment**, over 20 minutes old                                                                         | The webhook did not arrive or was refused                       | [1a](#1a-paid-but-still-waiting-for-payment)                 |
| **Cancelled**, History says "Not paid within 15 minutes" or "Payment not finished", **Refunds** shows "late payment" | Money arrived after the cancel and is being refunded on its own | [1b](#1b-paid-after-the-payment-window-closed)               |
| **Cancelled**, no refund, Customer says they paid                                                                    | PayMongo may have taken money the app never matched             | [1c](#1c-charged-twice-or-money-the-app-does-not-know-about) |
| Two Orders for the same Customer, both **Paid**                                                                      | They checked out twice                                          | [1c](#1c-charged-twice-or-money-the-app-does-not-know-about) |

### 1a. Paid, but still "Waiting for payment"

Steps (Dispatcher or Admin):

1. Do not cancel the Order and do not ask the Customer to pay again. **Staff cannot move or cancel an Order that is "Waiting for payment".** The Order page says: "Waiting for the Customer to pay. The payment, or the 15-minute Payment Window, moves it on."
2. **(dashboard only)** In the PayMongo dashboard, find the payment by the Order Number, the Customer's email or the amount. We send the Order Number as the checkout's reference and "Hoshimono order SW-..." as its description. Note whether it is paid and for how much.
3. If PayMongo shows it paid, call the technical person now. Stock and the Slot place stay held meanwhile, so nothing is lost by waiting.
4. Add an Order Note on the Order page so the next person knows: under **Notes**, type in "Add a note for the team", then press **Add note**.

What the technical person does:

1. Look up the Payment and its Payment Events:

   ```sql
   SELECT p.id, p.method, p.status, p.provider_ref, p.payment_ref,
          p.amount_cents, p.captured_cents, p.refunded_cents
   FROM payments p JOIN orders o ON o.id = p.order_id
   WHERE o.order_no = 'SW-......';

   SELECT provider_event_id, type, received_at, processed_at
   FROM payment_events WHERE payment_id = '<payments.id>'
   ORDER BY received_at;
   ```

2. **No paid event at all.** The webhook never got in.
   - Check the webhook endpoint in the PayMongo dashboard **(dashboard only)**. It should be `https://<domain>/api/webhooks/paymongo` and subscribe to `checkout_session.payment.paid`.
   - Check what the endpoint answers in the host logs. The route returns:

     | Answer                  | Meaning                                                                                                                                                 |
     | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
     | `401 Invalid signature` | `PAYMONGO_WEBHOOK_SECRET` is wrong, or test and live are mixed. An `sk_test_` key only accepts test-mode webhooks, and an `sk_live_` key only live ones |
     | `404`                   | `PAYMENT_PROVIDER` is fine, but `PAYMONGO_SECRET_KEY` or `PAYMONGO_WEBHOOK_SECRET` is missing in this deployment                                        |
     | `500`                   | The app or the database failed. PayMongo should retry                                                                                                   |

   - Fix the setting in the hosting dashboard and redeploy **(dashboard only)**. Then get PayMongo to deliver the event again, if its dashboard can resend events (to confirm in test mode). Once it is delivered, the Order confirms on its own and the Customer gets the confirmation text.
3. **A paid event with `processed_at` empty.** This is a mismatch: PayMongo reported a different amount from the Payment's `amount_cents`, so the app refused to confirm. The log line says `paid X, Payment Y expects Z`.
   - Do not confirm it by hand. Refund the money in the PayMongo dashboard **(dashboard only)**.
   - Then release the Order through the app's own path:

     ```sql
     UPDATE payments SET status = 'failed'
     WHERE id = '<payments.id>' AND status = 'unpaid';
     ```

   - The next cron tick sees the closed Payment and cancels the Order the normal way. Stock and the Slot place go back, and the lines return to the Cart. Its History will say "Not paid within 15 minutes", so add an Order Note saying what really happened.
4. **The Order cannot be confirmed for another reason.** Use the same two steps: refund in the dashboard, then mark the Payment `failed`. Tell the Customer to order again.

> **Not possible in the app yet:** an Order stuck "Waiting for payment" with money taken cannot be confirmed, cancelled or refunded from the admin. It needs the technical person.

**Tell the Customer** (while it is being sorted out):

```text
Hoshimono: Hi! We can see your payment for order <Order Number> and we're confirming it on our side now. No need to pay again. We'll text you once it's confirmed. Salamat sa pasensya!
```

If it ends with a refund and a cancel:

```text
Hoshimono: Hi! Sorry po, we couldn't confirm your payment for order <Order Number>, so we cancelled it and are refunding the full <amount> to your <GCash / card>. GCash refunds usually show within a day, cards in a few banking days. Your items are back in your cart if you'd like to order again.
```

### 1b. Paid after the Payment Window closed

The app handles this on its own:

- The Order stays **Cancelled**.
- **Refunds** on the Order page shows "late payment" for the full amount.
- The refund job sends it, and the Customer gets the app's text: "Your payment for order ... arrived after the order was cancelled, so we refunded all ₱... to your GCash."

Steps:

1. Open the Order. Check that **Refunds** shows "late payment" with **Sent**.
2. If it says **Waiting to send** for more than a few minutes, see [5. Cron not running](#5-cron-not-running).
3. If it says **Needs a check**, see [2c](#2c-a-refund-in-refunds-to-check).
4. The Order's lines went back to the Customer's Cart when it was cancelled, so they can check out again.

**Tell the Customer** (only if they ask before the app's text arrives):

```text
Hoshimono: Hi! Your payment for order <Order Number> came in after the 15 minutes we hold an order, so that order closed. Your <amount> is on its way back to your <GCash / card>. Your items are still in your cart, so you can check out again anytime. Salamat!
```

### 1c. Charged twice, or money the app does not know about

There are two ways this happens:

- **Two Orders.** The Customer checked out twice. Both Orders are real in the app and both are paid.
- **One Order, two PayMongo payments.** The app keeps one hosted checkout per Order. If two open at the same moment, it closes the second at once. If closing it failed and the Customer paid it anyway, that payment's webhook matches no Payment. It is kept as an unmatched Payment Event and is **not refunded on its own**.

Steps:

1. Search **Orders** by the Customer's mobile number. Look for two Orders close together.
2. **Two Orders:** ask the Customer which one to keep. Cancel the other:
   1. Open it, find **Next step**, and choose "Cancel the Order (refunds a paid Order in full)".
   2. Type the reason, such as "Customer checked out twice", then press **Save**.
   3. The full refund is queued and sent on its own, and the Customer gets the refund text.
   4. This works only while the Order is **Confirmed** or **Picking**.
3. **One Order, but PayMongo shows two payments (dashboard only):** the extra one is not in the app. Refund it in the PayMongo dashboard. Then add an Order Note with the PayMongo payment id and the amount.

> **Not possible in the app yet:**
>
> - The Order page does not show the PayMongo checkout or payment id. Only **Refunds to check** shows a payment id.
> - A refund made in the PayMongo dashboard is not recorded in the app.

**Tell the Customer:**

```text
Hoshimono: Hi! You're right, we got two payments for order <Order Number>. We're refunding the extra <amount> to your <GCash / card> today. GCash refunds usually show within a day, cards in a few banking days. Pasensya na po sa abala!
```

### When to call the technical person

- Any Order "Waiting for payment" for more than 20 minutes that PayMongo shows as paid.
- More than one Customer at a time saying they paid but are not confirmed. The webhook is probably failing for everyone: check `PAYMONGO_WEBHOOK_SECRET` and the endpoint first.
- Payment money PayMongo shows that no Order explains. The technical person lists unmatched events:

  ```sql
  SELECT provider_event_id, type, received_at,
         payload->'data'->'attributes'->'data'->>'id' AS checkout_id
  FROM payment_events
  WHERE payment_id IS NULL AND received_at > now() - interval '2 days'
  ORDER BY received_at DESC;
  ```

---

## 2. A wrong refund

Background (ADR 0008, docs/03 section 8):

- **When the app refunds a GCash or card Payment on its own:**

  | Reason (as shown on the Order page) | When                                                             | How much                        |
  | ----------------------------------- | ---------------------------------------------------------------- | ------------------------------- |
  | cancelled                           | A paid Order is cancelled                                        | All that is left of the payment |
  | picked                              | Picking finishes and the Final Total is lower than what was paid | The difference                  |
  | late payment                        | Money arrives after the Order was cancelled                      | All of it                       |
  | claim                               | An approved Freshness Claim                                      | The approved amount             |

- **The Final Total follows what was packed.** It is never above the checkout amount: a heavier pack is on Hoshimono.
- **The ledger:**
  - Each refund is recorded first, then sent by a job.
  - There is one refund per Payment and reason, or one per Freshness Claim.
  - The database never lets refunds add up to more than was paid.
- **A refund is sent at most once:**
  - If PayMongo clearly says no (a 4xx answer), the job tries again later.
  - If there is no clear answer, the refund becomes `needs_review` and is never resent on its own. A person checks it at **Refunds to check**.
- **PayMongo cannot undo a refund.** It keeps its fee on refunded payments. Refund windows: cards 60 days, GCash 180 days.

### How you notice

- The Customer says the refund was too much, too little, or never came.
- The **Refunds** box on the Order page shows **Needs a check**, or **Waiting to send** for a long time.
- **Refunds to check** (`/admin/refunds`, Admin only) lists something. It is empty when it says "Nothing to check. Every refund went through."

### Check first

1. Open the Order at `/admin/orders/<Order Number>`. Compare:
   - the estimated total and the "Final total, as packed" in the Order details;
   - the **Refunds** box: reason, amount and status.
2. For what each line was charged, open "Delivery receipt to print" (`/admin/print/receipt/<Order Number>`).
3. Most wrong refunds come from picking:
   - **Refund too big:** a typo in "Packed weight (g)", or a line marked **Short** that was really packed.
   - **Refund too small:** **Found all** pressed when items were missing.

### 2a. Too little was refunded

1. **Within 24 hours of delivery:** ask the Customer to report the missing item from their order page as a Freshness Claim, with reason "Missing". Then approve it at **Freshness Claims** (see [section 9](#9-a-freshness-claim-dispute)). The refund goes to their GCash or card through the normal ledger.
2. **After 24 hours, or for a cash Order:**
   - Refund the difference in the PayMongo dashboard **(dashboard only)**, or give a Voucher (see [section 9](#9-a-freshness-claim-dispute), "Goodwill Voucher").
   - Add an Order Note saying what you did and why.

> **Not possible in the app yet:**
>
> - Staff cannot add an extra refund to an Order, or file a Freshness Claim for a Customer.
> - A refund made in the PayMongo dashboard does not show on the Order.

**Tell the Customer:**

```text
Hoshimono: Hi! You're right, we refunded <amount> less than we should have for order <Order Number>. We're sending the missing <amount> to your <GCash / card> today. Salamat for telling us!
```

### 2b. Too much was refunded

1. A refund cannot be undone, and **the app cannot charge the Customer again.**
2. The owner decides whether to let it go or to ask the Customer. Letting it go is usual for small amounts.
3. Add an Order Note with the amount and the cause.
4. Tell the Picker what went wrong, such as checking the weight before **Finish picking**.

**Tell the Customer** (only if the owner decides to ask):

```text
Hoshimono: Hi! Small favor po: for order <Order Number> we refunded <amount> more than we should have because of a mistake on our side. If it's okay with you, could you send it back to <GCash number>? No pressure at all, just reply here. Salamat!
```

### 2c. A refund in "Refunds to check"

Each row shows:

- the amount and where it goes ("to GCash" or "to card");
- why, such as "Paid Order cancelled", "Packed less than paid", "Paid after cancellation" or "Freshness Claim";
- the Order Number;
- "PayMongo payment `<id>`";
- either "No clear answer from PayMongo" or "PayMongo keeps refusing it", with the error;
- when it was asked.

Steps (Admin):

1. **(dashboard only)** In the PayMongo dashboard, open that payment id. Look for a refund of that amount made around the "Asked" time.
2. **The refund is there:**
   1. Copy its refund id into "PayMongo refund id (optional)".
   2. Press **It went through**.
   3. The app marks it sent and texts and emails the Customer. Freshness Claim refunds send no second text, because the claim decision already told them.
3. **The refund is not there:** press **It did not: send again**. The job sends it straight away.
4. **"PayMongo keeps refusing it":** read the error.
   - **The payout balance cannot cover it:** wait for the balance to fill, then press **It did not: send again**.
   - **The refund window has passed:** cards allow 60 days, GCash 180 days. It will never go through. Pay the Customer another way, such as a bank or GCash transfer or a Voucher. Add an Order Note.
   - In that case, do **not** press **It went through**: that texts the Customer that money went back to their GCash or card.
5. If the screen says "This refund was already settled. Reload.", someone else already answered it.

> **Never press "It did not: send again" without checking the PayMongo dashboard first.** If the first try did go through, a second send refunds the Customer twice.

> **Not possible in the app yet:** a refund cannot be marked "paid another way". One that can never go through stays on the list.

**Tell the Customer** (while you check):

```text
Hoshimono: Hi! Your <amount> refund for order <Order Number> is taking longer than usual. We're checking it with our payment partner and will text you once it's sent. Salamat sa pasensya!
```

### When to call the technical person

- Several refunds land in **Refunds to check** at once. PayMongo is probably down or the key is wrong: see [4a](#4a-paymongo-gcash-and-card-is-down).
- A refund stays **Waiting to send** or **Sending** for more than 15 minutes. The jobs may not be running: see [5](#5-cron-not-running).
- An Order that is not cancelled shows a "late payment" refund. That should not happen: the technical person checks the Order's Payment Events.

---

## 3. A Hub shutdown

Power cut, flood, typhoon, or no Riders. Three things to do, in this order:

1. Stop new Orders.
2. Decide what happens to the Orders already booked.
3. Tell every affected Customer.

### How you notice

- **No power or water at the Hub:** chillers off, roads flooded, or a PAGASA signal for Metro Manila.
- **No Riders:** Riders do not turn up, or **Dispatch** shows "No Riders yet. An admin adds them under Staff, with their mobile number."

### Check first

1. **How long?** Hours, the rest of today, or days.
2. **Which Orders?** Open **Orders**, set "Delivery day" to the day and press **Show**. Do the same for each day affected. Note how many are at each status.
3. **Chilled and frozen stock:** without power, take it off the shelf count as Shrink once you know it is lost (see [8](#8-stock-is-wrong)).

### Steps

**Step 1: stop new Orders (Admin only).**

1. Open **Zones and Slots** (`/admin/setup`) and scroll to **The next 7 days**. The page says: "Set a Slot to its booked number to close it to new Orders."
2. For each Slot you cannot serve, type the "N booked" number into its box and press **Save**.
   - The Slot then shows as full to every Customer, including one who is holding a place in it at Checkout.
   - It cannot go below what is booked ("N are booked: at least N.").
3. The list covers only Slots already made, which is today and the next 6 days.
   - For a closure further out, close those Slots once they appear on this list.
   - Or set that window's capacity to `0` under **Weekly Slot schedule** and press **Save**. That changes **every** future week's Slots made while it stays at 0, so put it back afterwards.
   - Do not press **Remove** on a window for a one-off closure.
4. Reopen later by typing the old capacity back and pressing **Save**.

> **Not possible in the app yet:**
>
> - There is no one-button "close the Hub", and no notice to Customers on the site. Closed Slots just look full.
> - Post on the shop's social pages if you have them.

**Step 2: decide what happens to booked Orders.** First choose between moving and cancelling:

> **Not possible in the app yet:** moving an Order to another Slot. You have two choices instead:
>
> - **Deliver later in the same Order.** Agree a new time with the Customer by text or call. Add an Order Note such as "Customer agreed: deliver Sat 10 AM to 12 PM", and keep the Order as it is. Nothing in the app cancels a Confirmed Order whose Slot has passed. The Daily report will count it as a late delivery. This is kinder for paid Orders, because a cancel costs the PayMongo fee and makes the Customer pay again.
> - **Cancel, and the Customer orders again.** They can use "Reorder these items" on their order page once Slots reopen. Prices will be today's.

Then act on each Order by its status:

| Status                       | What you can do                                                                                                                                                                                                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Waiting for payment**      | Nothing. If the Customer pays, it becomes Confirmed and you treat it like the next row. If not, it cancels itself after 15 minutes                                                                                                                                                                         |
| **Confirmed** or **Picking** | Keep it for later, or cancel it: open the Order, choose "Cancel the Order (refunds a paid Order in full)" under **Next step**, type the reason (it goes in the History), press **Save**. For a Picking Order, put the picked items back on the shelf                                                       |
| **Ready for the Rider**      | Cannot be cancelled. Keep it chilled and deliver it later, or see the workaround below                                                                                                                                                                                                                     |
| **On the way**               | The Rider delivers it if safe. If not, the Rider opens **My deliveries**, then **Could not deliver**, chooses a reason, and presses **Bring it back**. It moves to **Missed: send again or cancel** on **Dispatch**. From there, press **Send out again** later, or follow "Cancel it from the Order page" |
| **Delivery failed**          | Under **Missed: send again or cancel** on **Dispatch**: send it out again later, or cancel it from the Order page                                                                                                                                                                                          |

> **Not possible in the app yet:** cancelling an Order that is **Ready for the Rider**. The only path is the workaround below, and it texts the Customer twice: "on its way" with a PIN, then "we missed you". **Warn the Customer first.**
>
> 1. On **Dispatch**, send it out with a Rider.
> 2. The Rider presses **Could not deliver**, then **Bring it back**.
> 3. Cancel it from the Order page. Its items go back on the shelf count.

**Cash on delivery vs paid online, when you cancel:**

|                               | Cash on delivery                                  | Paid with GCash or card                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Money                         | Nothing was taken. The Payment becomes "Not paid" | The full amount still held is refunded on its own, by the refund job                                                                                                      |
| Customer message from the app | **None.** You must text them                      | The app texts and emails the refund: "We refunded ₱... to your GCash for your cancelled order ..."                                                                        |
| Watch for                     | Nothing                                           | If PayMongo is also down, these refunds land in **Refunds to check** ([2c](#2c-a-refund-in-refunds-to-check)). If you can wait, cancel paid Orders after PayMongo is back |

**No Riders:**

1. An Admin can add a stand-in Rider at **Staff** (`/admin/staff`):
   1. Fill in Name, "Email they sign in with", "Mobile (Riders: shown to Customers)", and set Role to Rider.
   2. Press **Add to staff**.
   3. They sign in with that email.
2. The app has no partner delivery (Lalamove, Grab).
3. A Rider who goes off mid-route keeps the Orders they carry.

> **Not possible in the app yet:** handing an **On the way** Order to another Rider. If another person delivers it, the Dispatcher uses **Delivered without the PIN** on **Dispatch** ([section 7](#7-the-customer-cannot-give-the-delivery-pin-or-the-delivery-fails)), with a reason such as "Delivered by <name>, <first Rider>'s phone dead". The cash still counts under the first Rider on **Cash**, so note it there too.

### Tell the Customer

Moving the delivery:

```text
Hoshimono: Hi! Sorry po, our Hub can't deliver today because of <the typhoon / a power outage>. Can we bring order <Order Number> on <day> between <time> instead? Reply OK, or tell us a time that works. If you'd rather cancel, reply CANCEL and we'll refund any payment in full. Ingat po!
```

Cancelled, cash on delivery:

```text
Hoshimono: Hi! Sorry po, we had to cancel order <Order Number> because <the typhoon closed our Hub>. You weren't charged anything. Once we're back, you can order the same items in one tap from your order page. Ingat po!
```

Cancelled, paid online (the app sends its own refund text too):

```text
Hoshimono: Hi! Sorry po, we had to cancel order <Order Number> because <the typhoon closed our Hub>. We're refunding the full <amount> to your <GCash / card>, and you'll get a text once it's sent. Ingat po!
```

### When to call the technical person

- You need to close many Slots or days and no Admin is free. Closing Slots is Admin only, and the technical person can do it from the database.
- Paid Orders were cancelled while PayMongo was down. Check **Refunds to check** together afterwards.
- The Hub's internet is down but the site is up. Staff can work from mobile data on their phones; nothing needs the technical person unless the site itself is down ([4d](#4d-the-database-or-hosting-is-down)).

---

## 4. A provider outage

### 4a. PayMongo (GCash and card) is down

**How you notice:**

- Customers see "We couldn't open the payment page. Please try again in a moment." on the pay page.
- **Refunds to check** fills with "No clear answer from PayMongo".
- The PayMongo status page or dashboard reports a problem **(dashboard only)**.

**Can cash on delivery keep going? Yes.** Cash on delivery never calls PayMongo, so Checkout, picking, dispatch and cash all keep working. Cash on delivery limits still apply:

- up to ₱20,000 per Order;
- up to 3 open cash Orders per Customer.

**What happens to online Orders meanwhile:**

- An Order whose checkout never opened cancels itself after 15 minutes, as long as the cron runs. Its lines go back to the Cart.
- Webhooks that PayMongo cannot send now should arrive when it recovers. Those Orders then confirm, or refund themselves if they were already cancelled.
- Refunds sent during the outage get no clear answer, so they become **Needs a check**. Settle each one at **Refunds to check** after PayMongo is back ([2c](#2c-a-refund-in-refunds-to-check)), checking the dashboard first.

**Steps:**

1. Avoid cancelling paid Orders until PayMongo is back, unless you must.
2. For a long outage (an hour or more), the owner can ask the technical person to switch online payment off. Checkout then offers only cash on delivery.

**What the technical person does to switch online payment off:**

1. In the hosting dashboard **(dashboard only)**, change `PAYMENT_PROVIDER` from `paymongo` to empty and redeploy. Checkout then shows only cash on delivery, with the line "GCash and card payments are coming soon."
2. Know the side effects while it is off:
   - Unpaid online Orders are **not** cancelled by the 15-minute job.
   - On the pay page, "Pay now" and "Back to cart" do nothing.
   - Webhooks and refunds still go through, because they use the provider named in the URL and on the Payment.
3. Switch it back as soon as PayMongo works. The next cron tick cancels the unpaid Orders that waited.

> **Not possible in the app yet:** pausing GCash and card on their own. The only switch also stops the Payment Window job.

**Tell the Customer** (one who could not pay):

```text
Hoshimono: Hi! Sorry po, GCash and card payments are down on our side right now. Your order <Order Number> isn't paid, so you weren't charged, and it will clear by itself in a few minutes. You can order again with cash on delivery, or try GCash later. Salamat sa pasensya!
```

### 4b. SMS is down

**How you notice:**

- Customers say they did not get their sign-in code, their Delivery PIN or a substitute question.
- The technical person sees `[jobs] order.... failed` with an SMS error in the logs.

**Texts from the Hub phone still work.** They do not go through the SMS sender.

**What stops, and what to do:**

| What                                                  | What happens                                                                                                             | What to do                                                                                                                                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sign-in by text code**                              | Codes do not arrive. Each number can ask for 3 codes per 15 minutes                                                      | Tell Customers to sign in with their email link, or Google if it is switched on. Staff sign in by email or Google anyway                                                                                                          |
| **Substitution texts** ("pick a similar item")        | The Customer never hears about the swap. Their 10-minute Substitution Window still runs, and **silence counts as a yes** | Pickers: before pressing **Offer substitute**, call the Customer from the Hub phone. If they agree, press **Offer substitute**: it is accepted when the window ends. If they say no, save the line as **Short** and offer nothing |
| **Delivery PIN texts**                                | The Customer may not have the PIN. It is also in their email and on their order page while the Order is "On the way"     | See below                                                                                                                                                                                                                         |
| **Order confirmed, refund and "we missed you" texts** | They retry 4 more times over about 30 minutes, then stop                                                                 | The technical person retries them once SMS is back (see below)                                                                                                                                                                    |

**Delivery PIN when SMS is down:**

1. The Rider asks the Customer to open their order page: `/orders/<Order Number>`, signed in. It shows "Give the Rider this PIN at the door:".
2. If they cannot sign in or find it, the Rider calls the Dispatcher.
3. The Dispatcher checks it is the right person, by name and address on the Order, and uses **Delivered without the PIN** ([section 7](#7-the-customer-cannot-give-the-delivery-pin-or-the-delivery-fails)).

> **Not possible in the app yet:** staff cannot record a Customer's yes or no to a Substitution given by phone. Only the Customer's own link can. Hence the "call first" rule above.

**Tell the Customer:**

Before a substitute (send or say it, then wait for the answer):

```text
Hoshimono: Hi! We're out of <Product> for order <Order Number>. Is <substitute> at <price> each okay instead? You won't pay more than the original. Reply YES or NO, salamat!
```

At the door, no PIN:

```text
Hoshimono: Hi! Our Rider is at your door with order <Order Number>. Your 4-digit Delivery PIN is on your order page, <tracking link>. Please give it to the Rider. Salamat!
```

### 4c. Email is down

**How you notice:**

- Customers do not get sign-in links or order emails.
- The logs show `[jobs]` failures with an email error.

Order notices still go out by text: the app tries every channel, and the job tries the email again later on its own.

**What stops, and what to do:**

| What                                                                           | What to do                                                                                                                                                                          |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Customer sign-in by email link**                                             | Tell Customers to sign in with a text code                                                                                                                                          |
| **Staff sign-in**                                                              | Staff are linked by email: they sign in with the email link or Google. Staff already signed in stay signed in. Do not sign out until email is back, unless Google sign-in is set up |
| **Order notices**                                                              | Texts still go out. Nothing to do unless SMS is down too ([4b](#4b-sms-is-down))                                                                                                    |
| **Freshness Claim decisions, Cart Reminders, Stock Alerts, Referral Vouchers** | They wait. The technical person retries them once email is back                                                                                                                     |

### 4d. The database or hosting is down

**How you notice:**

- The site and `/admin` show errors or do not load.
- `/api/health` answers 503 (the database) or nothing (the hosting).
- The uptime monitor alerts.

**What stops:** everything. No Checkout, no staff screens, no webhooks, no cron. PayMongo should keep retrying webhooks and deliver them later (to confirm in test mode).

**Steps at the Hub:**

1. **Picking:** if you printed the day's Pick Sheets (`/admin/print/pick/<Order Number>`), keep picking on paper. Record what was found in the app when it is back.
2. **Riders:** at each door, write down the Order Number, the PIN the Customer says and the cash taken. When the app is back, the Rider enters them at **My deliveries**. The Order is still "On the way" and assigned to them, and the PIN still works.
3. Do not cancel or re-place Orders from memory. Wait for the app.

**What the technical person does:**

1. Check the Vercel and Neon status pages and dashboards **(dashboard only)**.
2. Check `DATABASE_URL` in the hosting settings and the Neon project. A paused or deleted branch looks like an outage.
3. If data is lost or damaged, go to [section 10](#10-restoring-the-database).
4. When it is back:
   1. Run the cron tick by hand once ([section 5](#5-cron-not-running)).
   2. Check **Refunds to check**.
   3. Check for Orders "Waiting for payment" older than 20 minutes ([1a](#1a-paid-but-still-waiting-for-payment)).

**Tell the Customer** (one who asks while it is down):

```text
Hoshimono: Hi! Sorry po, our website is down for a bit and we're fixing it now. Your order <Order Number> is safe and we'll text you an update soon. Salamat sa pasensya!
```

### When to call the technical person

Always, for 4a to 4d. Staff can only work around an outage; the fix is theirs.

Once a provider is back, the technical person retries the notices that gave up (see [section 5](#5-cron-not-running), "Retry jobs that gave up").

---

## 5. Cron not running

The host calls `GET /api/cron/tick` every minute with the header `Authorization: Bearer <CRON_SECRET>`. Vercel sends it from `vercel.json` once `CRON_SECRET` is set. A missing or wrong secret gets a plain `404 Not found`, so a broken cron looks like nothing at all.

Each tick runs these steps. Each step runs on its own, so one failing does not stop the others:

| Step (name in the reply)          | What it does                                                                       | If the cron stops                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `holds`                           | Deletes lapsed 10-minute Slot Holds                                                | Harmless: lapsed holds are already ignored when counting places. The table just grows                                                     |
| `slots`                           | Makes Slots from the **Weekly Slot schedule** for today and the next 6 days        | **No new delivery days appear.** Customers see one day fewer each day, and after a week there is nothing to book                          |
| `unpaid`                          | Cancels online Orders unpaid after 15 minutes (the Payment Window)                 | Unpaid Orders stay "Waiting for payment" and keep holding stock and Slot places. The Customer can still pay late, or press "Back to cart" |
| `reminders`                       | Queues Cart Reminders (Cart idle 3 hours to 2 days, Customer agreed to reminders)  | No Cart Reminders                                                                                                                         |
| `stockAlerts`                     | Queues Stock Alerts for Products back in stock, and ends alerts older than 30 days | No Stock Alerts                                                                                                                           |
| `jobs`                            | Runs the jobs outbox: notices and refunds                                          | See below                                                                                                                                 |
| `rateLimits`, `carts`, `doneJobs` | Housekeeping                                                                       | Tables grow                                                                                                                               |

**The jobs outbox when the cron stops:**

- **What still goes out:** most notices and refunds, because the action that queues them also runs due jobs straight away. That covers placing an Order, a webhook, moving an Order, Picking, Dispatch, a claim decision, and settling a refund.
- **What waits for the cron:**
  - retries of anything that failed;
  - Cart Reminders and Stock Alerts;
  - anything queued when no staff action follows, such as a Referral reward after a delivery marked "without the PIN".

### How you notice

- **Orders** with Status "Waiting for payment" shows Orders older than 20 minutes.
- **Zones and Slots**, under **The next 7 days**, ends before 7 days from today.
- Refunds sit at **Waiting to send**.
- Notices arrive late on quiet days.

### Check first

The technical person runs the tick by hand:

```sh
curl -sS -i -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/tick
```

| Answer                                                                                                              | Meaning                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `200` with `{"holds":..,"slots":..,"unpaid":..,"reminders":..,"stockAlerts":..,"jobs":{"done":..,"failed":..},...}` | The tick works. The scheduler is not calling it                                                                     |
| `500` with an `errors` object                                                                                       | A step fails. The step name and the start of the error are in the reply, and `[cron] <step> failed:` is in the logs |
| `404 Not found`                                                                                                     | `CRON_SECRET` is missing in the deployment, or differs from the one you sent                                        |

### Steps

The technical person does all of these.

1. **The scheduler is not calling.** In the Vercel project's Cron Jobs page **(dashboard only)**, check:
   - the cron is listed and enabled;
   - the plan allows per-minute crons. docs/03 section 11 says per-minute crons need a paid Vercel plan;
   - it runs on the production deployment.
2. **`404`:** set `CRON_SECRET` in the hosting dashboard and redeploy **(dashboard only)**.
3. **A step fails:** fix the cause from the error. The other steps keep running meanwhile.
4. **Until it is fixed:** call the tick by hand, or from any scheduler that can send the header, at least every few minutes. Every step is safe to repeat.
5. **Retry jobs that gave up.** A job tries 5 times in all, 1, 4, 9 and 16 minutes apart, then stops with its last error. After the cause is fixed:

   ```sql
   -- Jobs not done yet, oldest first
   SELECT id, kind, attempts, run_at, left(last_error, 120) AS error
   FROM jobs WHERE done_at IS NULL ORDER BY run_at LIMIT 50;

   -- Let the ones that gave up try again
   UPDATE jobs SET attempts = 0, run_at = now()
   WHERE done_at IS NULL AND attempts >= 5;
   ```

   Then run the tick. This is safe:
   - each message is logged once sent, so only what is missing goes out;
   - a refund job sends only a refund still waiting to send;
   - a substitute question whose 10 minutes have passed is skipped.

### Tell the Customer

Nothing in general. A Customer whose unpaid Order is still "Waiting for payment" can finish paying or press "Back to cart" on their pay page.

### When to call the technical person

As soon as any of the signs above show. Delivery days run out within a week.

> **Not possible in the app yet:** seeing the last cron run, the jobs that gave up, or the Payment Event ledger from the admin.

---

## 6. A Rider's cash does not match

How cash works (ADR 0011):

1. **At the door:** the Rider records the cash for each cash on delivery Order at **My deliveries**. The amount is pre-filled with the Final Total. A different amount needs a reason in "If the cash is different, why?".
2. **At day's end:** the Dispatcher counts each Rider's cash at **Cash** (`/admin/cash`) and records the Cash Handover against what the Rider recorded.

### How you notice

- On **Cash**, the count comes out short. After **Record count**, the line reads "Counted ₱... by <name>: ₱... short." instead of ": matches.".
- Or the count comes out over: ": ₱... over."
- Before counting, an Order line on **Cash** shows "(due ₱...: <reason>)". The Rider recorded a different amount from what was due.

### Check first

1. Open **Cash** and pick the "Day", then press **Show**.
   - Each Rider shows "<name>: ₱<recorded> from N Orders" and each Order's cash.
   - The day is the day the Order was **delivered**, Manila time. An Order delivered after midnight is on the next day.
2. Look for Orders with "(due ...)". The Rider already explained those at the door.
3. Weighed Products:
   - The Final Total can be lower than the estimate the Customer was told to prepare.
   - A Customer may have handed over the estimate, and the Rider kept the change by mistake. That shows as **over**.
4. Open the Delivery Receipt for any Order in doubt: `/admin/print/receipt/<Order Number>`, linked from the Order page as "Delivery receipt to print".

### Steps

1. **Count again**, with the Rider present.
2. Ask the Rider about each Order. Common causes:
   - change not given;
   - a Customer short of cash;
   - money kept apart for fuel;
   - a wrong amount typed at the door.
3. **Record the count once.**
   1. Type "Cash counted (₱)".
   2. If cash is missing, the note is required: "₱... is missing. Say what happened." Write what you found.
   3. Press **Record count**.
4. **A wrong amount typed at the door:** add an Order Note on that Order with the real amount, and explain it in the count's note.
5. **A Customer underpaid:** contact them (text below). If they pay later, add an Order Note.
6. **A Customer overpaid**, such as handing over the estimate: return the difference on the next delivery, or by GCash transfer, or with a Voucher. Add an Order Note.

> **Not possible in the app yet:**
>
> - Correcting a count once recorded ("This Rider's cash for the day is already counted.").
> - Editing the cash a Rider recorded at the door.
> - Giving back a cash overpayment in the app.
>
> Use Order Notes for all three.

### Tell the Customer

Underpaid:

```text
Hoshimono: Hi! Quick check po on order <Order Number>: our count shows we received <amount received> but the total was <amount due>. Could we have missed something at the door? Just reply here and we'll sort it out. Salamat!
```

Overpaid:

```text
Hoshimono: Hi! We owe you <amount> from order <Order Number>: you paid a bit more than your final total. We'll <give it back with your next delivery / send it to your GCash>. Salamat for your patience!
```

### When to call the technical person

- A count was recorded with a wrong number and must be fixed in the database (`cash_handovers`, one row per Rider per day). The owner decides first.
- The same Rider is short several days in a row. That is the owner's call, not a technical one.

---

## 7. The Customer cannot give the Delivery PIN, or the delivery fails

How the Delivery PIN works (ADR 0011):

- **When the Order leaves the Hub:** the Customer gets a 4-digit Delivery PIN by text and email. It is also on their order page, `/orders/<Order Number>`, while the Order is "On the way".
- **A new PIN each time:** every time an Order goes out, it gets a new PIN and a new text.
- **Who sees the PIN:** the Rider cannot see it, and staff screens do not show it.
- **Wrong PINs:** after 5 wrong PINs the Rider sees "Too many tries. Call the Dispatcher."

### How you notice

- The Rider calls from the door.
- **My deliveries** shows "That PIN is not right. N tries left." or "Too many tries. Call the Dispatcher."
- Nobody answers the door.

### Check first

1. Ask the Rider to press **Call <first name>** on **My deliveries** to reach the Customer.
2. Ask the Customer to check the latest text from Hoshimono, their email, or their order page. If the Order went out twice, only the newest PIN works.

### Steps

**The PIN cannot be used** (the Customer cannot find it, or the Rider is locked out). The Dispatcher does this:

1. On the phone, check it is the right person: their name and the address on the Order.
2. Open **Dispatch** (`/admin/dispatch`) and find the Order under **Out now**.
3. Open **Delivered without the PIN**. Fill in "Why was the PIN not used?", such as "Customer's phone dead, ID checked by Rider".
4. For a cash Order, check "Cash received (₱)" with the Rider.
5. Press **Mark delivered**. The reason goes in the Order's History and the audit log.

If the cash is different from what was due, say why in "If the cash is different, why?" on the same form.

**Nobody home, or the delivery cannot be made:**

1. The Rider, on **My deliveries**, opens **Could not deliver**.
2. Under "What happened?", they choose:
   - No one home;
   - Could not reach by phone;
   - Wrong or unclear address;
   - Customer refused.
3. They add "More detail (optional)" and press **Bring it back**.
4. The Order becomes "Delivery failed". The app texts and emails the Customer: "Sorry, we could not deliver order ... We will call you to arrange another try." **So someone must call them.**
5. The Dispatcher, on **Dispatch** under **Missed: send again or cancel**, does one of these:
   - **Send it again:** choose a Rider and press **Send out again**. The Customer gets a new PIN.
   - **Cancel it:** follow "Cancel it from the Order page", choose "Cancel the Order (refunds a paid Order in full)", type the reason and press **Save**.
     - A paid Order is refunded all that is left.
     - A cash Order owes nothing.
     - The items go back on the shelf count.
6. **Wrong address:** get the right landmark by phone, then tell the Rider directly before sending it out again.

> **Not possible in the app yet:**
>
> - Changing an Order's address.
> - Riders do not see Order Notes. They see only the Customer's note for the Rider.

### Tell the Customer

At the door, no PIN:

```text
Hoshimono: Hi! Our Rider is at your door with order <Order Number>. Your 4-digit Delivery PIN is in our last text, your email, or your order page: <tracking link>. Please give it to the Rider. Salamat!
```

After a missed delivery (after you call, or if they do not pick up):

```text
Hoshimono: Hi! Sorry we missed you today. Can we bring order <Order Number> on <day> between <time>? Reply OK or tell us a time that works. You'll get a new Delivery PIN by text when it leaves our Hub.
```

### When to call the technical person

- Never for a normal missed delivery.
- Only if **Mark delivered** or **Delivered** keeps failing with "This Order is not out for delivery." while the Order page says "On the way". Someone else may have moved it; reload first.

---

## 8. Stock is wrong

How stock works (ADR 0012, docs/03 section 9):

- **The numbers:** the shelf count (`on_hand`) minus what Orders reserved is what can be sold ("Free").
- **Checkout** reserves stock.
- **Finish picking** takes what was packed off the shelf count.
- **Cancelling after picking** puts it back.
- **Stock screens** are for Admins and Dispatchers: **Stock** (`/admin/stock`).

### How you notice

- The Picker cannot find a Product the app sold.
- A Product shows "Free" stock that is not on the shelf, or shows sold out while the shelf is full.
- **Stock** with "Only what is low" ticked shows unexpected Products.

### Check first

1. Open **Stock**, search "Product or brand", and press **Show**. Read "On the shelf", "Reserved", "Free" and "Low at".
2. Open the Product. **Latest movements** shows every change:
   - Received;
   - Reserved for an Order;
   - Reservation released;
   - Picked;
   - Shrink;
   - Count;
   - Back from a cancelled Order.

### Steps

**Sold something not on the shelf:**

1. **Picker:** at the line, press **Short**, type "How many found?" (0 if none) and press **Save**. Then follow the line's Substitution Preference:
   - "If missing: a similar item (they can say no)": choose under "Offer instead (they have 10 minutes to say no)" and press **Offer substitute**.
   - "If missing: only <their choice>": press **Use their choice: <name>**.
   - "If missing: no substitute": nothing more to do.
   - Weighed Products are never substituted: press **None left: short**.
2. The Customer is not charged for what is missing. The Final Total leaves it out. If they paid online, the difference is refunded when picking finishes.
3. **Dispatcher:** fix the count on the Product's page (below), so it stops selling.

**Fix the count after a physical count:**

1. Open the Product from **Stock**.
2. Under **After a physical count**, type "How many are on the shelf", add a "Note (optional)", and press **Set the count**.
3. The count can never go below what Orders have reserved ("N are reserved for Orders: count at least N."). If the shelf really has fewer than that:
   1. Set it to the reserved number. "Free" becomes 0 and the Product stops selling.
   2. Let the Pickers mark those Orders **Short**.
   3. Count again once those Orders are picked.

**Other fixes:**

| What happened                       | Where                        | Fill in                                                  | Press              |
| ----------------------------------- | ---------------------------- | -------------------------------------------------------- | ------------------ |
| A supplier delivered                | **Received from a supplier** | "How many came in", "Delivery receipt number (optional)" | **Add to stock**   |
| Spoiled, broken or missing (Shrink) | **Spoiled, damaged or lost** | "How many to take off", "What happened"                  | **Take off stock** |

Shrink cannot take reserved stock: "Only N are not reserved for Orders."

**To hide a Product completely:** an Admin or Merchandiser opens **Products**, sets its Status to "Draft" and presses **Save changes**. "In the shop" brings it back.

> **Not possible in the app yet:** recording a shelf count below what is reserved. See the workaround above.

### Tell the Customer

The app does not text about short lines. The Final Total on their order page shows it. For a big short, text them:

```text
Hoshimono: Hi! Sorry po, we ran out of <Product> for order <Order Number>, so we left it out and you won't pay for it. <If paid online: The difference goes back to your GCash / card once we finish packing.> Salamat for understanding!
```

### When to call the technical person

- Stock numbers that the movements do not explain, or an error when saving a count. The database has a check that `reserved` never goes below 0, and an accounting bug surfaces as an error.

---

## 9. A Freshness Claim dispute

How Freshness Claims work (ADR 0016):

- **Filing:** a Customer reports a delivered Order Line within 24 hours of delivery, from their order page.
  - One claim per line.
  - A photo is required for "Spoiled or not fresh" and "Damaged".
- **The value:** the server works out what the claim is worth. The Customer never types an amount.
- **Review:** Admins and Dispatchers review every claim at **Freshness Claims** (`/admin/claims`).
- **Paying back:**
  - Paid with GCash or card: a refund, through the refund ledger.
  - Paid in cash, or nothing left to refund: a personal Voucher ("CREDIT..."), no minimum spend, for 90 days.
- **The decision message:** the Customer gets it by email, or by text if they have no email.

### How you notice

- A claim waits under **To review**.
- Or a Customer disputes a decision: "you rejected it", "you approved too little", or "I couldn't report it in time".

### Check first

1. Open **Freshness Claims**:
   - **To review** shows open claims, oldest first.
   - **Decided** shows past ones, with who decided and any note.
2. On the claim, read:
   - the Product and the reason ("Spoiled or not fresh", "Damaged", "Missing" or "Wrong item");
   - **Claimed**: how many, or "The whole pack" for a Weighed Product;
   - **Worth**;
   - **Status**: "Waiting for review", "Approved" or "Not approved";
   - the Customer's note and photos.
3. Open the Order from the link. Check what was packed, any Substitution, and the History.

### Steps

**Deciding a claim:**

- **Approve:**
  1. Keep "Amount (₱)" as it is, or lower it. It can be at most what it is worth: "Approve up to ₱...".
  2. If you lower it, say why in "Note to the Customer (optional)".
  3. Press **Approve and pay back**. The box above the button says how the money goes back.
- **Reject:**
  1. Write "Why, for the Customer". It is required.
  2. Press **Reject**.
- **Decisions are final and made once.** A second reviewer sees "Someone already decided this claim."
- An approved refund then follows the refund ledger. If it lands in **Refunds to check**, settle it there ([2c](#2c-a-refund-in-refunds-to-check)).

**The Customer disputes a decision, or missed the 24 hours:**

1. Listen, and ask for photos by text if there are none.
2. The owner, or whoever they name, decides whether to give more.
3. **Give more:**

   > **Not possible in the app yet:**
   >
   > - Reopening or changing a decided claim.
   > - Filing a claim for a Customer.
   > - Making a Voucher for one Customer only from the admin.

   Use a goodwill Voucher or a refund in the PayMongo dashboard.

   **Goodwill Voucher** (Admin or Merchandiser):
   1. Open **Vouchers**, then **New Voucher**.
   2. Fill in:
      - **Code:** hard to guess, such as `SORRY-7KQ2`;
      - **It gives:** "Pesos off the order", with "Pesos off (₱)";
      - **Minimum spend (₱):** 0;
      - **Uses in all (optional):** 1;
      - **Uses per Customer:** 1;
      - **Ends (Manila time):** 90 days ahead.
   3. Press **Create Voucher**.
   4. Anyone with the code can use it, so send it only to that Customer.

   **Refund in the PayMongo dashboard** **(dashboard only)**: use this for an online Order. It does not show in the app.

   Either way, add an Order Note.

4. **Keep the rejection:** reply kindly with the reason. The claim stays as decided.

### Tell the Customer

Giving a goodwill Voucher:

```text
Hoshimono: Hi <name>! We looked at your report on <Product> from order <Order Number> again. Pasensya na po. Here's <amount> off your next order: use code <CODE> until <date>, no minimum spend. Salamat for telling us, it helps us pick better.
```

Keeping a rejection:

```text
Hoshimono: Hi <name>! We looked at your report on <Product> from order <Order Number> again. <Reason, such as: the photo shows the pack sealed and within its date>. We can't approve this one, but we've told our Pickers to double-check this item. Salamat for understanding.
```

### When to call the technical person

- A claim's photos do not load.
- An approved claim has no refund and no Voucher.

---

## 10. Restoring the database

How to back up and restore the database, and how often to rehearse it, is in [backup-restore.md](backup-restore.md). Only the technical person restores, and only after the owner agrees.

After a restore, data written since the backup is gone. Before reopening:

1. Run the cron tick by hand ([section 5](#5-cron-not-running)).
2. Check **Refunds to check**.
3. Check Orders "Waiting for payment" older than 20 minutes ([1a](#1a-paid-but-still-waiting-for-payment)).
4. Compare recent PayMongo payments **(dashboard only)** with the Orders in the app.

---

## Tools added on 28 Oct 2026

Some steps above were written before these existed; where a step says "not possible in the app yet", check here first.

| Situation                                                                                       | Where                                                                            | What it does                                                                                                                          |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| PayMongo shows an Order paid, but it still waits ([1a](#1a-paid-but-still-waiting-for-payment)) | Order page, **Paid in PayMongo?** (Admins)                                       | Records the payment the way a verified webhook would: the Order is confirmed, or, if it had closed, the money goes back as a refund   |
| A refund was paid back some other way ([2c](#2c-a-refund-in-refunds-to-check))                  | **Refunds to check**, "It went through", with how it was paid in the box         | Clears it from the list                                                                                                               |
| Make up for a bad Order                                                                         | Order page, **Customer contact**, Voucher (Admins)                               | A personal Voucher up to ₱2,000, and a text and email with the code                                                                   |
| Tell the Customer something                                                                     | Order page, **Text the Customer**                                                | Texts their number on the Order; the text goes in the notes                                                                           |
| Cancel an Order packed and ready                                                                | Order page, **Next step**, Cancel                                                | What was picked goes back on the shelf; the Customer is told; a paid Order is refunded                                                |
| Deliver later, or to another address in the same Zone                                           | Order page, **Delivery**                                                         | Moves it to another Slot with room (the Customer gets the new time), or to another saved address                                      |
| A Rider cannot finish the round                                                                 | **Dispatch**, **Out now**, "Hand to another Rider"                               | The other Rider takes it; the PIN stays; the Customer is told who is coming                                                           |
| The Customer answered a substitute by phone                                                     | **Picking**, the line's "They answered by phone?"                                | Same as their answer by link                                                                                                          |
| Cash recorded wrong                                                                             | **Cash**: "Correct one Order's cash" before the count, "Correct the count" after | Saves the right amount and why                                                                                                        |
| Close the Hub, or take cash only                                                                | **Zones and Slots**, **Hub status** (Admins)                                     | A notice on every shop page until a time you choose; GCash and card off (unpaid Orders still expire); whole days closed to new Orders |
| Is the cron running? What failed?                                                               | **System** (Admins)                                                              | When the cron last ran, every job not done with its last error, and the newest payment events                                         |

## Things the app cannot do yet

Listed where they come up above. Collected here for the backlog:

1. Show the PayMongo checkout and payment ids on the Order page.
2. Cancel an Order that is On the way without a failed delivery first.
3. Reopen a decided Freshness Claim, or file one for a Customer.
4. Set a shelf count below what is reserved.
5. Change an Order's address to one in another Zone (cancel, and the Customer orders again).
6. Error alerts: Sentry is not wired in. Until it is, the alerting check (`/api/health?deep=1`, see "Where the technical person looks") names failed jobs, a stopped cron, unmatched payment events, refunds to check and full Slots.
