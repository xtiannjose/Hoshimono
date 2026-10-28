import { MAX_NOTE_LENGTH } from "@/lib/cart-limits";

import type { Messages } from "./en";

// Filipino words for the shop (ADR 0017): everyday Taglish, Claude's draft.
// A native speaker checks these before launch.

// Taglish keeps the English plural.
const items = (n: number) => (n === 1 ? "item" : "items");

const list = (names: string[]) =>
  names.length < 3
    ? names.join(" at ")
    : `${names.slice(0, -1).join(", ")} at ${names.at(-1)}`;

export const fil: Messages = {
  items,
  shell: {
    skipToContent: "Lumaktaw sa nilalaman",
    searchLabel: "Maghanap ng grocery",
    searchPlaceholder: "Maghanap ng grocery at brand",
    suggestions: "Mga mungkahi",
    suggestionGroups: {
      product: "Mga produkto",
      category: "Mga kategorya",
      brand: "Mga brand",
    },
    account: "Account",
    toggleTheme: "Palitan ang dark mode",
    categories: "Mga kategorya",
    recipes: "Mga recipe",
    tipsAndGuides: "Tips at gabay",
    help: "Tulong",
    moreFrom: (brand) => `Iba pa sa ${brand}`,
    about: "Online na supermarket para sa Metro Manila.",
    deliverTo: "Ihatid sa",
    chooseArea: "Piliin ang lugar mo",
    addAddress: "Ilagay ang address mo",
    deliverToPlace: (label, barangay) => `Ihatid sa ${label}, ${barangay}`,
    nextSlot: (slot) => `Susunod: ${slot}`,
    noSlots: "Walang bukas na slot",
    cart: "Cart",
    viewCart: "Tingnan ang cart",
    otherLanguage: { short: "EN", long: "Read in English" },
  },
  app: {
    offlineTitle: "Offline ka",
    offlineBody:
      "Gumagana pa rin ang mga page na nabuksan mo na. Kailangan ng internet para mag-order, magbayad at sa account mo.",
    retry: "Subukan ulit",
    offlineNote:
      "Offline ka. Baka nagbago na ang presyo at stock mula nang ma-save ang page na ito.",
    install: "I-install ang app",
  },
  notFound: {
    title: "Hindi namin makita ang page na 'yan",
    body: "Baka luma na ang link, o hindi na namin ito binebenta. Subukang maghanap na lang.",
    home: "Bumalik sa home",
  },
  error: {
    title: "Hindi nag-load ang page na ito",
    body: "May nagkaproblema sa amin. Pakisubukan ulit.",
    retry: "Subukan ulit",
  },
  dates: { today: "Ngayon", tomorrow: "Bukas", to: "hanggang" },
  product: {
    add: "Idagdag",
    addToCart: (name) => `Idagdag ang ${name} sa cart`,
    quantityOf: (name) => `Dami ng ${name}`,
    addOne: "Dagdagan ng isa",
    removeOne: "Bawasan ng isa",
    save: (percent) => `Tipid ${percent}%`,
    byWeight: "Ayon sa timbang",
    out: "Ubos na ngayong araw",
    low: "Kaunti na lang",
    inStock: "May stock",
    about: "Mga ",
    was: "dati ",
    loading: "Kinukuha ang mga produkto",
    approx: (size) => `mga ${size}`,
    pieces: (n) => `${n} ${n === 1 ? "pc" : "pcs"}`,
    basis: {
      per_100g: "bawat 100 g",
      per_litre: "bawat litro",
      per_piece: "bawat piraso",
    },
    count: (n) => `${n} ${n === 1 ? "produkto" : "na produkto"}`,
  },
  home: {
    description:
      "Sariwang grocery na ihahatid sa parehong araw sa buong Metro Manila. Pumili ng 2-hour delivery slot at magbayad ng cash pagdating.",
    title: "Ano ang kailangan mo ngayon?",
    delivery: "Delivery",
    coverage: (areas, fee, free) =>
      `Same-day delivery sa ${list(areas)}, sa 2-hour slots. ${fee} ang delivery${free ? `, libre kapag lampas ${free}` : ""}.`,
    whereWeDeliver: "Tingnan kung saan kami naghahatid",
    deliverTo: (label, barangay) => `Ihatid sa ${label}, ${barangay}`,
    nextSlot: (slot) => `Susunod na slot: ${slot}`,
    noSlot: "Walang bukas na slot sa ngayon",
    fee: (fee, free) =>
      free
        ? `${fee} ang delivery, libre kapag lampas ${free}`
        : `${fee} ang delivery`,
    notServed: "Hindi pa kami naghahatid sa naka-save mong address.",
    addAddress: "Ilagay ang address mo para makita ang susunod mong slot.",
    change: "Palitan",
    categories: "Mamili ayon sa kategorya",
    recipes: "Mga recipe",
    freshPicks: "Sariwang pili ngayong araw",
    seeAllFresh: "Tingnan lahat ng prutas at gulay",
    noFresh: "Walang sariwang pili na maipapakita sa ngayon.",
    browseFresh: "Tingnan ang prutas at gulay",
    buyAgain: "Bilhin ulit",
    onSale: "Naka-sale ngayong linggo",
  },
  breadcrumb: { label: "Breadcrumb", home: "Home" },
  help: {
    title: "Tulong",
    description: "Delivery, bayad, kapalit at refund sa Hoshimono.",
    intro:
      "Mabilis na sagot tungkol sa delivery, bayad, at kung ano ang mangyayari kapag may problema.",
    questions: [
      {
        q: "Saan at kailan kayo naghahatid?",
        a: "Sa parehong araw, sa 2-hour slots, sa mga lugar na nasa delivery page namin. Pipili ka ng slot sa checkout at ire-reserve namin ito nang 10 minuto habang tinatapos mo.",
      },
      {
        q: "Paano ako magbabayad?",
        a: "Cash on delivery: bayaran ang Rider sa pinto mo. Kapag inaalok sa checkout, puwede ka ring magbayad nang maaga sa GCash o card.",
      },
      {
        q: "Paano kung maubusan ng isang item?",
        a: "Bawat item sa cart mo ay may bilin: pumili ng kapareho, gamitin ang pinili mo, o huwag nang isama. Hindi ka sisingilin sa item na hindi mo natanggap.",
      },
      {
        q: "Paano sinisingil ang mga item na binebenta ayon sa timbang?",
        a: "Ang karne, isda at ilang gulay at prutas ay sinisingil ayon sa timbang na ini-pack namin, pasok sa 10% ng in-order mo. Makikita ang final total sa order page mo.",
      },
      {
        q: "May dumating na sira o hindi sariwa. Ano ang gagawin ko?",
        a: "I-report ito mula sa order page mo sa loob ng 24 oras, may kasamang litrato. Kapag inaprubahan namin, ibabalik namin ang bayad sa GCash o card mo, o bibigyan ka ng Voucher para sa cash na order.",
      },
      {
        q: "Puwede ko bang i-cancel ang order?",
        a: "Oo, mula sa order page mo, hangga't hindi pa namin sinisimulang i-pick.",
      },
    ],
    deliveryAreas: "Tingnan kung saan kami naghahatid",
    orders: "Ang mga order mo",
    contact: "May tanong pa? I-email kami sa",
  },
  listing: {
    notFound: "Walang ganitong kategorya",
    description: (name) =>
      `Mamili ng ${name.toLowerCase()} na may same-day delivery sa Metro Manila.`,
    filters: "Mga filter",
    products: "Mga produkto",
    categories: "Mga kategorya",
    dietary: "Diyeta",
    price: "Presyo",
    min: "Min ₱",
    max: "Max ₱",
    to: "hanggang",
    brand: "Brand",
    apply: "I-apply ang filter",
    clear: "Alisin ang filter",
    noMatch: "Walang produktong tugma sa mga filter na ito.",
    emptyCategory: "Wala pang laman dito. Malapit na naming lagyan ito.",
    pages: "Mga pahina",
    showing: (first, last, total) =>
      `Ipinapakita ang ${first} hanggang ${last} sa ${total}`,
    previous: "Nakaraan",
    next: "Susunod",
    sort: "Ayusin",
    sorts: {
      featured: "Tampok",
      price_asc: "Presyo, mababa hanggang mataas",
      price_desc: "Presyo, mataas hanggang mababa",
      unit_price_asc: "Unit price, mababa hanggang mataas",
    },
  },
  search: {
    title: "Maghanap",
    askTitle: "Ano ang hinahanap mo?",
    askBody:
      "Mag-type ng produkto, brand o Filipino na pangalan sa search box, tulad ng gatas, Alaska o pandesal.",
    noneTitle: (query) => `Walang resulta para sa “${query}”`,
    noneBody:
      "I-check ang spelling, gumamit ng mas kaunting salita, o subukan ang English o Filipino na pangalan (milk o gatas). Puwede ka ring mag-browse ng kategorya:",
    resultsFor: (query) => `Mga resulta para sa “${query}”`,
    corrected: (query, corrected) =>
      `Wala kaming nakitang “${query}”, kaya “${corrected}” ang hinanap namin. `,
  },
  productPage: {
    notFound: "Walang ganitong produkto",
    description: (name, size, price) =>
      `${name}, ${size}, ${price}. Same-day delivery sa Metro Manila.`,
    estimatedFor: (size) => `Tantiya para sa ${size}`,
    byWeight: (size) =>
      `Binebenta ayon sa timbang: sinisingil namin ang timbang na ini-pack namin, pasok sa 10% ng ${size}, at kinukumpirma ang total mo sa delivery.`,
    outToday:
      "Ubos na ngayong araw. Bumalik bukas, o tingnan ang mga kapareho sa ibaba.",
    info: "Impormasyon ng produkto",
    details: "Detalye ng produkto",
    ingredients: "Mga allergen",
    contains: (allergens) => `May ${allergens}.`,
    noAllergens:
      "Walang nakalistang allergen. I-check ang pakete bago kainin kung may allergy ka.",
    storage: "Pag-iimbak",
    storageText: {
      ambient: "Itago sa malamig at tuyong lugar.",
      chilled: "Ilagay sa ref, 0 hanggang 4 °C.",
      frozen: "Itago sa freezer, -18 °C o mas malamig.",
    },
    moreFrom: (category) => `Iba pa mula sa ${category}`,
    noSimilar: "Wala pang kaparehong item.",
    loading: "Kinukuha ang produkto",
    saveToList: "I-save sa isang list",
    saved: "Na-save na.",
    signInForAlert: "Mag-sign in para ma-message ka kapag meron na ulit",
    alertOn: "Ime-message ka namin kapag meron na ulit.",
    alertOff: "Huwag na, itigil ang alert",
    alertAsk: "Sabihan ako kapag meron na ulit",
    addToCart: "Idagdag sa cart",
  },
  cart: {
    title: "Ang cart mo",
    close: "Isara ang cart",
    itemsInCart: "Mga item sa cart mo",
    unavailable: (n) =>
      `May ${n} ${items(n)} sa cart mo na hindi na namin binebenta, kaya hindi na namin isinama.`,
    empty: "Wala pang laman ang cart mo",
    emptyHint: "Magsimula sa mga sariwang pili ngayong araw.",
    startShopping: "Mamili na",
    sameDay: "Same-day delivery sa 2-hour slots. Pumili ng oras sa checkout.",
    change: "Palitan",
    checkout: (total) => `Checkout, ${total}`,
    seeFullCart: "Tingnan ang buong cart",
    orderSummary: "Buod ng order",
    heldUntil: (time) => `Naka-reserve para sa 'yo hanggang ${time}`,
    deliverTo: (label, barangay) => `Papunta sa ${label}, ${barangay}`,
    subtotal: "Subtotal",
    voucherLine: (code) => `Voucher ${code}`,
    discount: "Discount",
    delivery: "Delivery",
    atCheckout: "Sa checkout",
    free: "Libre",
    estimatedTotal: "Tantiyang total",
    total: "Total",
    belowMinimum: (amount) =>
      `Magdagdag pa ng ${amount} para maabot ang minimum order.`,
    freeDeliveryIn: (amount) =>
      `Magdagdag pa ng ${amount} para libre ang delivery.`,
    feeLater:
      "Ipapakita namin ang delivery fee kapag alam na namin ang address mo.",
    weighedNote:
      "Ang mga item na binebenta ayon sa timbang ay sinisingil ayon sa timbang na ini-pack namin, kaya puwedeng magbago nang kaunti ang total mo.",
    each: (pack, price) => `${pack}, ${price} bawat isa`,
    finalByWeight: "Sinisingil ayon sa timbang na ini-pack namin.",
    remove: (name) => `Alisin ang ${name}`,
    notInTotal: "Hindi kasama sa total",
    outToday: "Ubos na ngayong araw, kaya hindi kasama sa total mo.",
    runningLow: (n) => `Paubos na. Baka hindi namin makumpleto ang ${n}.`,
    priceUp: (was) => `Tumaas ang presyo mula ${was}.`,
    priceDown: (was) => `Bumaba ang presyo mula ${was}.`,
    notePrompt: "Mag-iwan ng note para sa picker mo",
    noteShown: (note) => `Note: ${note}`,
    noteLabel: "Note para sa picker mo",
    save: "I-save",
    removed: (name) => `Inalis ang ${name} sa cart`,
    inCart: (name, n) => `${name}, ${n} sa cart`,
    saveAsList: "I-save ang cart na ito bilang list",
    savedAsList: "Na-save ang lahat ng item sa list.",
    substitution: {
      allow: {
        label: "Pumili ng kapareho",
        hint: "Ang picker namin ang pipili ng pinakamalapit.",
      },
      preferred: {
        label: "Ako ang pipili",
        hint: "Sabihin kung anong item ang ipapalit.",
      },
      none: {
        label: "Walang kapalit",
        hint: "Huwag nang isama, at hindi ka sisingilin dito.",
      },
      ifOut: (name) => ` kung maubusan ng ${name}. Palitan`,
      legend: "Kung maubusan nito",
      useInstead: "Ito na lang ang gamitin",
      loading: "Kinukuha ang mga item",
      choose: "Pumili ng item",
    },
    voucher: {
      prompt: "May Voucher code ka?",
      apply: "Gamitin",
      remove: "Alisin",
      label: "Voucher",
      short: (amount) => `Magdagdag pa ng ${amount} para magamit ito.`,
      freeDelivery: "Libreng delivery.",
      off: (amount) => `${amount} bawas.`,
    },
    notices: {
      invalid: "Hindi gumana iyon.",
      busy: "Masyadong maraming bagong cart mula sa network mo. Pakisubukan ulit mamaya.",
      sold_out: "Pasensya na, kakaubos lang niyan.",
      not_sold: "Pasensya na, hindi na namin binebenta ang item na 'yan.",
      capped: "Iyan na lang ang meron kami sa ngayon.",
      pick_item: "Pumili ng item.",
      note_too_long: `Hanggang ${MAX_NOTE_LENGTH} character lang ang note.`,
      not_found:
        "Hindi namin kilala ang code na 'yan. Pakicheck at subukan ulit.",
      not_started: "Hindi pa nagsisimula ang Voucher na ito.",
      ended: "Tapos na ang Voucher na ito.",
      not_yours: "Sa ibang account ang Voucher na ito.",
      first_order_only: "Para lang sa unang order ang Voucher na ito.",
      used_up: "Naubos na ang Voucher na ito.",
      used_by_you: "Nagamit mo na ang Voucher na ito.",
      sign_in: "Mag-sign in para magamit ang Voucher.",
      empty_cart: "Maglagay muna ng item sa cart mo.",
      too_many_codes:
        "Masyadong maraming code ang sinubukan. Maghintay muna ng ilang minuto.",
      gone: "Wala na ang Recipe na ito.",
    },
    failed: {
      generic: "Hindi gumana iyon. Pakisubukan ulit.",
      update: "Hindi namin ma-update ang cart mo. Pakisubukan ulit.",
      save: "Hindi namin ma-save iyon. Pakisubukan ulit.",
      note: "Hindi namin ma-save ang note mo. Pakisubukan ulit.",
      fill: "Hindi namin maidagdag ang mga ito. Pakisubukan ulit.",
    },
    adding: "Idinadagdag...",
    filled: (added, soldOut, capped) =>
      [
        added > 0
          ? `Naidagdag ang ${added} ${items(added)} sa cart mo.`
          : "Walang naidagdag.",
        soldOut.length ? `Pasensya na, kakaubos lang ng ${list(soldOut)}.` : "",
        capped.length
          ? `Idinagdag namin lahat ng meron kami sa ${list(capped)}: kaunti na lang ang natitira.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    unknownItem: "isang item na hindi na binebenta",
  },
  checkout: {
    title: "Checkout",
    whereTo: "Saan namin ihahatid?",
    deliverHere: "Dito ihatid",
    firstLabel: "Bahay",
    elsewhere: "Ihahatid sa ibang lugar? Magdagdag ng address",
    addressPanel: "Address para sa delivery",
    deliverTo: "Ihatid sa",
    landmark: (landmark) => `Palatandaan: ${landmark}`,
    zoneFee: (zone, fee) => `Delivery sa ${zone}: ${fee}.`,
    freeForOrder: "libre para sa order na ito",
    outOfZone:
      "Hindi pa kami naghahatid sa address na ito. Pumili ng iba, please.",
    edit: (label) => `I-edit ang ${label}`,
    mobile: "Mobile number",
    mobileHint: "Tatawagan ka ng Rider sa number na ito pagdating niya.",
    riderNote: "Note para sa Rider (optional)",
    slotPanel: "Delivery slot",
    noSlots: "Walang bukas na delivery slot sa ngayon. Pakibalikan maya-maya.",
    day: "Araw ng delivery",
    time: "Oras ng delivery",
    chosen: "Napili",
    full: "Puno na",
    few: "Kaunti na lang",
    available: "Bakante",
    paymentPanel: "Bayad",
    paymentMethod: "Paraan ng pagbayad",
    methods: {
      gcash: {
        name: "GCash",
        hint: "Aaprubahan mo ang bayad sa GCash app",
      },
      card: {
        name: "Credit o debit card",
        hint: "Visa at Mastercard, ilalagay sa secure na page ng payment partner namin",
      },
      cod: {
        name: "Cash on delivery",
        hint: "Bayaran ang Rider pagdating ng order mo",
      },
    },
    comingSoon: "Malapit na ang bayad sa GCash at card.",
    weighedOnline:
      "Ang mga item na binebenta ayon sa timbang ay sinisingil ayon sa timbang na ini-pack namin. Ang tantiyang ito ang babayaran mo ngayon, at ibabalik namin ang sobra sa loob ng isang araw.",
    weighedCash:
      "Ang mga item na binebenta ayon sa timbang ay sinisingil ayon sa timbang na ini-pack namin, kaya puwedeng magbago nang kaunti ang cash na babayaran mo.",
    lineDetail: (quantity, weighed, substitution) =>
      `Dami: ${quantity}${weighed ? ", ayon sa timbang" : ""}. ${substitution}.`,
    soldOut: "Ubos na",
    vat: "Kasama na ang VAT.",
    belowMinimum: (amount) =>
      `Magdagdag pa ng ${amount} para maabot ang minimum order sa lugar na ito.`,
    opening: "Binubuksan ang payment page...",
    placing: "Ipinapasok ang order mo...",
    place: (total) => `I-order na, ${total}`,
    payNext:
      "Susunod, magbabayad ka sa secure na page ng payment partner namin.",
    chooseSlot: "Pumili ng delivery slot para makatuloy.",
    changeItems: "Palitan ang mga item",
    hold: {
      empty_cart: "Wala pang laman ang cart mo.",
      out_of_zone: "Pumili ng address na hinahatiran namin.",
      full: "Kakapuno lang ng slot na 'yan. Pumili ng iba, please.",
      closed: "Sarado na ang slot na 'yan. Pumili ng iba, please.",
    },
    onlineOff:
      "Hindi puwede ang online na bayad sa ngayon. Pumili ng cash on delivery, please.",
    tooMany:
      "Marami kang na-order ngayon lang. Maghintay muna nang kaunti, o kontakin kami para sa tulong.",
    refused: {
      total_changed: (total) =>
        `Nagbago ang mga presyo habang nagche-checkout ka. ${total} na ang total mo ngayon. Pakicheck at i-order ulit.`,
      below_minimum: (amount) =>
        `Magdagdag pa ng ${amount} para maabot ang minimum order sa lugar na ito.`,
      out_of_stock:
        "Pasensya na, may mga item na kakaubos lang. Pakicheck ang cart mo.",
      slot_unavailable:
        "Kakapuno lang ng delivery slot na 'yan. Pumili ng iba, please.",
      invalid_phone: "Ilagay ang mobile number na tulad ng 0917 123 4567.",
      out_of_zone:
        "Hindi pa kami naghahatid sa address na ito. Pumili ng iba, please.",
      address_not_found: "Pumili ng address para sa delivery.",
      empty_cart: "Wala pang laman ang cart mo.",
      nothing_in_stock:
        "Pasensya na, naubos ang lahat ng nasa cart mo. Pumili ng ibang item, please.",
      cart_changed:
        "Nagbago ang cart mo sa ibang tab. Pakicheck at i-order ulit.",
      too_many_open_orders:
        "Marami ka pang order na papunta. Hintayin munang dumating ang isa, o mag-cancel ng isa.",
      unpaid_order_waiting:
        "May order ka pang naghihintay ng bayad. Bayaran muna ito, o bumalik sa cart mula roon.",
      too_many_items: (limit) =>
        `Hanggang ${limit} item lang ang isang order. Magbawas o hatiin ang order mo.`,
      over_cod_limit: (limit) =>
        `Hanggang ${limit} lang ang cash on delivery na order. Magbawas ng item o hatiin ang order mo.`,
      already_placed:
        "Na-order na ang cart na ito. Makikita mo ito sa mga order mo.",
      invalid: "Pumili ng delivery slot.",
      voucher_unavailable: (problem) =>
        `${problem} Alisin ang Voucher para maituloy ang order mo.`,
    },
  },
  pay: {
    title: "Bayad",
    cancelledTitle: "Na-cancel ang order na ito",
    cancelledBody: (orderNo) =>
      `Na-cancel ang order ${orderNo}, kaya wala nang babayaran.`,
    goToCart: "Pumunta sa cart mo",
    by: { card: "ang card mo", gcash: "ang GCash" },
    paidTitle: "Tinitingnan ang bayad mo",
    paidBody: (by, total) =>
      `Hinihintay naming kumpirmahin ng ${by} ang ${total}. Ilang segundo lang ito karaniwan, at kusang mag-a-update ang page na ito.`,
    busyTitle: "Pinoproseso pa ang bayad mo",
    busyBody: (by) =>
      `Kukumpirmahin namin ang order mo kapag kinumpirma na ng ${by}. Kusang mag-a-update ang page na ito.`,
    cancelledBackTitle: "Hindi natuloy ang bayad mo",
    cancelledBackBody:
      "Puwede mong subukan ulit, o bumalik sa cart mo para may baguhin.",
    errorTitle: "Hindi namin mabuksan ang payment page",
    errorBody: "Pakisubukan ulit maya-maya.",
    waitingTitle: "Magbayad para makumpirma ang order mo",
    waitingBody: (total) => `Naghihintay ang order mo ng ${total}.`,
    order: (orderNo) => `Order ${orderNo}`,
    holding: "Naka-reserve ang mga item at delivery slot mo hanggang",
    payNow: (total) => `Bayaran ang ${total} ngayon`,
    goingBack: "Bumabalik...",
    backToCart: "Bumalik sa cart",
  },
  confirmed: {
    title: "Kumpirmado ang order",
    heading: "Salamat! Pasok na ang order mo.",
    number: "Order number",
    sentTo: (email) =>
      `Pinadala namin ang detalye sa ${email ? "email at phone mo" : "phone mo"}.`,
    cashAbout: (total) =>
      `Maghanda ng mga ${total} na cash. Ang mga item na binebenta ayon sa timbang ay sinisingil ayon sa timbang na ini-pack namin.`,
    cash: (total) => `Maghanda ng ${total} na cash para sa Rider.`,
    paid: (total, method) =>
      `Bayad na ang ${total} ${method === "gcash" ? "sa GCash" : "sa card"}.`,
    track: "Subaybayan ang order mo",
  },
  order: {
    title: "Subaybayan ang order mo",
    number: (orderNo) => `Order ${orderNo}`,
    onItsWay: (rider) => `Papunta na kasama si ${rider}`,
    call: (phone) => `Tumawag sa ${phone}`,
    pin: "Ibigay ang PIN na ito sa Rider sa pinto:",
    finishPaying: "Tapusin ang bayad",
    reorder: "I-order ulit ang mga ito",
    cancelHint:
      "Nagbago ang isip mo? Puwede kang mag-cancel hangga't hindi pa namin sinisimulang i-pick.",
    cancel: "I-cancel ang order",
    progress: "Progreso ng order",
    steps: {
      confirmed: "Kumpirmado ang order",
      picking: "Pinipili ang mga item mo",
      picked: "Handa na para sa Rider",
      out_for_delivery: "Papunta na",
      delivered: "Naihatid na",
    },
    notYet: " (hindi pa)",
    cancelled: "Na-cancel ang order na ito.",
    failed:
      "Hindi namin naihatid ang order na ito. Kokontakin ka namin para subukan ulit.",
    slot: "Delivery slot",
    deliverTo: "Ihatid sa",
    landmark: (landmark) => `Palatandaan: ${landmark}`,
    payment: "Bayad",
    methods: { cod: "Cash on delivery", gcash: "GCash", card: "Card" },
    online: "Online",
    mobile: "Mobile number",
    items: "Mga item",
    lineDetail: (quantity, price, weighed) =>
      `${quantity} x ${price}${weighed ? ", ayon sa timbang" : ""}`,
    subtotal: "Subtotal",
    discount: "Discount",
    delivery: "Delivery",
    free: "Libre",
    estimatedTotal: "Tantiyang total",
    total: "Total",
    finalTotal: "Final na total, ayon sa ini-pack",
    refund: (method) =>
      `Ibinalik sa ${method === "card" ? "card" : "GCash"} mo`,
    vat: (amount) => `Kasama na ang VAT (${amount}).`,
    weighedNote:
      " Ang mga item na binebenta ayon sa timbang ay sinisingil ayon sa timbang na ini-pack namin, kaya puwedeng magbago nang kaunti ang final na halaga.",
  },
};
