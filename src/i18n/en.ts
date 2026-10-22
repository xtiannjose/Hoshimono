import { MAX_NOTE_LENGTH } from "@/lib/cart-limits";

// English words for the shop (ADR 0017). fil.ts has the same keys, checked
// by TypeScript. Names of Products, Categories and Recipes are data.

const items = (n: number) => (n === 1 ? "item" : "items");

const list = (names: string[]) =>
  names.length < 3
    ? names.join(" and ")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

export const en = {
  items,
  shell: {
    skipToContent: "Skip to main content",
    searchLabel: "Search groceries",
    searchPlaceholder: "Search groceries and brands",
    suggestions: "Suggestions",
    suggestionGroups: {
      product: "Products",
      category: "Categories",
      brand: "Brands",
    },
    account: "Account",
    toggleTheme: "Toggle dark mode",
    categories: "Categories",
    recipes: "Recipes",
    tipsAndGuides: "Tips and guides",
    help: "Help",
    moreFrom: (brand: string) => `More from ${brand}`,
    about: "Online supermarket for Metro Manila.",
    deliverTo: "Deliver to",
    chooseArea: "Choose your area",
    addAddress: "Add your address",
    deliverToPlace: (label: string, barangay: string) =>
      `Deliver to ${label}, ${barangay}`,
    nextSlot: (slot: string) => `Next: ${slot}`,
    noSlots: "No slots open",
    cart: "Cart",
    viewCart: "View cart",
    // The switch shows the other language in that language.
    otherLanguage: { short: "FIL", long: "Basahin sa Filipino" },
  },
  app: {
    offlineTitle: "You're offline",
    offlineBody:
      "Pages you have opened before still work. Placing an order, paying and your account need a connection.",
    retry: "Try again",
    offlineNote:
      "You're offline. Prices and stock may have changed since this page was saved.",
    install: "Install the app",
  },
  notFound: {
    title: "We couldn't find that page",
    body: "The link may be old, or the item is no longer sold. Try a search instead.",
    home: "Back to home",
  },
  error: {
    title: "This page didn't load",
    body: "Something went wrong on our side. Please try again.",
    retry: "Try again",
  },
  dates: { today: "Today", tomorrow: "Tomorrow", to: "to" },
  product: {
    add: "Add",
    addToCart: (name: string) => `Add ${name} to cart`,
    quantityOf: (name: string) => `Quantity of ${name}`,
    addOne: "Add one",
    removeOne: "Remove one",
    save: (percent: number) => `Save ${percent}%`,
    byWeight: "By weight",
    out: "Out of stock today",
    low: "Only a few left",
    inStock: "In stock",
    about: "About ",
    was: "was ",
    loading: "Loading products",
    approx: (size: string) => `approx. ${size}`,
    pieces: (n: number) => `${n} ${n === 1 ? "pc" : "pcs"}`,
    basis: {
      per_100g: "per 100 g",
      per_litre: "per litre",
      per_piece: "per piece",
    },
    count: (n: number) => `${n} ${n === 1 ? "product" : "products"}`,
  },
  home: {
    description:
      "Fresh groceries delivered the same day across Metro Manila. Pick a 2-hour delivery slot and pay cash on delivery.",
    title: "What do you need today?",
    delivery: "Delivery",
    coverage: (areas: string[], fee: string, free: string | null) =>
      `Same-day delivery across ${list(areas)}, in 2-hour slots. ${fee} delivery${free ? `, free over ${free}` : ""}.`,
    whereWeDeliver: "See where we deliver",
    deliverTo: (label: string, barangay: string) =>
      `Deliver to ${label}, ${barangay}`,
    nextSlot: (slot: string) => `Next slot: ${slot}`,
    noSlot: "No open slots right now",
    fee: (fee: string, free: string | null) =>
      free ? `${fee} delivery, free over ${free}` : `${fee} delivery`,
    notServed: "We don't deliver to your saved address yet.",
    addAddress: "Add your address to see your next slot.",
    change: "Change",
    categories: "Shop by category",
    recipes: "Recipes",
    freshPicks: "Fresh picks today",
    seeAllFresh: "See all fruit and vegetables",
    noFresh: "No fresh picks to show right now.",
    browseFresh: "Browse fruit and vegetables",
    buyAgain: "Buy again",
    onSale: "On sale this week",
  },
  breadcrumb: { label: "Breadcrumb", home: "Home" },
  help: {
    title: "Help",
    description: "Delivery, paying, substitutions and refunds at Hoshimono.",
    intro:
      "Quick answers about delivery, paying, and what happens if something goes wrong.",
    questions: [
      {
        q: "Where and when do you deliver?",
        a: "The same day, in 2-hour slots, to the areas on our delivery page. You choose a slot at checkout and we hold it for 10 minutes while you finish.",
      },
      {
        q: "How can I pay?",
        a: "Cash on delivery: pay the Rider at your door. When checkout offers them, you can also pay ahead with GCash or a card.",
      },
      {
        q: "What if something is out of stock?",
        a: "Each item in your cart says what to do: pick a similar item, use the one you chose, or leave it out. You're never charged for an item you don't get.",
      },
      {
        q: "How are items sold by weight charged?",
        a: "Meat, fish and some produce are charged for the weight we pack, within 10% of what you ordered. Your order page shows the final total.",
      },
      {
        q: "Something arrived spoiled or damaged. What now?",
        a: "Report it from your order page within 24 hours, with a photo. If we approve it, we refund your GCash or card, or give you a Voucher for a cash order.",
      },
      {
        q: "Can I cancel an order?",
        a: "Yes, from your order page, until we start picking it.",
      },
    ],
    deliveryAreas: "See where we deliver",
    orders: "Your orders",
    contact: "Still stuck? Email us at",
  },
  listing: {
    notFound: "Category not found",
    description: (name: string) =>
      `Shop ${name.toLowerCase()} for same-day delivery in Metro Manila.`,
    filters: "Filters",
    products: "Products",
    categories: "Categories",
    dietary: "Dietary",
    price: "Price",
    min: "Min ₱",
    max: "Max ₱",
    to: "to",
    brand: "Brand",
    apply: "Apply filters",
    clear: "Clear filters",
    noMatch: "No products match these filters.",
    emptyCategory: "Nothing here yet. We're stocking it soon.",
    pages: "Pages",
    showing: (first: number, last: number, total: number) =>
      `Showing ${first} to ${last} of ${total}`,
    previous: "Previous",
    next: "Next",
    sort: "Sort",
    sorts: {
      featured: "Featured",
      price_asc: "Price, low to high",
      price_desc: "Price, high to low",
      unit_price_asc: "Unit price, low to high",
    },
  },
  search: {
    title: "Search",
    askTitle: "What are you looking for?",
    askBody:
      "Type a product, brand or Filipino name in the search box, such as gatas, Alaska or pandesal.",
    noneTitle: (query: string) => `No results for “${query}”`,
    noneBody:
      "Check the spelling, use fewer words, or try the English or Filipino name (milk or gatas). You can also browse a category:",
    resultsFor: (query: string) => `Results for “${query}”`,
    corrected: (query: string, corrected: string) =>
      `We didn't find “${query}”, so we searched for “${corrected}”. `,
  },
  productPage: {
    notFound: "Product not found",
    description: (name: string, size: string, price: string) =>
      `${name}, ${size}, ${price}. Same-day delivery in Metro Manila.`,
    estimatedFor: (size: string) => `Estimated for ${size}`,
    byWeight: (size: string) =>
      `Sold by weight: we charge for the weight we pack, within 10% of ${size}, and confirm your total at delivery.`,
    outToday:
      "Out of stock today. Check back tomorrow, or see similar items below.",
    info: "Product information",
    details: "Product details",
    ingredients: "Allergens",
    contains: (allergens: string) => `Contains: ${allergens}.`,
    noAllergens:
      "No allergens listed. Check the pack before eating if you have an allergy.",
    storage: "Storage and handling",
    storageText: {
      ambient: "Store in a cool, dry place.",
      chilled: "Keep chilled between 0 and 4 °C.",
      frozen: "Keep frozen at -18 °C or colder.",
    },
    moreFrom: (category: string) => `More from ${category}`,
    noSimilar: "No similar items yet.",
    loading: "Loading product",
    saveToList: "Save to a list",
    saved: "Saved.",
    signInForAlert: "Sign in to get a message when it's back",
    alertOn: "We'll message you when it's back.",
    alertOff: "No need, stop the alert",
    alertAsk: "Tell me when it's back",
    addToCart: "Add to cart",
  },
  cart: {
    title: "Your cart",
    close: "Close cart",
    itemsInCart: "Items in your cart",
    unavailable: (n: number) =>
      n === 1
        ? "1 item in your cart is no longer sold, so we left it out."
        : `${n} items in your cart are no longer sold, so we left them out.`,
    empty: "Your cart is empty",
    emptyHint: "Start with today's fresh picks.",
    startShopping: "Start shopping",
    sameDay: "Same-day delivery in 2-hour slots. Choose yours at checkout.",
    change: "Change",
    checkout: (total: string) => `Checkout, ${total}`,
    seeFullCart: "See full cart",
    orderSummary: "Order summary",
    heldUntil: (time: string) => `Held for you until ${time}`,
    deliverTo: (label: string, barangay: string) => `To ${label}, ${barangay}`,
    subtotal: "Subtotal",
    voucherLine: (code: string) => `Voucher ${code}`,
    discount: "Discount",
    delivery: "Delivery",
    atCheckout: "At checkout",
    free: "Free",
    estimatedTotal: "Estimated total",
    total: "Total",
    belowMinimum: (amount: string) =>
      `Add ${amount} more to reach the minimum order.`,
    freeDeliveryIn: (amount: string) => `Add ${amount} more for free delivery.`,
    feeLater: "We show the delivery fee once we know your address.",
    weighedNote:
      "Items sold by weight are charged for the weight we pack, so your total may change a little.",
    each: (pack: string, price: string) => `${pack}, ${price} each`,
    finalByWeight: "Charged for the weight we pack.",
    remove: (name: string) => `Remove ${name}`,
    notInTotal: "Not in total",
    outToday: "Out of stock today, so it is not in your total.",
    runningLow: (n: number) => `Running low. We may not have all ${n}.`,
    priceUp: (was: string) => `Price went up from ${was}.`,
    priceDown: (was: string) => `Price dropped from ${was}.`,
    notePrompt: "Add a note for your picker",
    noteShown: (note: string) => `Note: ${note}`,
    noteLabel: "Note for your picker",
    save: "Save",
    removed: (name: string) => `${name} removed from cart`,
    inCart: (name: string, n: number) => `${name}, ${n} in cart`,
    saveAsList: "Save this cart as a list",
    savedAsList: "Saved every item to the list.",
    substitution: {
      allow: {
        label: "Pick a similar item",
        hint: "Our picker chooses the closest match.",
      },
      preferred: {
        label: "I'll choose",
        hint: "Tell us which item to use instead.",
      },
      none: {
        label: "No substitute",
        hint: "Leave it out and you are not charged for it.",
      },
      ifOut: (name: string) => ` if ${name} is out of stock. Change`,
      legend: "If this is out of stock",
      useInstead: "Use this instead",
      loading: "Loading items",
      choose: "Choose an item",
    },
    voucher: {
      prompt: "Have a Voucher code?",
      apply: "Apply",
      remove: "Remove",
      label: "Voucher",
      short: (amount: string) => `Add ${amount} more to use it.`,
      freeDelivery: "Free delivery.",
      off: (amount: string) => `${amount} off.`,
    },
    // What a Cart action can answer besides the Cart (ADR 0009 reasons).
    notices: {
      invalid: "That didn't work.",
      busy: "Too many new carts from your network. Please try again later.",
      sold_out: "Sorry, that just sold out.",
      not_sold: "Sorry, that item is no longer sold.",
      capped: "That is all we have for now.",
      pick_item: "Please pick an item.",
      note_too_long: `Notes can be up to ${MAX_NOTE_LENGTH} characters.`,
      not_found: "We don't know that code. Check it and try again.",
      not_started: "This Voucher hasn't started yet.",
      ended: "This Voucher has ended.",
      not_yours: "This Voucher belongs to another account.",
      first_order_only: "This Voucher is for a first order only.",
      used_up: "This Voucher has been fully used.",
      used_by_you: "You've already used this Voucher.",
      sign_in: "Sign in to use a Voucher.",
      empty_cart: "Add something to your cart first.",
      gone: "This Recipe is no longer available.",
    },
    failed: {
      generic: "That didn't work. Please try again.",
      update: "We couldn't update your cart. Please try again.",
      save: "We couldn't save that. Please try again.",
      note: "We couldn't save your note. Please try again.",
      fill: "We couldn't add these. Please try again.",
    },
    adding: "Adding...",
    /** "Added 5 items to your cart. Sorry, X just sold out." (ADR 0013, 0014) */
    filled: (added: number, soldOut: string[], capped: string[]) =>
      [
        added > 0
          ? `Added ${added} ${items(added)} to your cart.`
          : "Nothing was added.",
        soldOut.length ? `Sorry, ${list(soldOut)} just sold out.` : "",
        capped.length
          ? `We added all we have of ${list(capped)}: there are only a few left.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    unknownItem: "an item no longer sold",
  },
  checkout: {
    title: "Checkout",
    whereTo: "Where should we deliver?",
    deliverHere: "Deliver here",
    firstLabel: "Home",
    elsewhere: "Deliver somewhere else? Add an address",
    addressPanel: "Delivery address",
    deliverTo: "Deliver to",
    landmark: (landmark: string) => `Landmark: ${landmark}`,
    zoneFee: (zone: string, fee: string) => `Delivery to ${zone}: ${fee}.`,
    freeForOrder: "free for this order",
    outOfZone: "We don't deliver to this address yet. Please choose another.",
    edit: (label: string) => `Edit ${label}`,
    mobile: "Mobile number",
    mobileHint: "The Rider calls this number on arrival.",
    riderNote: "Note for the Rider (optional)",
    slotPanel: "Delivery slot",
    noSlots: "No delivery slots are open right now. Please check back soon.",
    day: "Delivery day",
    time: "Delivery time",
    chosen: "Chosen",
    full: "Full",
    few: "Only a few left",
    available: "Available",
    paymentPanel: "Payment",
    paymentMethod: "Payment method",
    methods: {
      gcash: {
        name: "GCash",
        hint: "You approve the payment in the GCash app",
      },
      card: {
        name: "Credit or debit card",
        hint: "Visa and Mastercard, entered on our payment partner's secure page",
      },
      cod: {
        name: "Cash on delivery",
        hint: "Pay the Rider when your order arrives",
      },
    },
    comingSoon: "GCash and card payments are coming soon.",
    weighedOnline:
      "Items sold by weight are charged for the weight we pack. You pay this estimate now, and we refund any difference within a day.",
    weighedCash:
      "Items sold by weight are charged for the weight we pack, so the cash you pay may change a little.",
    lineDetail: (quantity: number, weighed: boolean, substitution: string) =>
      `Quantity ${quantity}${weighed ? ", by weight" : ""}. ${substitution}.`,
    soldOut: "Sold out",
    vat: "VAT included.",
    belowMinimum: (amount: string) =>
      `Add ${amount} more to reach the minimum order for this area.`,
    opening: "Opening payment page...",
    placing: "Placing your order...",
    place: (total: string) => `Place order, ${total}`,
    payNext: "Next, you pay on our payment partner's secure page.",
    chooseSlot: "Choose a delivery slot to continue.",
    changeItems: "Change items",
    // Why a Slot could not be held.
    hold: {
      empty_cart: "Your cart is empty.",
      out_of_zone: "Please choose an address we deliver to.",
      full: "That slot just filled up. Please choose another.",
      closed: "That slot is no longer open. Please choose another.",
    },
    onlineOff:
      "Paying online is not available right now. Please choose cash on delivery.",
    tooMany:
      "You've placed several orders just now. Please wait a while, or contact us for help.",
    // Why an Order was not placed (placeOrder reasons).
    refused: {
      total_changed: (total: string) =>
        `Prices changed while you were checking out. Your total is now ${total}. Please check it and place your order again.`,
      below_minimum: (amount: string) =>
        `Add ${amount} more to reach the minimum order for this area.`,
      out_of_stock: "Sorry, some items just sold out. Please check your cart.",
      slot_unavailable:
        "That delivery slot just filled up. Please choose another.",
      invalid_phone: "Please enter a mobile number like 0917 123 4567.",
      out_of_zone:
        "We don't deliver to this address yet. Please choose another.",
      address_not_found: "Please choose a delivery address.",
      empty_cart: "Your cart is empty.",
      nothing_in_stock:
        "Sorry, everything in your cart just sold out. Please choose other items.",
      cart_changed:
        "Your cart changed in another tab. Please check it and place your order again.",
      too_many_open_orders:
        "You already have several orders on the way. Please wait for one to arrive, or cancel one first.",
      over_cod_limit: (limit: string) =>
        `Cash on delivery orders can be up to ${limit}. Please remove some items or split your order.`,
      already_placed:
        "This cart was already ordered. You can find it under your orders.",
      invalid: "Please choose a delivery slot.",
      voucher_unavailable: (problem: string) =>
        `${problem} Remove the Voucher to place your order.`,
    },
  },
  pay: {
    title: "Payment",
    cancelledTitle: "This order was cancelled",
    cancelledBody: (orderNo: string) =>
      `Order ${orderNo} was cancelled, so there is nothing to pay.`,
    goToCart: "Go to your cart",
    by: { card: "your card", gcash: "GCash" },
    paidTitle: "Checking your payment",
    paidBody: (by: string, total: string) =>
      `We're waiting for ${by} to confirm ${total}. This usually takes a few seconds, and this page updates by itself.`,
    busyTitle: "Your payment is still going through",
    busyBody: (by: string) =>
      `We'll confirm your order as soon as ${by} does. This page updates by itself.`,
    cancelledBackTitle: "Your payment didn't go through",
    cancelledBackBody:
      "You can try again, or go back to your cart to change something.",
    errorTitle: "We couldn't open the payment page",
    errorBody: "Please try again in a moment.",
    waitingTitle: "Pay to confirm your order",
    waitingBody: (total: string) => `Your order is waiting for ${total}.`,
    order: (orderNo: string) => `Order ${orderNo}`,
    holding: "We're holding your items and delivery slot until",
    payNow: (total: string) => `Pay ${total} now`,
    goingBack: "Going back...",
    backToCart: "Back to cart",
  },
  confirmed: {
    title: "Order confirmed",
    heading: "Salamat! Your order is in.",
    number: "Order number",
    sentTo: (email: boolean) =>
      `We sent the details to ${email ? "your email and phone" : "your phone"}.`,
    cashAbout: (total: string) =>
      `Please have about ${total} ready in cash. Items sold by weight are charged for the weight we pack.`,
    cash: (total: string) =>
      `Please have ${total} ready in cash for the Rider.`,
    paid: (total: string, method: "gcash" | "card") =>
      `Paid ${total} ${method === "gcash" ? "with GCash" : "by card"}.`,
    track: "Track your order",
  },
  order: {
    title: "Track your order",
    number: (orderNo: string) => `Order ${orderNo}`,
    onItsWay: (rider: string) => `On its way with ${rider}`,
    call: (phone: string) => `Call ${phone}`,
    pin: "Give the Rider this PIN at the door:",
    finishPaying: "Finish paying",
    reorder: "Reorder these items",
    cancelHint: "Changed your mind? You can cancel until we start picking.",
    cancel: "Cancel order",
    progress: "Order progress",
    steps: {
      confirmed: "Order confirmed",
      picking: "Picking your items",
      picked: "Ready for the Rider",
      out_for_delivery: "On the way",
      delivered: "Delivered",
    },
    notYet: " (not yet)",
    cancelled: "This order was cancelled.",
    failed: "We couldn't deliver this order. We'll contact you to try again.",
    slot: "Delivery slot",
    deliverTo: "Deliver to",
    landmark: (landmark: string) => `Landmark: ${landmark}`,
    payment: "Payment",
    methods: { cod: "Cash on delivery", gcash: "GCash", card: "Card" },
    online: "Online",
    mobile: "Mobile number",
    items: "Items",
    lineDetail: (quantity: number, price: string, weighed: boolean) =>
      `${quantity} x ${price}${weighed ? ", by weight" : ""}`,
    subtotal: "Subtotal",
    discount: "Discount",
    delivery: "Delivery",
    free: "Free",
    estimatedTotal: "Estimated total",
    total: "Total",
    finalTotal: "Final total, as packed",
    refund: (method: "card" | "gcash") =>
      `Refund to your ${method === "card" ? "card" : "GCash"}`,
    vat: (amount: string) => `VAT included (${amount}).`,
    weighedNote:
      " Items sold by weight are charged for the weight we pack, so the final amount may change a little.",
  },
};

export type Messages = typeof en;
