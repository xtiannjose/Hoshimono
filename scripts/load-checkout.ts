// Checkout under load (docs/load-test.md). Two runs against the
// hoshimono_load database, then checks that nothing was overbooked or
// oversold:
//   rush:  200 Customers check out, 5x an assumed peak of 40 checkouts in
//          five minutes, over the next 10 Slots (200 places), 25 at a time:
//          about 20 times faster than they would arrive.
// One process has 10 database connections and waits 5 s for one; a burst
// far beyond that fails with an error and leaves the Cart as it was. On
// Vercel, requests spread over many instances (docs/load-test.md).
//   last:  50 Customers fight over a Slot's last 5 places, then 30 over
//          the last 3 units of a Product.
// Run with `npm run load:checkout` (resets and seeds hoshimono_load first).

import "./load-env";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { getCart, setLineQuantity } from "@/modules/cart";
import { getDefaultAddress, saveAddress } from "@/modules/customers";
import {
  getDefaultHubId,
  resolveZone,
  SLOT_CUTOFF_MINUTES,
} from "@/modules/delivery";
import { placeOrder, type PlaceOrderResult } from "@/modules/orders";

import { seedDatabase } from "../prisma/seed-data";
import { resetDb } from "../tests/db/helpers";

if (!/\/hoshimono_load(\?|$)/.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("The load test resets its database: hoshimono_load only.");
}

type Shopper = { customerId: string; addressId: string };
type Attempt = { ms: number; result: PlaceOrderResult };

async function makeShoppers(prefix: string, n: number): Promise<Shopper[]> {
  const shoppers: Shopper[] = [];
  for (let i = 0; i < n; i++) {
    const key = `${prefix}-${String(i).padStart(3, "0")}`;
    const customer = await db.customer.create({
      data: { email: `${key}@load.test`, name: `Load ${key}` },
    });
    const saved = await saveAddress(customer.id, {
      label: "Home",
      line1: `${i + 1} Sampaguita Street`,
      barangay: "Kapitolyo",
      city: "Pasig",
      landmark: "Beside the chapel",
      isDefault: true,
    });
    if (!saved.ok) throw new Error(JSON.stringify(saved));
    const address = (await getDefaultAddress(customer.id))!;
    shoppers.push({ customerId: customer.id, addressId: address.id });
  }
  return shoppers;
}

async function fillCart(
  shopper: Shopper,
  hubId: string,
  lines: { productId: string; qty: number }[]
) {
  const owner = { customerId: shopper.customerId };
  for (const { productId, qty } of lines) {
    const set = await setLineQuantity(owner, productId, qty, hubId);
    if (!set.ok) throw new Error(`fill: ${set.reason}`);
  }
}

async function checkout(
  shopper: Shopper,
  hubId: string,
  slotId: string
): Promise<Attempt> {
  const address = (await getDefaultAddress(shopper.customerId))!;
  const zone = (await resolveZone(address))!;
  const started = performance.now();
  const cart = await getCart(
    { customerId: shopper.customerId },
    { hubId, zone: zone.fees }
  );
  const result = await placeOrder({
    customerId: shopper.customerId,
    addressId: shopper.addressId,
    slotId,
    contactPhone: "+639171234567",
    paymentMethod: "cod",
    expectedTotalCents: cart.priced.totalCents,
    idempotencyKey: randomUUID(),
  });
  return { ms: performance.now() - started, result };
}

function summary(name: string, attempts: Attempt[], wallMs: number) {
  const ms = attempts.map((a) => a.ms).sort((a, b) => a - b);
  const at = (p: number) =>
    Math.round(ms[Math.ceil((p / 100) * ms.length) - 1]);
  const reasons: Record<string, number> = {};
  for (const { result } of attempts) {
    const key = result.ok ? "placed" : result.reason;
    reasons[key] = (reasons[key] ?? 0) + 1;
  }
  console.log(
    `${name}: ${attempts.length} checkouts in ${(wallMs / 1000).toFixed(1)} s ` +
      `(${(attempts.length / (wallMs / 1000)).toFixed(1)}/s); ` +
      `p50 ${at(50)} ms, p95 ${at(95)} ms, max ${at(100)} ms; ` +
      JSON.stringify(reasons)
  );
  return reasons;
}

/** Checkouts with at most `inFlight` running at once. */
async function race(
  name: string,
  shoppers: Shopper[],
  hubId: string,
  slotFor: (i: number) => string,
  inFlight = shoppers.length
) {
  const started = performance.now();
  const attempts: Attempt[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: inFlight }, async () => {
      while (next < shoppers.length) {
        const i = next++;
        attempts.push(await checkout(shoppers[i], hubId, slotFor(i)));
      }
    })
  );
  return summary(name, attempts, performance.now() - started);
}

