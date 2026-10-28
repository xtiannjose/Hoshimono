// Twenty realistic Orders for the Phase 4 dry run (docs/dry-run.md): a Hub
// day for one Picker and one Rider to work through without a developer.
// Run after `npm run db:seed` with `npm run db:dry-run`. Running it again
// places nothing twice: each Order is keyed by its number in the list.

import { db } from "@/lib/db";
import { addMinutes, formatSlot, manilaDate } from "@/lib/dates";
import {
  getCart,
  setLineNote,
  setLineQuantity,
  setSubstitution,
} from "@/modules/cart";
import { getDefaultAddress, saveAddress } from "@/modules/customers";
import {
  getDefaultHubId,
  resolveZone,
  SLOT_CUTOFF_MINUTES,
} from "@/modules/delivery";
import { receiveStock } from "@/modules/inventory";
import { placeOrder } from "@/modules/orders";

// ponytail: localhost only; allow a Neon dev branch once one exists.
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("The dry run seeds fake Orders: local databases only.");
}

type Line = {
  product: string;
  qty: number;
  /** "none": never substitute; otherwise a similar item is fine. */
  sub?: "none";
  note?: string;
};

type Shopper = {
  name: string;
  city: string;
  barangay: string;
  line1: string;
  landmark: string;
  /** What the Picker should do with this Order in the dry run. */
  plan?: string;
};

const BASKETS: Line[][] = [
  [
    { product: "Pork Belly (Liempo)", qty: 2, note: "Less fat, please" },
    { product: "Garlic", qty: 1 },
    { product: "Red Onions", qty: 1 },
    { product: "Jasmine Rice", qty: 1 },
    { product: "Fresh Milk", qty: 2 },
  ],
  [
    { product: "Carabao Mangoes", qty: 2 },
    { product: "Lakatan Bananas", qty: 1 },
    { product: "Large Eggs, 12 pack", qty: 1 },
    { product: "Pandesal, 10 pieces", qty: 2 },
    { product: "Salted Butter", qty: 1, sub: "none" },
    { product: "Greek Yogurt", qty: 3 },
  ],
  [
    { product: "Whole Chicken", qty: 1 },
    { product: "Ginger", qty: 1 },
    { product: "Sayote", qty: 2 },
    { product: "Pechay", qty: 2 },
    { product: "Dinorado Rice", qty: 1 },
  ],
  [
    { product: "Bangus, Boneless", qty: 2, sub: "none" },
    { product: "Tomatoes", qty: 2 },
    { product: "Kangkong", qty: 2 },
    { product: "Siling Labuyo", qty: 1 },
    { product: "Pancit Canton Original", qty: 6 },
    { product: "Evaporated Milk", qty: 2 },
  ],
  [
    { product: "Beef Shank (Bulalo Cut)", qty: 2 },
    { product: "Cabbage", qty: 1 },
    { product: "Potatoes", qty: 1 },
    { product: "Quickmelt Cheese", qty: 1 },
    { product: "Ube Ice Cream", qty: 1 },
  ],
];

