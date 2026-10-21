import { randomUUID } from "node:crypto";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  addLines,
  createShoppingList,
  deleteShoppingList,
  getCart,
  getCartQuantities,
  getShoppingList,
  listShoppingLists,
  queueCartReminders,
  removeFromList,
  saveToList,
  setLineQuantity,
  shoppingListLines,
  CART_REMINDER_JOB,
  type CartOwner,
} from "@/modules/cart";
import { getDefaultAddress, setMarketingOptIn } from "@/modules/customers";
import { getDefaultHubId, resolveZone } from "@/modules/delivery";
import {
  cancelStockAlert,
  hasStockAlert,
  queueStockAlerts,
  requestStockAlert,
  STOCK_ALERT_JOB,
} from "@/modules/inventory";
import {
  getReorderLines,
  listBoughtBefore,
  placeOrder,
} from "@/modules/orders";
import { sendCartReminder } from "@/modules/notifications";
import { runDueJobs } from "@/modules/jobs";
import { signValue, verifySigned } from "@/lib/signed";
import { jobHandlers } from "@/server/job-handlers";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

const db = createTestDb();
const NOW = new Date("2026-10-01T20:00:00Z");
const HOUR = 60 * 60 * 1000;
const MILK = seedId("product:magnolia-fresh-milk");
const EGGS = seedId("product:large-eggs-12-pack");
const SOY = seedId("product:silver-swan-soy-sauce");
const UBE = seedId("product:ube-roll"); // seeded sold out

let ligaya: string;
let paolo: string;
let hubId: string;
const owner = (customerId: string): CartOwner => ({ customerId });

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, NOW);
  const id = async (email: string) =>
    (await db.customer.findUniqueOrThrow({ where: { email } })).id;
  ligaya = await id("ligaya@example.com");
  paolo = await id("paolo@example.com");
  hubId = (await getDefaultHubId())!;
}, 60_000);
afterAll(() => db.$disconnect());

beforeEach(async () => {
  await db.$executeRawUnsafe(
    "TRUNCATE jobs, notifications, order_status_events, payments, stock_movements, order_lines, orders, slot_holds, cart_lines, carts, shopping_lists, stock_alerts CASCADE"
  );
  await db.slot.updateMany({ data: { booked: 0, capacity: 20 } });
  await db.stockLevel.updateMany({
    where: { productId: { in: [MILK, EGGS, SOY] } },
    data: { onHand: 40, reserved: 0 },
  });
  await db.stockLevel.updateMany({
    where: { productId: UBE },
    data: { onHand: 0, reserved: 0 },
  });
  await db.zone.updateMany({ data: { minOrderCents: 0 } });
  await db.customer.updateMany({ data: { marketingOptIn: false } });
});

describe("addLines", () => {
  it("adds on top of the Cart, caps at stock and names what is sold out", async () => {
    const me = owner(ligaya);
    await setLineQuantity(me, MILK, 2, hubId);
    await db.stockLevel.updateMany({
      where: { productId: EGGS },
      data: { onHand: 3 },
    });
    const result = await addLines(
      me,
      [
        { productId: MILK, quantity: 3 },
        { productId: EGGS, quantity: 5 },
        { productId: UBE, quantity: 1 },
      ],
      hubId
    );
    expect(result).toEqual({
      added: 6,
      soldOut: [UBE],
      capped: [EGGS],
    });
    expect(await getCartQuantities(me)).toEqual({ [MILK]: 5, [EGGS]: 3 });
  });
});

/** A cash Order of `lines` for a Customer, marked delivered. */
async function delivered(
  customerId: string,
  lines: [string, number][],
  daysAgo = 1
) {
  for (const [productId, quantity] of lines)
    await setLineQuantity(owner(customerId), productId, quantity, hubId);
  const slot = await db.slot.findFirstOrThrow({ orderBy: { startsAt: "asc" } });
  const address = (await getDefaultAddress(customerId))!;
  const zone = (await resolveZone(address))!;
  const { priced } = await getCart(owner(customerId), {
    hubId: zone.hubId,
    zone: zone.fees,
  });
  const placed = await placeOrder({
    customerId,
    addressId: address.id,
    expectedTotalCents: priced.totalCents,
    slotId: slot.id,
    contactPhone: "+639171234567",
    riderNotes: "",
    paymentMethod: "cod",
    idempotencyKey: randomUUID(),
    now: NOW,
  });
  if (!placed.ok) throw new Error(`not placed: ${placed.reason}`);
  await db.order.update({
    where: { id: placed.orderId },
    data: {
      status: "delivered",
      deliveredAt: new Date(NOW.getTime() - daysAgo * 24 * HOUR),
    },
  });
  return placed.orderNo;
}