const failures: string[] = [];
function check(ok: boolean, what: string) {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
}

/** Bookings, holds on stock and Order totals all add up. */
async function checkBooks() {
  const overbooked = await db.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM slots s
    WHERE s.booked > s.capacity
       OR s.booked <> (SELECT count(*) FROM orders o
                       WHERE o.slot_id = s.id AND o.status <> 'cancelled')`;
  check(
    overbooked[0].n === 0,
    "every Slot's bookings match its Orders and capacity"
  );
  const oversold = await db.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM stock_levels l
    WHERE l.reserved > l.on_hand
       OR l.reserved <> (SELECT coalesce(sum(ol.ordered_qty), 0) FROM order_lines ol
                         JOIN orders o ON o.id = ol.order_id
                         WHERE ol.product_id = l.product_id
                           AND o.status <> 'cancelled')`;
  check(
    oversold[0].n === 0,
    "every Product's reserved stock matches its Orders"
  );
}

async function main() {
  await resetDb(db);
  await seedDatabase(db);
  await db.zone.updateMany({ data: { minOrderCents: 0 } });
  await db.stockLevel.updateMany({ data: { onHand: 100_000, reserved: 0 } });
  const hubId = (await getDefaultHubId())!;
  const products = await db.product.findMany({
    where: { status: "active", packSizeUnit: { not: "g" } },
    select: { id: true },
    take: 40,
  });
  const slots = await db.slot.findMany({
    where: {
      hubId,
      // Still taking Orders for the whole run.
      startsAt: {
        gt: new Date(Date.now() + (SLOT_CUTOFF_MINUTES + 30) * 60_000),
      },
    },
    orderBy: { startsAt: "asc" },
  });

  // Carts of 3 to 8 lines.
  const basket = (i: number) =>
    Array.from({ length: 3 + (i % 6) }, (_, k) => ({
      productId: products[(i * 7 + k * 3) % products.length].id,
      qty: 1 + ((i + k) % 3),
    }));

  // One at a time first: how long one checkout takes with no queue.
  const solo = await makeShoppers("solo", 20);
  for (const [i, s] of solo.entries()) await fillCart(s, hubId, basket(i));
  console.log("one at a time:");
  await race("  solo", solo, hubId, (i) => slots[10 + (i % 5)].id, 1);

  // The rush: 200 Carts checking out 25 at a time.
  const rush = await makeShoppers("rush", 200);
  for (const [i, s] of rush.entries()) await fillCart(s, hubId, basket(i));
  console.log("rush (5x peak, 25 at a time):");
  const rushed = await race("  rush", rush, hubId, (i) => slots[i % 10].id, 25);
  check(
    rushed.placed === 200,
    "all 200 placed: the 10 Slots had exactly 200 places"
  );
  await checkBooks();

  // The last places: 50 Carts, one Slot with 5 places left.
  const forSlot = await makeShoppers("slot", 50);
  for (const s of forSlot)
    await fillCart(s, hubId, [{ productId: products[0].id, qty: 1 }]);
  const lastSlot = await db.slot.findUniqueOrThrow({
    where: { id: slots[15].id },
  });
  await db.slot.update({
    where: { id: lastSlot.id },
    data: { capacity: lastSlot.booked + 5 },
  });
  console.log("last places (all at once):");
  const slotRace = await race("  slot", forSlot, hubId, () => lastSlot.id);
  check(slotRace.placed === 5, "exactly 5 of 50 got the Slot's last 5 places");

  // The last units: 30 Carts want 1 of a Product with 3 left.
  const lastUnit = products[1].id;
  const forStock = await makeShoppers("stock", 30);
  for (const s of forStock)
    await fillCart(s, hubId, [{ productId: lastUnit, qty: 1 }]);
  const key = { productId_hubId: { productId: lastUnit, hubId } };
  const level = await db.stockLevel.findUniqueOrThrow({ where: key });
  await db.stockLevel.update({
    where: key,
    data: { onHand: level.reserved + 3 },
  });
  const stockRace = await race(
    "  stock",
    forStock,
    hubId,
    (i) => slots[20 + (i % 5)].id
  );
  check(stockRace.placed === 3, "exactly 3 of 30 got the last 3 units");
  await checkBooks();

  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log("\nAll checks passed.");
  }
}

main().finally(() => db.$disconnect());