const SHOPPERS: Shopper[] = [
  {
    name: "Rosario Bautista",
    city: "Pasig",
    barangay: "Kapitolyo",
    line1: "21 Brixton Street",
    landmark: "Green gate, two houses from the corner",
    plan: "Short: Fresh Milk, found 1 of 2",
  },
  {
    name: "Emmanuel Reyes",
    city: "Pasig",
    barangay: "San Antonio",
    line1: "Unit 9C, Emerald Avenue",
    landmark: "Lobby of the tower beside the bank",
  },
  {
    name: "Josefina Cruz",
    city: "Mandaluyong",
    barangay: "Highway Hills",
    line1: "33 Sheridan Street",
    landmark: "White house with a mango tree",
    plan: "Substitute: Dinorado Rice is out, offer another rice; they say yes",
  },
  {
    name: "Ramon Aquino",
    city: "Pasig",
    barangay: "Ugong",
    line1: "5 Mercedes Avenue",
    landmark: "Beside the water refilling station",
  },
  {
    name: "Teodora Lim",
    city: "Mandaluyong",
    barangay: "Wack-Wack",
    line1: "17 Fordham Street",
    landmark: "Blue gate across the chapel",
    plan: "Weighed: Beef Shank (Bulalo Cut) packs 1,800 g of 2,000 g",
  },
  {
    name: "Danilo Mendoza",
    city: "Makati",
    barangay: "Poblacion",
    line1: "Unit 1203, Jupiter Street",
    landmark: "Front desk of the condo",
  },
  {
    name: "Imelda Garcia",
    city: "Taguig",
    barangay: "Fort Bonifacio",
    line1: "Unit 2201, 5th Avenue",
    landmark: "Lobby A, ask the guard",
    plan: "Short: Greek Yogurt, found 2 of 3",
  },
  {
    name: "Ernesto Ramos",
    city: "Makati",
    barangay: "Bel-Air",
    line1: "8 Paseo de Roxas",
    landmark: "Grey building, side entrance",
  },
  {
    name: "Corazon Flores",
    city: "Quezon City",
    barangay: "Libis",
    line1: "41 E. Rodriguez Jr. Avenue",
    landmark: "Beside the bakery",
    plan: "Substitute: Pancit Canton is out, offer another noodle; they say no",
  },
  {
    name: "Antonio Navarro",
    city: "Quezon City",
    barangay: "Bagumbayan",
    line1: "12 Calle Industria",
    landmark: "Yellow house, red gate",
  },
  {
    name: "Milagros Torres",
    city: "Pasig",
    barangay: "Kapitolyo",
    line1: "7 East Capitol Drive",
    landmark: "Across the coffee shop",
  },
  {
    name: "Fernando Castillo",
    city: "Pasig",
    barangay: "Oranbo",
    line1: "15 Shaw Boulevard",
    landmark: "Above the pharmacy",
  },
  {
    name: "Lourdes Villanueva",
    city: "Mandaluyong",
    barangay: "Plainview",
    line1: "29 Boni Avenue",
    landmark: "Next to the barangay hall",
  },
  {
    name: "Rogelio Santos",
    city: "Pasig",
    barangay: "Kapitolyo",
    line1: "3 United Street",
    landmark: "Brown gate with plants",
    plan: "Short: Bangus, Boneless, found 1 of 2 (no substitute wanted)",
  },
  {
    name: "Erlinda Dizon",
    city: "Makati",
    barangay: "San Lorenzo",
    line1: "Unit 805, Arnaiz Avenue",
    landmark: "Lobby, leave with the concierge",
  },
  {
    name: "Gregorio Pascual",
    city: "Taguig",
    barangay: "Fort Bonifacio",
    line1: "Unit 1510, 32nd Street",
    landmark: "Tower 2, ask the guard",
  },
  {
    name: "Nenita Aguilar",
    city: "Quezon City",
    barangay: "Ugong Norte",
    line1: "18 Calle Mercedes",
    landmark: "White gate beside the sari-sari store",
  },
  {
    name: "Alfredo Morales",
    city: "Pasig",
    barangay: "San Antonio",
    line1: "Unit 4B, Pearl Drive",
    landmark: "Front desk",
  },
  {
    name: "Remedios Ocampo",
    city: "Mandaluyong",
    barangay: "Highway Hills",
    line1: "52 Pioneer Street",
    landmark: "Gate beside the laundry shop",
  },
  {
    name: "Benjamin Tan",
    city: "Quezon City",
    barangay: "Libis",
    line1: "6 Nuestra Señora Street",
    landmark: "Corner house, black gate",
  },
];

