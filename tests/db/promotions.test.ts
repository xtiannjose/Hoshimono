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
  getCart,
  setCartVoucher,
  setLineQuantity,
  type CartOwner,
} from "@/modules/cart";
import { getProductSummaries } from "@/modules/catalog";
import {
  applyReferral,
  getDefaultAddress,
  getReferralCode,
  listReferrals,
} from "@/modules/customers";
import { getDefaultHubId, resolveZone } from "@/modules/delivery";
import { ORDER_DELIVERED_JOB, placeOrder } from "@/modules/orders";
import {
  activePromotions,
  checkVoucher,
  listCustomerVouchers,
  savePromotion,
  saveVoucher,
  type VoucherInput,
} from "@/modules/pricing";
import { jobHandlers } from "@/server/job-handlers";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

const db = createTestDb();
const NOW = new Date("2026-10-01T20:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const MILK = seedId("product:magnolia-fresh-milk"); // 115.00, Dairy and eggs > Milk
const SOY = seedId("product:silver-swan-soy-sauce"); // 65.00
const DAIRY = seedId("category:dairy-and-eggs");

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
    "TRUNCATE jobs, notifications, voucher_redemptions, referral_rewards, order_status_events, payments, stock_movements, order_lines, orders, slot_holds, cart_lines, carts, promotions, vouchers CASCADE"
  );
  await db.customer.updateMany({
    data: { referredById: null, referralCode: null },
  });
  await db.slot.updateMany({ data: { booked: 0, capacity: 20 } });
  await db.stockLevel.updateMany({
    where: { productId: { in: [MILK, SOY] } },
    data: { onHand: 50, reserved: 0 },
  });
  await db.zone.updateMany({ data: { minOrderCents: 0 } });
});

const window = {
  startsAt: new Date(NOW.getTime() - DAY),
  endsAt: new Date(NOW.getTime() + DAY),
};

describe("Promotions (ADR 0015)", () => {
  it("checks what staff enter", async () => {
    expect(
      await savePromotion({
        name: " ",
        kind: "percent",
        value: 95,
        productIds: [],
        categoryIds: [],
        startsAt: NOW,
        endsAt: NOW,
        isActive: true,
      })
    ).toEqual({
      ok: false,
      errors: {
        name: "Give the Promotion a name.",
        value: "Take off 1 to 90 percent.",
        targets: "Choose at least one Product or Category.",
        endsAt: "End it after it starts.",
      },
    });
  });

  it("puts the promoted price on the shelf while it runs, regular price struck", async () => {
    await savePromotion({
      name: "Dairy week",
      kind: "percent",
      value: 10,
      productIds: [],
      categoryIds: [DAIRY],
      ...window,
      isActive: true,
    });
    await savePromotion({
      name: "Over",
      kind: "percent",
      value: 50,
      productIds: [MILK],
      categoryIds: [],
      startsAt: new Date(NOW.getTime() - 3 * DAY),
      endsAt: new Date(NOW.getTime() - DAY),
      isActive: true,
    });
    expect((await activePromotions(NOW)).map((p) => p.name)).toEqual([
      "Dairy week",
    ]);
    // The catalogue reads the clock itself: pin it inside the window.
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    try {
      const [milk, soy] = await getProductSummaries([MILK, SOY]);
      expect(milk).toMatchObject({
        priceCents: 10350,
        compareAtCents: 11500,
        promotion: "Dairy week",
      });
      expect(soy).toMatchObject({ priceCents: 6500, promotion: null });
    } finally {
      vi.useRealTimers();
    }
  });
});

const voucherInput = (over: Partial<VoucherInput> = {}): VoucherInput => ({
  code: "SAVE10",
  kind: "percent",
  value: 10,
  maxDiscountCents: null,
  minSpendCents: 0,
  ...window,
  usageLimit: null,
  perCustomerLimit: 1,
  firstOrderOnly: false,
  isActive: true,
  ...over,
});

async function place(customerId: string) {
  const address = (await getDefaultAddress(customerId))!;
  const zone = (await resolveZone(address))!;
  const cart = await getCart(owner(customerId), {
    hubId: zone.hubId,
    zone: zone.fees,
    now: NOW,
  });
  const slot = await db.slot.findFirstOrThrow({ orderBy: { startsAt: "asc" } });
  return placeOrder({
    customerId,
    addressId: address.id,
    slotId: slot.id,
    contactPhone: "+639171234567",
    riderNotes: "",
    paymentMethod: "cod",
    expectedTotalCents: cart.priced.totalCents,
    idempotencyKey: randomUUID(),
    now: NOW,
  });
}

