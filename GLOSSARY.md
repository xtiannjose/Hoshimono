# Hoshimono

Online supermarket that sells groceries to households and delivers them from our own fulfilment hubs. This glossary fixes the words the product, the code and the database use.

## Language

### Catalogue

**Product**:
A thing a customer can buy, as the customer names it (for example "Gala Apples, 4 pack"). One Product has one price at a time per Hub.
_Avoid_: Item, SKU (as a customer-facing word), listing

**Category**:
A node in the browse tree that groups Products (Fresh > Fruit > Apples).
_Avoid_: Department, aisle, collection

**Unit Price**:
The price normalised to a common measure (per 100 g, per litre, per piece) so Products of different sizes compare fairly.
_Avoid_: Price per kilo (when the measure is not a kilo), rate

**Weighed Product**:
A Product sold by weight where the delivered weight differs from the ordered weight (meat, fish, loose produce).
_Avoid_: Variable-weight item, catch-weight, loose item

**Tax Class**:
How VAT applies to a Product: vatable (12% included in the price), VAT-exempt (fresh and unprocessed food), or zero-rated.
_Avoid_: Tax code, tax type, VAT flag

**Promotion**:
A time-boxed price reduction on chosen Products or Categories: a percent or a peso amount off each unit. While it runs it is the shelf price ([ADR 0015](docs/adr/0015-promotions-vouchers-referrals.md)).
_Avoid_: Sale, deal, discount (use Voucher for code-based reductions)

**Search Synonym**:
Words Customers use for the same thing, often Filipino and English ("gatas" and "milk"). Search treats every word in a group as a match for the others.
_Avoid_: Alias, keyword, tag

**Voucher**:
A code a customer enters to reduce an Order total (a percent or peso off the goods) or to make delivery free, with its own eligibility rules and usage limits. One per Order, on top of Promotions.
_Avoid_: Coupon, promo code

### Buying

**Cart**:
The set of Cart Lines a customer is assembling before checkout. It is mutable and not a commitment.
_Avoid_: Basket, bag

**Cart Line**:
One Product in a Cart with a quantity and a Substitution Preference.
_Avoid_: Cart item, entry

**Guest Cart**:
A Cart kept for a visitor who has not signed in, found through a random token in a cookie (only its hash is stored). Signing in merges it into the Customer's Cart.
_Avoid_: Anonymous cart, session cart

**Picker Note**:
A short note on a Cart Line for the Picker, such as "lean cuts" or "ripe ones", copied to the Order Line.
_Avoid_: Special instructions, comment

**Substitution Preference**:
The customer's instruction for a Cart Line if the Product is out of stock at pick time: allow any suitable swap, choose a specific alternative, or do not substitute.
_Avoid_: Replacement setting, swap rule

**Checkout**:
The act of turning a Cart into an Order by confirming address, Slot and payment method.
_Avoid_: Purchase flow, payment page

**Order**:
A confirmed request to supply and deliver specific Products to one address in one Slot. It is immutable in price terms once placed.
_Avoid_: Purchase, transaction, booking

**Order Line**:
One Product on an Order, with the price, name and tax snapshotted at placement, an ordered quantity, and a fulfilled quantity.
_Avoid_: Line item, order item

**Order Note**:
A note staff add to an Order for each other, such as "Gate code 4421". The Customer never sees it.
_Avoid_: Comment, remark (and do not confuse it with the Rider note or the Picker Note, which come from the Customer)

**Order Number**:
The human-facing reference of an Order, `SW-YYMMDD-XXXX` (Manila date and four characters without 0, O, 1 or I), used in messages and tracking links.
_Avoid_: Order ID (the internal UUID), reference code

**Payment**:
One way an Order is paid: cash on delivery, or GCash or card through the payment provider. It records the amount asked for, captured and refunded.
_Avoid_: Transaction, charge (as a noun for the record)

**Payment Event**:
A message from the payment provider about a Payment, kept exactly once however many times it arrives.
_Avoid_: Callback, notification (for provider webhooks)

