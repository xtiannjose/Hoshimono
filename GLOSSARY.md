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

**Promotion**:
A time-boxed price reduction or offer attached to Products or a Cart.
_Avoid_: Sale, deal, discount (use Voucher for code-based reductions)

**Search Synonym**:
Words Customers use for the same thing, often Filipino and English ("gatas" and "milk"). Search treats every word in a group as a match for the others.
_Avoid_: Alias, keyword, tag

**Voucher**:
A code a customer enters to reduce an Order total, with its own eligibility rules and usage limits.
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

**Order Number**:
The human-facing reference of an Order, `SW-YYMMDD-XXXX` (Manila date and four characters without 0, O, 1 or I), used in messages and tracking links.
_Avoid_: Order ID (the internal UUID), reference code

**Reorder**:
Creating a new Cart from a past Order's lines.
_Avoid_: Buy again (UI label only), repeat order

**Recipe**:
Editorial content with an ingredient list mapped to Products, which a customer can add to a Cart in one action.
_Avoid_: Meal kit, dish

### Delivery and fulfilment

**Hub**:
A non-public fulfilment facility where staff pick Orders and from which Riders depart. It holds the stock.
_Avoid_: Store, warehouse, branch, dark store

**Zone**:
A geographic area a Hub serves, defined by city and barangay lists, with its own delivery fee and minimum Order value.
_Avoid_: Region, coverage area, delivery area

**Slot**:
A bookable delivery window at a Hub for a date, with a capacity of Orders. Customer copy says "delivery slot".
_Avoid_: Timeslot, delivery window, appointment

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

**Substitution**:
A Product delivered in place of an ordered Product that was unavailable, recorded against the Order Line.
_Avoid_: Replacement, swap

**Freshness Claim**:
A customer's report, within the claim window after delivery, that an Order Line was not fresh or was damaged, resolved by refund or credit.
_Avoid_: Complaint, return, ticket

### People

**Customer**:
A person with an account who places Orders.
_Avoid_: User (for shoppers), client, buyer, member

**Staff**:
A person with an admin-side role (Merchandiser, Picker, Dispatcher, Admin).
_Avoid_: User (for admin side), employee, operator

**Address**:
A saved delivery location for a Customer, including landmark and delivery notes, resolved to a Zone.
_Avoid_: Location, delivery point

**Referral**:
A reward granted to a Customer when someone they invited completes a first Order.
_Avoid_: Invite bonus, affiliate