/** The morning delivery: every basket Product has at least 40 free. */
async function receiveMorningStock(hubId: string) {
  const admin = await db.staff.findFirstOrThrow({ where: { role: "admin" } });
  const names = [...new Set(BASKETS.flat().map((l) => l.product))];
  for (const name of names) {
    const product = await db.product.findFirstOrThrow({
      where: { name },
      select: { id: true, stockLevels: { where: { hubId } } },
    });
    const level = product.stockLevels[0];
    const free = level ? level.onHand - level.reserved : 0;
    if (free < 40) {
      await receiveStock(hubId, product.id, 40 - free, admin.id, "Dry run");
    }
  }
}

/** The first three Slots with room for seven Orders each. */
async function slotsWithRoom(hubId: string) {
  const slots = await db.slot.findMany({
    where: {
      hubId,
      // Still taking Orders, with a few minutes to place them all.
      startsAt: { gt: addMinutes(new Date(), SLOT_CUTOFF_MINUTES + 10) },
    },
    orderBy: { startsAt: "asc" },
  });
  const open = slots.filter((s) => s.capacity - s.booked >= 7).slice(0, 3);
  if (open.length < 3) throw new Error("Not enough open Slots: run the seed.");
  return open;
}

async function placeFor(
  shopper: Shopper,
  index: number,
  hubId: string,
  slotId: string
): Promise<string> {
  const n = String(index + 1).padStart(2, "0");
  const idempotencyKey = `dry-run-${manilaDate(new Date())}-${n}`;
  const done = await db.order.findUnique({
    where: { idempotencyKey },
    select: { orderNo: true },
  });
  if (done) return done.orderNo;

  const email = `dryrun-${n}@example.com`;
  const phone = `+6391755500${n}`;
  const customer = await db.customer.upsert({
    where: { email },
    create: { email, phone, name: shopper.name },
    update: {},
  });
  if (!(await getDefaultAddress(customer.id))) {
    const saved = await saveAddress(customer.id, {
      label: "Home",
      line1: shopper.line1,
      barangay: shopper.barangay,
      city: shopper.city,
      landmark: shopper.landmark,
      isDefault: true,
    });
    if (!saved.ok) throw new Error(`${shopper.name}: ${JSON.stringify(saved)}`);
  }
  const address = (await getDefaultAddress(customer.id))!;
  const zone = (await resolveZone(address))!;

  const owner = { customerId: customer.id };
  for (const line of BASKETS[index % BASKETS.length]) {
    const product = await db.product.findFirstOrThrow({
      where: { name: line.product },
      select: { id: true },
    });
    const set = await setLineQuantity(owner, product.id, line.qty, hubId);
    if (!set.ok) throw new Error(`${line.product}: ${set.reason}`);
    if (line.sub) {
      await setSubstitution(owner, product.id, {
        preference: line.sub,
        preferredProductId: null,
      });
    }
    if (line.note) await setLineNote(owner, product.id, line.note);
  }

  const cart = await getCart(owner, { hubId, zone: zone.fees });
  const placed = await placeOrder({
    customerId: customer.id,
    addressId: address.id,
    slotId,
    contactPhone: phone,
    riderNotes: index % 3 === 0 ? "Please call when outside" : null,
    paymentMethod: "cod",
    expectedTotalCents: cart.priced.totalCents,
    idempotencyKey,
  });
  if (!placed.ok) throw new Error(`${shopper.name}: ${placed.reason}`);
  return placed.orderNo;
}

async function main() {
  const hubId = await getDefaultHubId();
  if (!hubId) throw new Error("No Hub: run `npm run db:seed` first.");
  await receiveMorningStock(hubId);
  const slots = await slotsWithRoom(hubId);
  console.log("Dry run Orders (cash on delivery):\n");
  for (const [i, shopper] of SHOPPERS.entries()) {
    const slot = slots[Math.floor(i / 7)];
    const orderNo = await placeFor(shopper, i, hubId, slot.id);
    console.log(
      `${orderNo}  ${formatSlot(slot.startsAt, slot.endsAt).padEnd(28)}  ${shopper.name.padEnd(20)}  ${shopper.plan ?? ""}`
    );
  }
}

main().finally(() => db.$disconnect());