describe("Vouchers (ADR 0015)", () => {
  it("checks what staff enter, codes kept upper case and unique", async () => {
    expect(await saveVoucher(voucherInput({ code: "save 10" }))).toMatchObject({
      ok: true,
    });
    expect(await saveVoucher(voucherInput({ code: "SAVE10" }))).toEqual({
      ok: false,
      errors: { code: "There is already a Voucher SAVE10." },
    });
    expect(await saveVoucher(voucherInput({ code: "x", value: 0 }))).toEqual({
      ok: false,
      errors: {
        code: "Use 3 to 24 letters, numbers or dashes.",
        value: "Take off 1 to 90 percent.",
      },
    });
  });

  it("says why a code cannot be used", async () => {
    await saveVoucher(
      voucherInput({
        code: "LATER",
        startsAt: new Date(NOW.getTime() + DAY),
        endsAt: new Date(NOW.getTime() + 2 * DAY),
      })
    );
    await saveVoucher(voucherInput({ code: "OFF", isActive: false }));
    await saveVoucher(voucherInput({ code: "FIRST", firstOrderOnly: true }));
    const check = async (code: string) => {
      const r = await checkVoucher(code, ligaya, NOW);
      return r.ok ? "ok" : r.reason;
    };
    expect(await check("nope")).toBe("not_found");
    expect(await check("off")).toBe("not_found");
    expect(await check("later")).toBe("not_started");
    expect(await check("first")).toBe("ok");

    await setLineQuantity(owner(ligaya), MILK, 1, hubId);
    expect((await place(ligaya)).ok).toBe(true);
    expect(await check("first")).toBe("first_order_only");
  });

  it("takes the discount at Checkout and records the use", async () => {
    await saveVoucher(voucherInput({ minSpendCents: 30000 }));
    await setLineQuantity(owner(ligaya), MILK, 2, hubId);
    expect(await setCartVoucher(owner(ligaya), "save10", NOW)).toEqual({
      ok: true,
    });
    let cart = await getCart(owner(ligaya), { hubId, zone: null, now: NOW });
    expect(cart.voucher).toEqual({ code: "SAVE10", problem: null });
    expect(cart.priced.voucher).toMatchObject({
      applied: false,
      shortByCents: 7000,
    });

    await setLineQuantity(owner(ligaya), MILK, 3, hubId);
    cart = await getCart(owner(ligaya), { hubId, zone: null, now: NOW });
    expect(cart.priced.discountCents).toBe(3450);

    const placed = await place(ligaya);
    if (!placed.ok) throw new Error(placed.reason);
    const order = await db.order.findUniqueOrThrow({
      where: { id: placed.orderId },
      select: { discountCents: true, voucherId: true },
    });
    expect(order.discountCents).toBe(3450);
    expect(order.voucherId).not.toBeNull();
    expect(await db.voucherRedemption.count()).toBe(1);
    expect((await checkVoucher("SAVE10", ligaya, NOW)).ok).toBe(false);
  });

  it("gives a Voucher's last use to one Order only", async () => {
    await saveVoucher(voucherInput({ code: "LAST1", usageLimit: 1 }));
    for (const who of [ligaya, paolo]) {
      await setLineQuantity(owner(who), MILK, 7, hubId);
      expect(await setCartVoucher(owner(who), "LAST1", NOW)).toEqual({
        ok: true,
      });
    }
    const results = await Promise.all([place(ligaya), place(paolo)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({
      reason: "voucher_unavailable",
      problem: "used_up",
    });
  });

  it("refuses a Voucher to a guest", async () => {
    expect(
      await setCartVoucher({ guestToken: "x".repeat(43) }, "SAVE10", NOW)
    ).toEqual({ ok: false, reason: "sign_in" });
  });
});

describe("Referrals (ADR 0015)", () => {
  it("links a new Customer and rewards both when their first Order arrives", async () => {
    const code = await getReferralCode(ligaya);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(await getReferralCode(ligaya)).toBe(code);
    expect(await applyReferral(ligaya, code)).toEqual({
      ok: false,
      reason: "own",
    });
    expect(await applyReferral(paolo, "ZZZZZZ")).toEqual({
      ok: false,
      reason: "unknown",
    });
    expect(await applyReferral(paolo, code.toLowerCase())).toEqual({
      ok: true,
    });
    expect(await applyReferral(paolo, code)).toEqual({
      ok: false,
      reason: "already",
    });

    await setLineQuantity(owner(paolo), MILK, 7, hubId);
    const placed = await place(paolo);
    if (!placed.ok) throw new Error(placed.reason);
    await db.order.update({
      where: { id: placed.orderId },
      data: { status: "delivered", deliveredAt: NOW },
    });
    const quiet = vi.spyOn(console, "info").mockImplementation(() => {});
    await jobHandlers[ORDER_DELIVERED_JOB]({ orderId: placed.orderId });
    // Run twice: still one reward.
    await jobHandlers[ORDER_DELIVERED_JOB]({ orderId: placed.orderId });
    quiet.mockRestore();

    expect(await db.referralReward.count()).toBe(1);
    const [mine] = await listCustomerVouchers(ligaya);
    expect(mine).toMatchObject({
      value: 10000,
      minSpendCents: 50000,
      used: false,
    });
    expect(mine.code).toMatch(/^FRIEND-/);
    expect((await listCustomerVouchers(paolo)).length).toBe(1);
    expect(await listReferrals(ligaya)).toEqual([
      expect.objectContaining({ name: "Paolo" }),
    ]);
    // Only the invited friend's own Voucher works for them.
    expect(await checkVoucher(mine.code, paolo)).toEqual({
      ok: false,
      reason: "not_yours",
    });
    expect(
      await db.notification.count({ where: { template: "referral_reward" } })
    ).toBe(2);
  });

  it("does not link a Customer who has already ordered", async () => {
    const code = await getReferralCode(ligaya);
    await setLineQuantity(owner(paolo), MILK, 7, hubId);
    expect((await place(paolo)).ok).toBe(true);
    expect(await applyReferral(paolo, code)).toEqual({
      ok: false,
      reason: "not_new",
    });
  });
});
