import type { Lang } from "@/i18n/lang";

// What our emails and texts say, in the Customer's language (ADR 0021).
// Kept here, not in src/i18n: those dictionaries ship to every browser
// page, these words only leave the server as messages. Senders add the
// "Hoshimono: " in front of each text. The Filipino is Claude's draft in
// everyday Taglish; a native speaker checks it before launch.

type PayWay = "gcash" | "card";

const en = {
  greet: (first: string) => `Hi ${first || "there"},`,
  orderConfirmed: {
    subject: (orderNo: string) => `Order ${orderNo} is confirmed`,
    thanks: (orderNo: string) => `Salamat! We got your order ${orderNo}.`,
    delivery: (slot: string) => `Delivery: ${slot}`,
    aboutCash: (total: string) =>
      `Please have about ${total} ready in cash. The final amount follows the weight we pack.`,
    aboutPaid: (total: string) =>
      `Estimated total ${total}. The final amount follows the weight we pack.`,
    cash: (total: string) =>
      `Please have ${total} ready in cash for the Rider.`,
    paid: (total: string) => `Total ${total}.`,
    track: (url: string) => `Track your order: ${url}`,
    sms: (orderNo: string, slot: string, pay: string, url: string) =>
      `order ${orderNo} is confirmed for ${slot}. ${pay} Track: ${url}`,
  },
  substitution: {
    subject: (orderNo: string) => `A substitute for order ${orderNo}`,
    offer: (
      ordered: string,
      orderNo: string,
      quantity: number,
      substitute: string,
      unitPrice: string
    ) =>
      `We're out of ${ordered} for order ${orderNo}. We can send ${quantity} x ${substitute} at ${unitPrice} each instead.`,
    ask: (until: string, link: string) =>
      `Not okay? Tell us by ${until}: ${link}. No reply means yes.`,
  },
  outForDelivery: {
    subject: (orderNo: string) => `Order ${orderNo} is on its way`,
    onItsWay: (orderNo: string, rider: string) =>
      `Order ${orderNo} is on its way with ${rider}.`,
    pin: (pin: string) => `Give the Rider this PIN at the door: ${pin}.`,
    cash: (amount: string) => `Please have ${amount} ready in cash.`,
    track: (url: string) => `Track: ${url}`,
  },
  orderCancelled: {
    subject: (orderNo: string) => `Order ${orderNo} is cancelled`,
    text: (orderNo: string) =>
      `We're sorry, we had to cancel order ${orderNo}. If you paid online, all of it comes back to you, and we'll tell you when it's sent.`,
  },
  deliveryFailed: {
    subject: (orderNo: string) => `We missed you: order ${orderNo}`,
    text: (orderNo: string) =>
      `Sorry, we could not deliver order ${orderNo}. We will call you to arrange another try.`,
  },
  refund: {
    subject: (orderNo: string) => `Refund for order ${orderNo}`,
    to: { gcash: "your GCash", card: "your card" } satisfies Record<
      PayWay,
      string
    >,
    cancelled: (amount: string, to: string, orderNo: string) =>
      `We refunded ${amount} to ${to} for your cancelled order ${orderNo}.`,
    picked: (amount: string, to: string, orderNo: string) =>
      `Your order ${orderNo} came to less than you paid, so we refunded the ${amount} difference to ${to}.`,
    late_payment: (amount: string, to: string, orderNo: string) =>
      `Your payment for order ${orderNo} arrived after the order was cancelled, so we refunded all ${amount} to ${to}.`,
    when: {
      gcash: "It usually shows within a day.",
      card: "It can take a few banking days to show on your card.",
    } satisfies Record<PayWay, string>,
    order: (url: string) => `Your order: ${url}`,
  },
  claim: {
    subject: (orderNo: string) => `About your report on order ${orderNo}`,
    approved: (product: string, orderNo: string) =>
      `We approved your report on ${product} (order ${orderNo}).`,
    rejected: (product: string, orderNo: string) =>
      `We could not approve your report on ${product} (order ${orderNo}).`,
    to: { gcash: "GCash", card: "your card" } satisfies Record<PayWay, string>,
    refunding: (amount: string, to: string) =>
      `We are refunding ${amount} to ${to}.`,
    voucher: (amount: string, code: string, until: string) =>
      `Here is ${amount} off your next order: use code ${code} until ${until}, no minimum spend.`,
  },
  cartReminder: {
    subject: "Your cart is waiting",
    left: (first: string) =>
      `Hi ${first || "there"}, you left these in your cart:`,
    more: (n: number) => `and ${n} more`,
    checkout: (url: string) => `Pick a delivery slot and check out: ${url}`,
    stop: (url: string) => `Do not want these emails? ${url}`,
  },
  backInStock: {
    subject: (product: string) => `${product} is back`,
    line: (product: string) => `${product} is back in stock.`,
    asked: "You asked us to tell you.",
    add: (url: string) => `Add it to your cart: ${url}`,
  },
  referral: {
    subject: (amount: string) => `${amount} off your next order`,
    referrer: (friend: string) =>
      `${friend || "A friend"} got their first Hoshimono order, thanks to you.`,
    referee: "Your first Hoshimono order arrived. Welcome!",
    voucher: (amount: string, code: string, minSpend: string, until: string) =>
      `Here is ${amount} off your next order: use code ${code} on orders of ${minSpend} or more, until ${until}.`,
  },
  voucherGiven: {
    subject: (amount: string) => `${amount} off your next order`,
    text: (orderNo: string, amount: string, code: string, until: string) =>
      `Sorry about order ${orderNo}. Here's ${amount} off your next order with code ${code}, until ${until}.`,
  },
  slotMoved: (orderNo: string, slot: string) =>
    `Order ${orderNo} now arrives ${slot}. Sorry for the change.`,
};