describe("Reorder and Buy again (ADR 0014)", () => {
  it("gives back a Customer's own Order lines, not another's", async () => {
    const orderNo = await delivered(ligaya, [
      [MILK, 2],
      [EGGS, 1],
    ]);
    expect(await getReorderLines(orderNo, ligaya)).toEqual([
      { productId: MILK, quantity: 2 },
      { productId: EGGS, quantity: 1 },
    ]);
    expect(await getReorderLines(orderNo, paolo)).toBeNull();
  });

  it("lists what a Customer bought in delivered Orders, most often first", async () => {
    await delivered(
      ligaya,
      [
        [MILK, 1],
        [EGGS, 1],
      ],
      3
    );
    await delivered(ligaya, [[MILK, 1]], 2);
    await delivered(ligaya, [[SOY, 1]], 1);
    // Milk twice; then the soy sauce, bought more lately than the eggs.
    expect(await listBoughtBefore(ligaya, 12)).toEqual([MILK, SOY, EGGS]);
    expect(await listBoughtBefore(paolo, 12)).toEqual([]);
  });
});

describe("Shopping Lists (ADR 0014)", () => {
  it("names lists, keeps Products with counts and adds a list to the Cart", async () => {
    expect(await createShoppingList(ligaya, " ")).toEqual({
      ok: false,
      errors: { name: "Give the list a name." },
    });
    const weekly = await createShoppingList(ligaya, "Weekly");
    if (!weekly.ok) throw new Error("not created");
    expect(await createShoppingList(ligaya, "weekly")).toEqual({
      ok: false,
      errors: { name: 'You already have a list called "Weekly".' },
    });

    await saveToList(ligaya, weekly.id, [
      { productId: MILK, quantity: 2 },
      { productId: SOY, quantity: 1 },
    ]);
    await saveToList(ligaya, weekly.id, [{ productId: MILK, quantity: 3 }]);
    expect(await shoppingListLines(ligaya, weekly.id)).toEqual([
      { productId: MILK, quantity: 3 },
      { productId: SOY, quantity: 1 },
    ]);
    const list = await getShoppingList(ligaya, weekly.id);
    expect(list?.items.map((i) => i.product.name)).toEqual([
      "Fresh Milk",
      "Soy Sauce",
    ]);
    expect((await listShoppingLists(ligaya))[0]).toMatchObject({
      name: "Weekly",
      itemCount: 2,
    });

    await removeFromList(ligaya, weekly.id, SOY);
    expect(await shoppingListLines(ligaya, weekly.id)).toEqual([
      { productId: MILK, quantity: 3 },
    ]);
  });

  it("keeps each Customer's lists to themselves", async () => {
    const mine = await createShoppingList(ligaya, "Party");
    if (!mine.ok) throw new Error("not created");
    expect(await getShoppingList(paolo, mine.id)).toBeNull();
    expect(await shoppingListLines(paolo, mine.id)).toBeNull();
    expect(
      await saveToList(paolo, mine.id, [{ productId: MILK, quantity: 1 }])
    ).toEqual({ ok: false, reason: "not_found" });
    expect(await deleteShoppingList(paolo, mine.id)).toBe(false);
    expect(await deleteShoppingList(ligaya, mine.id)).toBe(true);
  });
});

