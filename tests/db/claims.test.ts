import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getCart, setLineQuantity, type CartOwner } from "@/modules/cart";
import {
  CLAIM_DECIDED_JOB,
  claimableLines,
  claimValue,
  decideClaim,
  fileClaim,
} from "@/modules/claims";
import { getDefaultAddress } from "@/modules/customers";
import { getDefaultHubId, resolveZone } from "@/modules/delivery";
import { placeOrder } from "@/modules/orders";
import { jobHandlers } from "@/server/job-handlers";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

// Freshness Claims (ADR 0016).
const db = createTestDb();
const MEDIA = path.join(process.cwd(), "public", "media", "test-claims");
process.env.MEDIA_LOCAL_DIR = MEDIA;

const NOW = new Date("2026-10-01T20:00:00Z");
const HOUR = 60 * 60 * 1000;
const MILK = seedId("product:magnolia-fresh-milk"); // 115.00
const SOY = seedId("product:silver-swan-soy-sauce"); // 65.00

let ligaya: string;
let paolo: string;
let hubId: string;
let staffId: string;
const owner = (customerId: string): CartOwner => ({ customerId });
const photo = () =>
  sharp({
    create: { width: 800, height: 600, channels: 3, background: "#9a6" },
  })
    .jpeg()
    .toBuffer();

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, NOW);
  const id = async (email: string) =>
    (await db.customer.findUniqueOrThrow({ where: { email } })).id;
  ligaya = await id("ligaya@example.com");
  paolo = await id("paolo@example.com");
  hubId = (await getDefaultHubId())!;
  staffId = (
    await db.staff.findUniqueOrThrow({
      where: { email: "dispatcher@hoshimono.test" },
    })
  ).id;
}, 60_000);
afterAll(async () => {
  await db.$disconnect();
  await rm(MEDIA, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.$executeRawUnsafe(
    "TRUNCATE jobs, notifications, refunds, freshness_claims, voucher_redemptions, order_status_events, payments, stock_movements, order_lines, orders, slot_holds, cart_lines, carts CASCADE"
  );
  await db.voucher.deleteMany({ where: { customerId: { not: null } } });
  await db.slot.updateMany({ data: { booked: 0, capacity: 20 } });
  await db.stockLevel.updateMany({
    where: { productId: { in: [MILK, SOY] } },
    data: { onHand: 50, reserved: 0 },
  });
  await db.zone.updateMany({ data: { minOrderCents: 0 } });
});

/** An Order of `lines`, picked as ordered and delivered an hour before NOW. */
async function delivered(
  customerId: string,
  lines: [string, number][],
  paymentMethod: "cod" | "gcash" = "cod"
) {
  for (const [productId, quantity] of lines)
    await setLineQuantity(owner(customerId), productId, quantity, hubId);
  const address = (await getDefaultAddress(customerId))!;
  const zone = (await resolveZone(address))!;
  const { priced } = await getCart(owner(customerId), {
    hubId: zone.hubId,
    zone: zone.fees,
    now: NOW,
  });
  const slot = await db.slot.findFirstOrThrow({ orderBy: { startsAt: "asc" } });
  const placed = await placeOrder({
    customerId,
    addressId: address.id,
    slotId: slot.id,
    contactPhone: "+639171234567",
    riderNotes: "",
    paymentMethod,
    expectedTotalCents: priced.totalCents,
    idempotencyKey: randomUUID(),
    now: NOW,
  });
  if (!placed.ok) throw new Error(placed.reason);
  await db.$executeRaw`UPDATE order_lines SET fulfilled_qty = ordered_qty WHERE order_id = ${placed.orderId}::uuid`;
  await db.order.update({
    where: { id: placed.orderId },
    data: {
      status: "delivered",
      deliveredAt: new Date(NOW.getTime() - HOUR),
      finalTotalCents: priced.totalCents,
    },
  });
  if (paymentMethod !== "cod")
    await db.payment.updateMany({
      where: { orderId: placed.orderId },
      data: { status: "paid", capturedCents: priced.totalCents },
    });
  const orderLines = await db.orderLine.findMany({
    where: { orderId: placed.orderId },
    select: { id: true, productId: true },
  });
  const line = (productId: string) =>
    orderLines.find((l) => l.productId === productId)!.id;
  return { ...placed, line };
}

describe("claimValue", () => {
  it("is the claimed items' share of what the line was charged, less its share of the discount", () => {
    // Milk 230.00 and soy sauce 130.00 charged, 36.00 off: milk's share is 23.00.
    expect(
      claimValue({ charged: [23000, 13000], discountCents: 3600 }, 0, {
        units: 1,
        chargedUnits: 2,
      })
    ).toBe(10350);
    expect(
      claimValue({ charged: [23000], discountCents: 0 }, 0, {
        units: 2,
        chargedUnits: 2,
      })
    ).toBe(23000);
  });
});

describe("filing a claim (ADR 0016)", () => {
  it("lists what can be claimed while the 24 hours are open", async () => {
    const order = await delivered(ligaya, [[MILK, 5]]);
    const open = await claimableLines(order.orderNo, ligaya, NOW);
    expect(open).toMatchObject({
      open: true,
      lines: [{ name: "Magnolia Fresh Milk", units: 5, amountCents: 57500 }],
    });
    const late = await claimableLines(
      order.orderNo,
      ligaya,
      new Date(NOW.getTime() + 24 * HOUR)
    );
    expect(late?.open).toBe(false);
    expect(await claimableLines(order.orderNo, paolo, NOW)).toBeNull();
  });

  it("checks the item, the count, the photo and the 24 hours", async () => {
    const order = await delivered(ligaya, [[MILK, 5]]);
    const line = order.line(MILK);
    const base = {
      orderLineId: line,
      reason: "not_fresh" as const,
      units: 2,
      note: "Sour on opening",
      photos: [await photo()],
    };
    expect(await fileClaim(paolo, base, NOW)).toEqual({
      ok: false,
      errors: { form: "We could not find that item in your orders." },
    });
    expect(
      await fileClaim(ligaya, base, new Date(NOW.getTime() + 24 * HOUR))
    ).toEqual({
      ok: false,
      errors: { form: "The 24 hours to report a problem have passed." },
    });
    expect(
      await fileClaim(ligaya, { ...base, units: 6, photos: [] }, NOW)
    ).toEqual({
      ok: false,
      errors: {
        units: "Choose 1 to 5.",
        photos: "Add a photo of the item.",
      },
    });

    const filed = await fileClaim(ligaya, base, NOW);
    if (!filed.ok) throw new Error(JSON.stringify(filed.errors));
    const claim = await db.freshnessClaim.findUniqueOrThrow({
      where: { id: filed.id },
    });
    expect(claim).toMatchObject({
      claimedCents: 23000,
      status: "open",
      units: 2,
    });
    expect(claim.photoUrls).toHaveLength(1);
    expect(await fileClaim(ligaya, base, NOW)).toEqual({
      ok: false,
      errors: { form: "You already reported a problem with this item." },
    });
  });

  it("needs no photo for a missing item", async () => {
    const order = await delivered(ligaya, [[MILK, 5]]);
    const filed = await fileClaim(
      ligaya,
      {
        orderLineId: order.line(MILK),
        reason: "missing",
        units: 1,
        note: "",
        photos: [],
      },
      NOW
    );
    expect(filed.ok).toBe(true);
  });
});

describe("deciding a claim (ADR 0016)", () => {
  const missing = (orderLineId: string, units = 1) => ({
    orderLineId,
    reason: "missing" as const,
    units,
    note: "",
    photos: [],
  });

  it("gives a cash Order's claim back as a Voucher", async () => {
    const order = await delivered(ligaya, [[MILK, 5]]);
    const filed = await fileClaim(ligaya, missing(order.line(MILK), 2), NOW);
    if (!filed.ok) throw new Error("not filed");
    expect(
      await decideClaim(
        filed.id,
        staffId,
        { approve: true, amountCents: 23000, note: "" },
        NOW
      )
    ).toEqual({ ok: true });
    const claim = await db.freshnessClaim.findUniqueOrThrow({
      where: { id: filed.id },
      include: { voucher: true },
    });
    expect(claim).toMatchObject({
      status: "approved",
      resolvedCents: 23000,
      payback: "voucher",
    });
    expect(claim.voucher).toMatchObject({
      value: 23000,
      minSpendCents: 0,
      customerId: ligaya,
    });
    expect(claim.voucher?.code).toMatch(/^CREDIT-/);
    expect(await db.job.count({ where: { kind: CLAIM_DECIDED_JOB } })).toBe(1);
    expect(
      await decideClaim(filed.id, staffId, { approve: false, note: "No" }, NOW)
    ).toEqual({ ok: false, reason: "already_decided" });
  });

  it("refunds an online Order, one refund per claim", async () => {
    const order = await delivered(
      paolo,
      [
        [MILK, 7],
        [SOY, 2],
      ],
      "gcash"
    );
    const a = await fileClaim(paolo, missing(order.line(MILK)), NOW);
    const b = await fileClaim(paolo, missing(order.line(SOY)), NOW);
    if (!a.ok || !b.ok) throw new Error("not filed");
    await decideClaim(
      a.id,
      staffId,
      { approve: true, amountCents: 5000, note: "Part of it" },
      NOW
    );
    await decideClaim(
      b.id,
      staffId,
      { approve: true, amountCents: 6500, note: "" },
      NOW
    );
    const refunds = await db.refund.findMany({
      orderBy: { amountCents: "asc" },
      select: { reason: true, amountCents: true, claimId: true },
    });
    expect(refunds).toEqual([
      { reason: "claim", amountCents: 5000, claimId: a.id },
      { reason: "claim", amountCents: 6500, claimId: b.id },
    ]);
    expect(
      await db.freshnessClaim.findUniqueOrThrow({ where: { id: a.id } })
    ).toMatchObject({ payback: "refund", resolvedCents: 5000 });
  });

  it("refuses more than was claimed, and a rejection without a reason", async () => {
    const order = await delivered(ligaya, [[MILK, 5]]);
    const filed = await fileClaim(ligaya, missing(order.line(MILK)), NOW);
    if (!filed.ok) throw new Error("not filed");
    expect(
      await decideClaim(
        filed.id,
        staffId,
        { approve: true, amountCents: 11501, note: "" },
        NOW
      )
    ).toEqual({
      ok: false,
      errors: { amount: "Approve up to ₱115.00." },
    });
    expect(
      await decideClaim(filed.id, staffId, { approve: false, note: " " }, NOW)
    ).toEqual({
      ok: false,
      errors: { note: "Say why, for the Customer." },
    });
    expect(
      await decideClaim(
        filed.id,
        staffId,
        { approve: false, note: "The photo shows a different brand." },
        NOW
      )
    ).toEqual({ ok: true });
  });

  it("tells the Customer once", async () => {
    const order = await delivered(ligaya, [[MILK, 5]]);
    const filed = await fileClaim(ligaya, missing(order.line(MILK)), NOW);
    if (!filed.ok) throw new Error("not filed");
    await decideClaim(
      filed.id,
      staffId,
      { approve: true, amountCents: 11500, note: "" },
      NOW
    );
    const quiet = vi.spyOn(console, "info").mockImplementation(() => {});
    await jobHandlers[CLAIM_DECIDED_JOB]({ claimId: filed.id });
    await jobHandlers[CLAIM_DECIDED_JOB]({ claimId: filed.id });
    quiet.mockRestore();
    expect(
      await db.notification.count({ where: { template: "claim_decided" } })
    ).toBe(1);
  });
});