**Refund**:
Money going back to the Customer on a Payment made online: all of it when a paid Order is cancelled or money arrives after cancellation, or the difference once picked. Sent at most once.
_Avoid_: Reversal, chargeback (a chargeback is the bank's, not ours)

**Final Total**:
What a picked Order comes to: each Order Line by what was packed, never above its checkout amount. Paid online, the difference from the estimate is refunded; cash on delivery, it is what the Rider collects.
_Avoid_: Actual total, real total

**Payment Window**:
The 15 minutes an online Order waits for payment, holding its stock and Slot place. If it ends unpaid, the Order is cancelled and its lines go back to the Customer's Cart.
_Avoid_: Payment timeout, expiry (for the Order)

**Reorder**:
Adding a past Order's lines to the current Cart, on top of what is there, at today's prices ([ADR 0014](docs/adr/0014-reorder-lists-reminders-stock-alerts.md)).
_Avoid_: Buy again (UI label only), repeat order

**Shopping List**:
A named list of Products and counts a Customer keeps to buy again, such as "Weekly" or "Office pantry". Added to the Cart in one tap.
_Avoid_: Wishlist, favourites, saved items

**Cart Reminder**:
The one email sent 3 hours after a Customer, who agreed to reminders and offers, left items in their Cart without ordering.
_Avoid_: Abandoned cart (in customer copy), nudge

**Stock Alert**:
A Customer's request to hear when a sold-out Product is back; it ends once the message is sent, or after 30 days.
_Avoid_: Back-in-stock subscription, waitlist

**Recipe**:
Editorial content with an ingredient list mapped to Products, which a customer can add to a Cart in one action.
_Avoid_: Meal kit, dish

**Ingredient**:
One line of a Recipe: a Product to buy (how many for the base servings, and whether that grows with servings) or plain text for something we do not sell. An ingredient "usually at home" starts unticked ([ADR 0013](docs/adr/0013-recipes-articles-and-content-editors.md)).
_Avoid_: Item (that word is for Cart and Order lines)

**Article**:
Editorial content (a guide, tip or story) in sections, with Products linked from it. Customer copy says "Tips and guides".
_Avoid_: Blog post, post

### Delivery and fulfilment

**Hub**:
A non-public fulfilment facility where staff pick Orders and from which Riders depart. It holds the stock.
_Avoid_: Store, warehouse, branch, dark store

**Zone**:
A geographic area a Hub serves, defined by city and barangay lists, with its own Delivery Fee, Free-Delivery Threshold and Order Minimum.
_Avoid_: Region, coverage area, delivery area

**Delivery Fee**:
The flat amount an Order pays for delivery, set per Zone.
_Avoid_: Shipping fee, service fee, delivery charge

**Free-Delivery Threshold**:
The Cart value at or above which a Zone waives the Delivery Fee.
_Avoid_: Free shipping minimum, free delivery over

**Order Minimum**:
The lowest Cart value a Zone accepts at Checkout.
_Avoid_: Minimum spend, minimum order value, MOV

**Slot**:
A bookable delivery window at a Hub for a date, with a capacity of Orders. Customer copy says "delivery slot".
_Avoid_: Timeslot, delivery window, appointment

**Slot Schedule**:
A Hub's weekly pattern of delivery times (weekday, start, end, capacity) from which each date's Slots are made 7 days ahead. Admin copy calls one entry a "window" ([ADR 0012](docs/adr/0012-stock-slots-reports-receipts.md)).
_Avoid_: Calling a schedule entry a Slot (a Slot is one date's window)

**Slot Hold**:
A place in a Slot kept for one Cart for 10 minutes while the Customer checks out. A Cart holds one Slot at a time.
_Avoid_: Reservation (that word is for stock), booking

**Slot Cutoff**:
How long before a Slot starts it stops taking new holds and Orders (90 minutes for now), leaving time to pick and travel.
_Avoid_: Deadline, closing time

**Picking**:
Collecting the Order Lines of an Order from Hub shelves and chillers into totes.
_Avoid_: Packing, preparing

**Picker**:
A Hub staff member who performs Picking.
_Avoid_: Packer, shopper

**Rider**:
A person who carries a picked Order from a Hub to the customer's address.
_Avoid_: Driver, courier, delivery guy

**Delivery PIN**:
A 4-digit number the Customer gets when their Order leaves the Hub and gives the Rider at the door, as proof of delivery ([ADR 0011](docs/adr/0011-dispatch-pin-and-cash.md)).
_Avoid_: OTP, code (those are for sign-in)

**Cash Handover**:
A Rider's cash from cash-on-delivery Orders, counted by the Dispatcher at day's end against what the Rider recorded at each door.
_Avoid_: Remittance, settlement (settlement is for card and wallet payouts)

**Substitution**:
A Product delivered in place of an ordered Product that was unavailable, recorded against the Order Line.
_Avoid_: Replacement, swap

**Substitution Window**:
The 10 minutes a Customer has to refuse a Substitution the Picker chose for a "pick a similar item" line. Silence counts as a yes ([ADR 0010](docs/adr/0010-picking-and-substitutions.md)).
_Avoid_: Approval timeout

**Pick List**:
An Order's lines in the order a Picker walks the Hub: by Category until the Hub has aisle codes.
_Avoid_: Pick sheet (that is the printed copy)

**Pick Sheet**:
A Pick List printed on paper, with a box to tick per line. What was found is still recorded on the Pick List.
_Avoid_: Picking slip

**Delivery Receipt**:
The printed page packed with an Order: what each line was charged, the total and its VAT breakdown. Not an official receipt until BIR registration (ADR 0012).
_Avoid_: Invoice, official receipt, OR

**Shrink**:
Stock taken off the shelf because it spoiled, broke or went missing, always with a note saying what happened.
_Avoid_: Wastage, loss (as a stock reason)

**Freshness Claim**:
A Customer's report, within 24 hours of delivery, that an Order Line was spoiled, damaged, missing or the wrong item. Staff approve it (refund to GCash or card, or a Voucher for a cash Order) or reject it with a reason ([ADR 0016](docs/adr/0016-freshness-claims.md)).
_Avoid_: Complaint, return, ticket

### People

**Customer**:
A person with an account who places Orders.
_Avoid_: User (for shoppers), client, buyer, member

**Staff**:
A person with an admin-side role (Merchandiser, Content Editor, Picker, Dispatcher, Rider, Admin).
_Avoid_: User (for admin side), employee, operator

**Content Editor**:
Staff who write and publish Recipes and Articles, and nothing else.
_Avoid_: Writer, blogger, CMS user

**Address**:
A saved delivery location for a Customer, including landmark and delivery notes, resolved to a Zone.
_Avoid_: Location, delivery point

**Referral**:
A reward granted to a Customer when someone they invited completes a first Order: a ₱100 Voucher for each of them.

**Referral Code**:
A Customer's own code, shared as a link (`/r/<code>`), that links a new Customer to them.
_Avoid_: Invite code, promo code
_Avoid_: Invite bonus, affiliate
