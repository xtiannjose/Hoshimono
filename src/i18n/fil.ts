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
  legal: {
    label: "Mga patakaran",
    updated: (date) => `Huling binago: ${date}`,
    englishOnly: "Nasa English pa ang buong teksto ng patakarang ito.",
    privacy: {
      title: "Patakaran sa Privacy",
      description:
        "Anong personal na impormasyon ang kinukuha ng Hoshimono, bakit, sino ang tumatanggap nito, gaano katagal namin itinatago at ang mga karapatan mo.",
    },
    terms: {
      title: "Mga Tuntunin sa Paggamit at Pagbili",
      description:
        "Ang mga tuntunin sa paggamit ng Hoshimono at sa pagbili ng grocery na ihahatid sa Metro Manila.",
    },
    refunds: {
      title: "Refund at Pagbabalik",
      description:
        "Pag-cancel, mga item na ayon sa timbang, mga kapalit, Freshness Claim at mga delivery na hindi natuloy sa Hoshimono.",
    },
    business: {
      title: "Impormasyon sa Buwis at Negosyo",
      description:
        "Ang rehistradong detalye ng negosyo ng Hoshimono, katayuan sa buwis at mga resibo.",
    },
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
  account: {
    title: "Ang account mo",
    signedInWith: "Naka-sign in gamit ang",
    links: {
      orders: {
        name: "Ang mga order mo",
        hint: "Subaybayan, i-cancel bago namin i-pick, at tingnan ang mga dating order",
      },
      addresses: {
        name: "Ang mga address mo",
        hint: "Kung saan kami maghahatid, may palatandaan para sa Rider",
      },
      lists: {
        name: "Ang mga list mo",
        hint: "Lingguhang grocery at iba pa, idadagdag sa cart mo sa isang tap",
      },
      invite: {
        name: "Mag-imbita ng kaibigan",
        hint: "₱100 bawas para sa 'yo at sa kaibigan mo, at ang mga Voucher mo",
      },
    },
    name: "Pangalan mo",
    nameInvalid: "Maglagay ng pangalan na hanggang 80 character.",
    save: "I-save",
    saved: "Na-save na.",
    messages: "Mga mensahe",
    reminders: "Padalhan ako ng mga paalala at alok sa email",
    remindersHint:
      "Tulad ng paalala kapag may naiwan kang item sa cart. Darating pa rin ang mga mensahe tungkol sa order at delivery. Puwede mo itong i-off kahit kailan.",
    signOut: "Mag-sign out",
    yourData: "Ang data mo",
    yourDataBody:
      "I-download ang lahat ng hawak namin tungkol sa'yo, o burahin ang account mo. Mananatili sa records namin ang mga dating order para sa tax, pero wala na ang pangalan, number at address mo.",
    download: "I-download ang data ko",
    deleteAccount: "Burahin ang account ko",
    deleteConfirm: "Naiintindihan kong hindi na ito maibabalik",
    deleteNow: "Oo, burahin ang account ko",
    deleteProblems: {
      confirm: "I-tick muna ang box.",
      open_orders:
        "May order ka pang papunta. Puwede mong burahin ang account mo kapag dumating na ito, o kapag na-cancel mo.",
      claim_open:
        "Tinitingnan pa namin ang report mo tungkol sa isang item. Puwede mong burahin ang account mo kapag nasagot na namin.",
    },
    goodbyeTitle: "Nabura na ang account mo",
    goodbyeBody:
      "Salamat sa pamimili sa amin. Welcome ka ulit anumang oras sa bagong account.",
    goodbyeHome: "Bumalik sa shop",
  },
  history: {
    title: "Ang mga order mo",
    none: "Wala ka pang order. Ilang tap na lang ang una mo.",
    startShopping: "Mamili na",
    placed: (date, slot) => `In-order noong ${date}. Delivery: ${slot}.`,
    status: {
      pending_payment: "Hinihintay ang bayad",
      confirmed: "Kumpirmado",
      picking: "Pinipili na",
      picked: "Handa na para sa Rider",
      out_for_delivery: "Papunta na",
      delivered: "Naihatid na",
      delivery_failed: "Hindi naihatid",
      cancelled: "Na-cancel",
    },
  },
  addresses: {
    title: "Ang mga address mo",
    none: "Wala ka pang naka-save na address. Magdagdag ng isa para mabilis ang checkout.",
    default: "Default",
    notes: (notes) => `Note: ${notes}`,
    edit: "I-edit",
    makeDefault: "Gawing default",
    remove: "Alisin",
    add: "Magdagdag ng address",
    editTitle: "I-edit ang address",
    label: "Pangalan ng address",
    labelHint: "Tulad ng Bahay, Opisina o Bahay ni Lola.",
    labelIdeas: ["Bahay", "Opisina", "Condo"],
    line1: "Numero ng bahay o unit, at kalye",
    city: "City",
    cityHint: (cities) => `Sa ngayon, naghahatid kami sa ${cities}.`,
    chooseCity: "Pumili ng city",
    barangay: "Barangay",
    barangayHint: (city, barangays) =>
      `Sa ${city}, naghahatid kami sa ${barangays}.`,
    landmark: "Palatandaan",
    landmarkHint: "Tulad ng tindahan, kulay ng gate o simbahan sa malapit.",
    notesLabel: "Note para sa Rider (optional)",
    isDefault: "Gawin itong default na address",
    save: "I-save ang address",
    saving: "Sine-save...",
    problems: {
      no_label: "Bigyan ng pangalan ang address na ito, tulad ng Bahay.",
      no_street: "Ilagay ang numero ng bahay o unit at ang kalye.",
      no_barangay: "Ilagay ang barangay.",
      no_city: "Pumili ng city.",
      no_landmark: "Maglagay ng palatandaan para madali kang mahanap ng Rider.",
      too_long: "Masyadong mahaba. Paikliin lang nang kaunti.",
      not_served: (barangay, city) =>
        `Hindi pa kami naghahatid sa ${barangay}, ${city}.`,
      not_found: "Hindi namin makita ang address na 'yan.",
      too_many: (max) =>
        `Hanggang ${max} address lang ang puwedeng i-save. Mag-alis muna ng isa.`,
      invalid: "Pakicheck ang address.",
    },
  },
  invite: {
    title: "Mag-imbita ng kaibigan",
    lead: (reward) =>
      `I-share ang link mo. Kapag naihatid na ang unang order ng kaibigan mo, pareho kayong may ${reward} bawas sa susunod ninyong order.`,
    codeIs: "Ang code mo ay",
    friends: "Mga kaibigang sumali",
    noFriends: "Wala pa. Isang share lang, malapit na ang una mong reward.",
    joined: (name, date) => `${name}, sumali noong ${date}`,
    earned: (reward) => `Nakuha ang ${reward}`,
    waiting: "Hinihintay ang unang order",
    vouchers: "Ang mga Voucher mo",
    noVouchers:
      "Dito lalabas ang mga Voucher na makukuha mo. I-type ang code sa cart mo.",
    voucher: (value, minimum) => `${value} bawas sa order na ${minimum} pataas`,
    used: "Nagamit na",
    until: (date) => `Hanggang ${date}`,
    link: "Ang link mo",
    shareText: "Magpa-deliver ng grocery sa Hoshimono. Gamitin ang link ko:",
    share: "I-share",
    copied: "Nakopya na",
    linkCopied: "Nakopya na ang link",
  },
  lists: {
    title: "Ang mga list mo",
    list: "Ang list mo",
    none: "Wala ka pang list. Mag-save ng produkto mula sa kahit anong product page, o ng buong cart mo, para mabili ulit sa isang tap.",
    empty:
      "Wala pang laman ang list na ito. Magbukas ng kahit anong produkto at piliin ang I-save sa isang list.",
    addAll: "Idagdag lahat sa cart",
    howMany: (name) => `Ilan ang ${name}`,
    remove: (name) => `Alisin ang ${name} sa list`,
    newName: "Pangalan ng bagong list",
    create: "Gawin ang list",
    renameLabel: "Palitan ang pangalan ng list",
    rename: "Palitan",
    confirmDelete: (name) => `Burahin ang list na “${name}”?`,
    delete: "Burahin ang list na ito",
    saved: "Na-save na.",
    choose: "List",
    newList: "Bagong list",
    newListName: "Pangalan ng bagong list",
    placeholder: "Lingguhan",
    save: "I-save",
    saving: "Sine-save...",
    seeLists: "Tingnan ang mga list mo",
    problems: {
      no_name: "Bigyan ng pangalan ang list.",
      name_too_long: "Hanggang 60 character lang ang pangalan.",
      name_taken: (name) => `May list ka nang “${name}”.`,
      too_many_lists: (max) => `Hanggang ${max} list lang ang puwede.`,
      list_gone: "Wala na ang list na 'yan.",
      list_full: (max) =>
        `Puno na ang list na 'yan: hanggang ${max} item lang.`,
      not_saved: "Hindi na-save. Pakisubukan ulit.",
      empty_cart: "Wala pang laman ang cart mo.",
    },
  },
  recipes: {
    title: "Mga recipe",
    description:
      "Lutong-bahay na Pinoy, at handa nang idagdag sa cart mo ang bawat sangkap sa isang tap.",
    lead: "Pumili ng isa at idagdag sa cart mo ang lahat ng sangkap sa isang tap.",
    none: "Wala pang recipe. Pakibalikan maya-maya.",
    card: (minutes, servings) =>
      `${minutes > 0 ? `${minutes} minuto, ` : ""}${servings} serving`,
    notFound: "Walang ganitong recipe",
    summary: (title, servings) => `${title}, ${servings} serving.`,
    prep: "Paghahanda",
    cook: "Pagluluto",
    minutes: (n) => `${n} minuto`,
    serves: "Serving",
    ingredients: "Mga sangkap",
    steps: "Paano lutuin",
    forServings: (heading, servings) => `${heading} para sa ${servings}`,
    servings: "Serving",
    fewer: "Bawasan ang serving",
    more: "Dagdagan ang serving",
    untick: "Alisin ang check sa mga meron ka na sa bahay.",
    toAdd: "Mga sangkap na idadagdag",
    instead: "Kapalit: ",
    usuallyAtHome: "Kadalasang meron na sa bahay",
    soldOut: "Ubos na",
    noLongerSold: "Hindi na binebenta",
    alsoNeed: (things) => `Kakailanganin mo rin ng ${things}.`,
    tick: "I-check ang mga kailangan mo",
    addItems: (n, total) => `Idagdag ang ${n} ${items(n)}, ${total}`,
    ofTheWeek: "Recipe ngayong linggo",
    seeFull: "Tingnan ang buong recipe",
  },
  articles: {
    description:
      "Paano mamili, mag-imbak at magluto nang maayos, mula sa mga nagpa-pack ng grocery mo.",
    lead: "Paano mamili, mag-imbak at magluto nang maayos, kasama ang mga grocery na kailangan mo.",
    none: "Wala pang laman dito. Habang naghihintay,",
    seeRecipes: "tingnan ang mga recipe",
    notFound: "Walang ganitong gabay",
    shop: "Mamili mula sa gabay na ito",
  },
  claims: {
    title: "I-report ang problema",
    back: (orderNo) => `Bumalik sa order ${orderNo}`,
    lead: (time) =>
      `May bulok, sira, kulang o maling item? Sabihin sa amin hanggang ${time} at aayusin namin.`,
    passed:
      "Lampas na ang 24 oras para mag-report ng problema. Kung may mali pa rin, kontakin mo kami, please.",
    allReported:
      "Na-report mo na ang lahat ng item. Sasabihan ka namin kung ano ang desisyon namin.",
    which: "Aling item?",
    what: "Ano ang problema?",
    howMany: (n) => `Ilan sa ${n}?`,
    photos: "Mga litrato",
    optional: " (optional)",
    photosHint:
      "Hanggang 3 litrato ng item at ng label nito. Kailangan kapag bulok o sira.",
    note: "May gusto ka pang idagdag? (optional)",
    send: "Ipadala ang report",
    sending: "Ipinapadala...",
    reasons: {
      not_fresh: "Bulok o hindi sariwa",
      damaged: "Sira",
      missing: "Kulang",
      wrong_item: "Maling item",
    },
    heading: "May problema sa item?",
    statuses: {
      open: "Hinihintay ang review",
      approved: "Aprubado",
      rejected: "Hindi naaprubahan",
    },
    refunded: (amount) => `Ibinalik ang ${amount} sa ginamit mong pambayad.`,
    credited: (amount, code) =>
      `${amount} bawas sa susunod mong order gamit ang code na ${code}.`,
    report: "I-report ang problema",
    until: (time) => `hanggang ${time}`,
    problems: {
      not_found: "Hindi namin makita ang item na 'yan sa mga order mo.",
      not_delivered:
        "Puwede kang mag-report ng problema kapag dumating na ang order mo.",
      window_passed: "Lampas na ang 24 oras para mag-report ng problema.",
      already_reported: "Na-report mo na ang problema sa item na ito.",
      not_charged: "Hindi ka namin siningil para sa item na ito.",
      bad_units: "Pumili kung ilan, hanggang sa dami ng natanggap mo.",
      note_too_long: "Hanggang 500 character lang ang note.",
      too_many_photos: (max) => `Hanggang ${max} litrato lang.`,
      photo_too_big:
        "Masyadong malaki ang litrato. Gumamit ng mas maliit sa 8 MB, galing mismo sa camera ng phone mo.",
      photo_type: "Gumamit ng JPEG, PNG o WebP na litrato.",
      photo_needed: "Maglagay ng litrato ng item.",
      no_reason: "Piliin kung ano ang problema.",
    },
  },
};