const fil: typeof en = {
  greet: (first) => (first ? `Hi ${first},` : "Hi,"),
  orderConfirmed: {
    subject: (orderNo) => `Kumpirmado na ang order ${orderNo}`,
    thanks: (orderNo) => `Salamat! Natanggap namin ang order mo, ${orderNo}.`,
    delivery: (slot) => `Delivery: ${slot}`,
    aboutCash: (total) =>
      `Maghanda ng mga ${total} na cash. Depende ang final na halaga sa timbang na ini-pack namin.`,
    aboutPaid: (total) =>
      `Tantiyang total: ${total}. Depende ang final na halaga sa timbang na ini-pack namin.`,
    cash: (total) => `Maghanda ng ${total} na cash para sa Rider.`,
    paid: (total) => `Total: ${total}.`,
    track: (url) => `Subaybayan ang order mo: ${url}`,
    sms: (orderNo, slot, pay, url) =>
      `Kumpirmado na ang order ${orderNo}. Delivery: ${slot}. ${pay} Track: ${url}`,
  },
  substitution: {
    subject: (orderNo) => `May kapalit para sa order ${orderNo}`,
    offer: (ordered, orderNo, quantity, substitute, unitPrice) =>
      `Ubos ang ${ordered} para sa order ${orderNo}. Puwede naming ipalit ang ${quantity} x ${substitute}, ${unitPrice} bawat isa.`,
    ask: (until, link) =>
      `Hindi okay? Sabihan kami hanggang ${until}: ${link}. Kapag walang reply, ipapalit na namin.`,
  },
  outForDelivery: {
    subject: (orderNo) => `Papunta na ang order ${orderNo}`,
    onItsWay: (orderNo, rider) =>
      `Papunta na ang order ${orderNo} kasama si ${rider}.`,
    pin: (pin) => `Ibigay ang PIN na ito sa Rider sa pinto: ${pin}.`,
    cash: (amount) => `Maghanda ng ${amount} na cash.`,
    track: (url) => `Track: ${url}`,
  },
  orderCancelled: {
    subject: (orderNo) => `Na-cancel ang order ${orderNo}`,
    text: (orderNo) =>
      `Pasensya na, kinailangan naming i-cancel ang order ${orderNo}. Kung nagbayad ka online, ibabalik namin lahat, at sasabihan ka namin kapag naipadala na.`,
  },
  deliveryFailed: {
    subject: (orderNo) => `Hindi ka namin naabutan: order ${orderNo}`,
    text: (orderNo) =>
      `Pasensya na, hindi namin naihatid ang order ${orderNo}. Tatawagan ka namin para i-schedule ulit.`,
  },
  refund: {
    subject: (orderNo) => `Refund para sa order ${orderNo}`,
    to: { gcash: "GCash mo", card: "card mo" },
    cancelled: (amount, to, orderNo) =>
      `Ibinalik namin ang ${amount} sa ${to} para sa na-cancel mong order ${orderNo}.`,
    picked: (amount, to, orderNo) =>
      `Mas mababa ang naging total ng order ${orderNo} kaysa sa ibinayad mo, kaya ibinalik namin ang ${amount} na sobra sa ${to}.`,
    late_payment: (amount, to, orderNo) =>
      `Dumating ang bayad mo para sa order ${orderNo} nang na-cancel na ito, kaya ibinalik namin ang buong ${amount} sa ${to}.`,
    when: {
      gcash: "Karaniwang pumapasok ito sa loob ng isang araw.",
      card: "Puwedeng abutin ng ilang banking day bago ito lumabas sa card mo.",
    },
    order: (url) => `Ang order mo: ${url}`,
  },
  claim: {
    subject: (orderNo) => `Tungkol sa report mo sa order ${orderNo}`,
    approved: (product, orderNo) =>
      `Inaprubahan namin ang report mo sa ${product} (order ${orderNo}).`,
    rejected: (product, orderNo) =>
      `Hindi namin naaprubahan ang report mo sa ${product} (order ${orderNo}).`,
    to: { gcash: "GCash mo", card: "card mo" },
    refunding: (amount, to) => `Ibinabalik namin ang ${amount} sa ${to}.`,
    voucher: (amount, code, until) =>
      `Heto ang ${amount} na bawas sa susunod mong order: gamitin ang code na ${code} hanggang ${until}, walang minimum.`,
  },
  cartReminder: {
    subject: "Naghihintay ang cart mo",
    left: (first) =>
      first
        ? `Hi ${first}, naiwan mo ang mga ito sa cart mo:`
        : "Naiwan mo ang mga ito sa cart mo:",
    more: (n) => `at ${n} pa`,
    checkout: (url) => `Pumili ng delivery slot at mag-checkout: ${url}`,
    stop: (url) => `Ayaw mo na ng ganitong email? ${url}`,
  },
  backInStock: {
    subject: (product) => `Meron na ulit: ${product}`,
    line: (product) => `May stock na ulit ang ${product}.`,
    asked: "Ito na ang alert na hiningi mo.",
    add: (url) => `Idagdag sa cart mo: ${url}`,
  },
  referral: {
    subject: (amount) => `${amount} bawas sa susunod mong order`,
    referrer: (friend) =>
      `Dumating na ang unang Hoshimono order ${friend ? `ni ${friend}` : "ng kaibigan mo"}, salamat sa 'yo.`,
    referee: "Dumating na ang una mong Hoshimono order. Welcome!",
    voucher: (amount, code, minSpend, until) =>
      `Heto ang ${amount} na bawas sa susunod mong order: gamitin ang code na ${code} sa order na ${minSpend} pataas, hanggang ${until}.`,
  },
  voucherGiven: {
    subject: (amount) => `${amount} bawas sa susunod mong order`,
    text: (orderNo, amount, code, until) =>
      `Pasensya na sa order ${orderNo}. Heto ang ${amount} na bawas sa susunod mong order gamit ang code na ${code}, hanggang ${until}.`,
  },
  slotMoved: (orderNo, slot) =>
    `Bagong oras ng order ${orderNo}: ${slot}. Pasensya na sa abala.`,
};

export const WORDS: Record<Lang, typeof en> = { en, fil };