describe("Cart Reminders (ADR 0014)", () => {
  async function idleCart(customerId: string, hoursAgo: number) {
    await setLineQuantity(owner(customerId), MILK, 1, hubId);
    const at = new Date(NOW.getTime() - hoursAgo * HOUR);
    await db.cartLine.updateMany({
      where: { cart: { customerId } },
      data: { updatedAt: at },
    });
    await db.cart.updateMany({
      where: { customerId },
      data: { updatedAt: at },
    });
  }

  it("queues one reminder for an opted-in Customer's Cart idle 3 hours", async () => {
    await setMarketingOptIn(ligaya, true);
    await idleCart(ligaya, 4);
    await idleCart(paolo, 4); // never said yes
    expect(await queueCartReminders(NOW)).toBe(1);
    expect(await queueCartReminders(NOW)).toBe(0);
    const jobs = await db.job.findMany({ where: { kind: CART_REMINDER_JOB } });
    expect(jobs).toHaveLength(1);
  });

  it("leaves Carts changed lately, or idle for days", async () => {
    await setMarketingOptIn(ligaya, true);
    await setMarketingOptIn(paolo, true);
    await idleCart(ligaya, 1);
    await idleCart(paolo, 72);
    expect(await queueCartReminders(NOW)).toBe(0);
  });

  it("sends the email once, with a stop link", async () => {
    const sent: string[] = [];
    const email = {
      send: async (m: { text: string }) => {
        sent.push(m.text);
        return { provider: "test", ref: null };
      },
    };
    const notice = {
      cartId: randomUUID(),
      email: "ligaya@example.com",
      name: "Ligaya",
      items: ["Magnolia Fresh Milk", "Silver Swan Soy Sauce"],
      cartUrl: "http://localhost:3000/cart",
      stopUrl: "http://localhost:3000/stop/abc",
    };
    await sendCartReminder(notice, { email });
    await sendCartReminder(notice, { email });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain("http://localhost:3000/stop/abc");
  });
});

describe("the queued messages", () => {
  it("go out through the job handlers, once each", async () => {
    await setMarketingOptIn(ligaya, true);
    await setLineQuantity(owner(ligaya), MILK, 1, hubId);
    await db.cartLine.updateMany({
      data: { updatedAt: new Date(NOW.getTime() - 4 * HOUR) },
    });
    await db.cart.updateMany({
      data: { updatedAt: new Date(NOW.getTime() - 4 * HOUR) },
    });
    await requestStockAlert(ligaya, UBE);
    await db.stockLevel.updateMany({
      where: { productId: UBE },
      data: { onHand: 2 },
    });
    expect(await queueCartReminders(NOW)).toBe(1);
    expect(await queueStockAlerts(hubId, NOW)).toBe(1);
    const quiet = vi.spyOn(console, "info").mockImplementation(() => {});
    await runDueJobs(jobHandlers, { now: new Date() });
    quiet.mockRestore();
    const sent = await db.notification.findMany({
      select: { template: true, channel: true, recipient: true },
      orderBy: [{ template: "asc" }, { channel: "asc" }],
    });
    expect(sent).toEqual([
      {
        template: "back_in_stock",
        channel: "email",
        recipient: "ligaya@example.com",
      },
      { template: "back_in_stock", channel: "sms", recipient: "+639171234501" },
      {
        template: "cart_reminder",
        channel: "email",
        recipient: "ligaya@example.com",
      },
    ]);
  });
});

describe("the stop link", () => {
  it("verifies only what it signed", () => {
    const token = signValue("customer-1");
    expect(verifySigned(token)).toBe("customer-1");
    expect(verifySigned(`${token}x`)).toBeNull();
    expect(verifySigned("customer-1.forged")).toBeNull();
  });
});

describe("Stock Alerts (ADR 0014)", () => {
  it("queues one message when a sold-out Product is back, then ends", async () => {
    expect(await requestStockAlert(ligaya, UBE)).toBe(true);
    expect(await requestStockAlert(ligaya, UBE)).toBe(true);
    expect(await hasStockAlert(ligaya, UBE)).toBe(true);
    expect(await queueStockAlerts(hubId, NOW)).toBe(0);

    await db.stockLevel.updateMany({
      where: { productId: UBE },
      data: { onHand: 5 },
    });
    expect(await queueStockAlerts(hubId, NOW)).toBe(1);
    expect(await hasStockAlert(ligaya, UBE)).toBe(false);
    const [job] = await db.job.findMany({ where: { kind: STOCK_ALERT_JOB } });
    expect(job.payload).toMatchObject({ customerId: ligaya, productId: UBE });
  });

  it("ends alerts older than 30 days unsent, and can be cancelled", async () => {
    await requestStockAlert(ligaya, UBE);
    await requestStockAlert(paolo, UBE);
    await db.stockAlert.updateMany({
      where: { customerId: paolo },
      data: { createdAt: new Date(NOW.getTime() - 31 * 24 * HOUR) },
    });
    await cancelStockAlert(ligaya, UBE);
    await db.stockLevel.updateMany({
      where: { productId: UBE },
      data: { onHand: 5 },
    });
    expect(await queueStockAlerts(hubId, NOW)).toBe(0);
    expect(await db.stockAlert.count()).toBe(0);
  });
});
