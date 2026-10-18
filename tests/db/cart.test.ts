import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { Product, StockLevel } from "@/generated/prisma/client";

import {
  getCart,
  getCartQuantities,
  mergeGuestCart,
  newGuestToken,
  setLineNote,
  setLineQuantity,
  setSubstitution,
  type CartOwner,
} from "@/modules/cart";
import { priceCart } from "@/modules/pricing";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

const db = createTestDb();
const HUB = seedId("hub:pasig");
const ZONE = {
  deliveryFeeCents: 4900,
  freeDeliveryOverCents: 150000,
  minOrderCents: 50000,
};
const ctx = { hubId: HUB, zone: ZONE };

const product = (slug: string) => seedId(`product:${slug}`);
const MILK = product("magnolia-fresh-milk");
const MANGOES = product("carabao-mangoes"); // 3 on hand
const UBE = product("ube-roll"); // out of stock
const LIEMPO = product("pork-belly-liempo"); // weighed

const guest = (): CartOwner => ({ guestToken: newGuestToken() });

async function customer(email: string): Promise<CartOwner> {
  const row = await db.customer.findUniqueOrThrow({ where: { email } });
  return { customerId: row.id };
}

// Seed once; each test starts with no Carts and the touched rows restored.
let original: { products: Product[]; stock: StockLevel[] };
const TOUCHED = [MILK, MANGOES];

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, new Date("2026-10-18T20:00:00Z"));
  original = {
    products: await db.product.findMany({ where: { id: { in: TOUCHED } } }),
    stock: await db.stockLevel.findMany({
      where: { productId: { in: TOUCHED } },
    }),
  };
}, 60_000);
beforeEach(async () => {
  await db.cart.deleteMany();
  for (const p of original.products) {
    await db.product.update({
      where: { id: p.id },
      data: { priceCents: p.priceCents, status: p.status },
    });
  }
  for (const s of original.stock) {
    await db.stockLevel.update({
      where: { productId_hubId: { productId: s.productId, hubId: s.hubId } },
      data: { onHand: s.onHand, reserved: s.reserved },
    });
  }
});
afterAll(() => db.$disconnect());

describe("Cart lines", () => {
  it("creates a guest Cart on the first add and prices it with priceCart", async () => {
    const owner = guest();
    expect(await setLineQuantity(owner, MILK, 2, HUB)).toEqual({
      ok: true,
      quantity: 2,
      capped: false,
    });
    await setLineQuantity(owner, LIEMPO, 1, HUB);

    const cart = await getCart(owner, ctx);
    expect(cart.lines.map((l) => [l.product.id, l.quantity])).toEqual([
      [MILK, 2],
      [LIEMPO, 1],
    ]);
    expect(cart.itemCount).toBe(3);
    expect(cart.lines[0].substitution).toEqual({
      preference: "allow",
      preferredProductId: null,
    });
    expect(cart.priced).toEqual(
      priceCart(
        cart.lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          unitPriceCents: l.product.priceCents,
          taxClass: l.product.taxClass,
          isWeighed: l.product.isWeighed,
        })),
        { zone: ZONE }
      )
    );
    expect(cart.priced.weighedSubtotalCents).toBeGreaterThan(0);
    expect(await getCartQuantities(owner)).toEqual({ [MILK]: 2, [LIEMPO]: 1 });
  });

  it("sets, then removes a line at zero", async () => {
    const owner = guest();
    await setLineQuantity(owner, MILK, 2, HUB);
    await setLineQuantity(owner, MILK, 5, HUB);
    expect((await getCart(owner, ctx)).lines[0].quantity).toBe(5);
    expect(await setLineQuantity(owner, MILK, 0, HUB)).toEqual({
      ok: true,
      quantity: 0,
      capped: false,
    });
    expect((await getCart(owner, ctx)).lines).toEqual([]);
  });

  it("caps at what the Hub has free and refuses out-of-stock adds", async () => {
    const owner = guest();
    expect(await setLineQuantity(owner, MANGOES, 10, HUB)).toEqual({
      ok: true,
      quantity: 3,
      capped: true,
    });
    expect(await setLineQuantity(owner, UBE, 1, HUB)).toEqual({
      ok: false,
      reason: "out_of_stock",
    });
    await db.stockLevel.update({
      where: { productId_hubId: { productId: MILK, hubId: HUB } },
      data: { onHand: 500 },
    });
    expect(await setLineQuantity(owner, MILK, 150, HUB)).toEqual({
      ok: true,
      quantity: 99,
      capped: true,
    });
  });

  it("refuses unknown Products and impossible quantities", async () => {
    const owner = guest();
    expect(
      await setLineQuantity(
        owner,
        "00000000-0000-0000-0000-000000000000",
        1,
        HUB
      )
    ).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await setLineQuantity(owner, "not-a-uuid", 1, HUB)).toEqual({
      ok: false,
      reason: "not_found",
    });
    for (const bad of [-1, 1.5, Number.NaN]) {
      await expect(setLineQuantity(owner, MILK, bad, HUB)).rejects.toThrow(
        RangeError
      );
    }
  });

  it("survives two first adds at once on a new Cart", async () => {
    const owner = guest();
    const results = await Promise.all([
      setLineQuantity(owner, MILK, 1, HUB),
      setLineQuantity(owner, LIEMPO, 1, HUB),
      setLineQuantity(owner, MILK, 2, HUB),
    ]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await db.cart.count()).toBe(1);
    expect(Object.keys(await getCartQuantities(owner)).sort()).toEqual(
      [MILK, LIEMPO].sort()
    );
  });

  it("treats a missing or forged guest token as an empty Cart", async () => {
    expect((await getCart(null, ctx)).lines).toEqual([]);
    expect((await getCart({ guestToken: "forged" }, ctx)).lines).toEqual([]);
    expect(await getCartQuantities({ guestToken: newGuestToken() })).toEqual(
      {}
    );
  });

  it("stores only a hash of the guest token", async () => {
    const owner = guest();
    await setLineQuantity(owner, MILK, 1, HUB);
    const row = await db.cart.findFirstOrThrow();
    expect(row.guestTokenHash).not.toBe(
      (owner as { guestToken: string }).guestToken
    );
    expect(row.guestTokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("Cart change flags", () => {
  it("flags a price change until the line is touched again", async () => {
    const owner = guest();
    await setLineQuantity(owner, MILK, 1, HUB);
    const before = (await getCart(owner, ctx)).lines[0];
    expect(before.priceWasCents).toBeNull();

    await db.product.update({
      where: { id: MILK },
      data: { priceCents: before.product.priceCents + 500 },
    });
    const after = (await getCart(owner, ctx)).lines[0];
    expect(after.priceWasCents).toBe(before.product.priceCents);
    expect(after.product.priceCents).toBe(before.product.priceCents + 500);

    await setLineQuantity(owner, MILK, 2, HUB);
    expect((await getCart(owner, ctx)).lines[0].priceWasCents).toBeNull();
  });

  it("flags stock that ran out or ran short, and leaves sold-out lines out of the total", async () => {
    const owner = guest();
    await setLineQuantity(owner, MILK, 2, HUB);
    await setLineQuantity(owner, MANGOES, 3, HUB);
    await db.stockLevel.update({
      where: { productId_hubId: { productId: MANGOES, hubId: HUB } },
      data: { reserved: 2 },
    });
    let cart = await getCart(owner, ctx);
    const mangoes = cart.lines.find((l) => l.product.id === MANGOES)!;
    expect(mangoes).toMatchObject({ stock: "low", short: true });

    await db.stockLevel.update({
      where: { productId_hubId: { productId: MILK, hubId: HUB } },
      data: { onHand: 0 },
    });
    cart = await getCart(owner, ctx);
    expect(cart.lines.find((l) => l.product.id === MILK)).toMatchObject({
      stock: "out",
      short: true,
    });
    expect(cart.priced.lines.map((l) => l.productId)).toEqual([MANGOES]);
  });

  it("counts lines whose Product is no longer sold, outside the total", async () => {
    const owner = guest();
    await setLineQuantity(owner, MILK, 1, HUB);
    await setLineQuantity(owner, LIEMPO, 1, HUB);
    await db.product.update({
      where: { id: MILK },
      data: { status: "archived" },
    });
    const cart = await getCart(owner, ctx);
    expect(cart.unavailableCount).toBe(1);
    expect(cart.lines.map((l) => l.product.id)).toEqual([LIEMPO]);
    expect(cart.itemCount).toBe(1);
  });
});

describe("Substitution Preference and notes", () => {
  it("stores allow, a chosen alternative, or none", async () => {
    const owner = guest();
    await setLineQuantity(owner, MILK, 1, HUB);
    const alt = product("nestle-low-fat-milk");
    expect(
      await setSubstitution(owner, MILK, {
        preference: "preferred",
        preferredProductId: alt,
      })
    ).toBe(true);
    expect((await getCart(owner, ctx)).lines[0].substitution).toEqual({
      preference: "preferred",
      preferredProductId: alt,
    });
    expect(
      await setSubstitution(owner, MILK, {
        preference: "none",
        preferredProductId: alt,
      })
    ).toBe(true);
    expect((await getCart(owner, ctx)).lines[0].substitution).toEqual({
      preference: "none",
      preferredProductId: null,
    });
  });

  it("refuses a chosen alternative that is missing, the same Product, or not sold", async () => {
    const owner = guest();
    await setLineQuantity(owner, MILK, 1, HUB);
    for (const bad of [null, MILK, "00000000-0000-0000-0000-000000000000"]) {
      expect(
        await setSubstitution(owner, MILK, {
          preference: "preferred",
          preferredProductId: bad,
        })
      ).toBe(false);
    }
    expect(
      await setSubstitution(owner, LIEMPO, {
        preference: "none",
        preferredProductId: null,
      })
    ).toBe(false);
  });

  it("keeps a short, trimmed note per line", async () => {
    const owner = guest();
    await setLineQuantity(owner, LIEMPO, 1, HUB);
    expect(await setLineNote(owner, LIEMPO, "  lean cuts please  ")).toBe(true);
    expect((await getCart(owner, ctx)).lines[0].note).toBe("lean cuts please");
    expect(await setLineNote(owner, LIEMPO, "   ")).toBe(true);
    expect((await getCart(owner, ctx)).lines[0].note).toBeNull();
    expect(await setLineNote(owner, LIEMPO, "x".repeat(201))).toBe(false);
  });
});

describe("mergeGuestCart", () => {
  it("sums quantities into the Customer's Cart, capped by stock, and drops the guest Cart", async () => {
    const shopper = guest();
    const signedIn = await customer("ligaya@example.com");
    await setLineQuantity(signedIn, MANGOES, 2, HUB);
    await setLineQuantity(signedIn, MILK, 1, HUB);
    await setSubstitution(signedIn, MILK, {
      preference: "none",
      preferredProductId: null,
    });
    await setLineQuantity(shopper, MANGOES, 2, HUB);
    await setLineQuantity(shopper, MILK, 2, HUB);
    await setLineQuantity(shopper, LIEMPO, 1, HUB);

    await mergeGuestCart(
      (shopper as { guestToken: string }).guestToken,
      (signedIn as { customerId: string }).customerId,
      HUB
    );

    expect(await getCartQuantities(signedIn)).toEqual({
      [MANGOES]: 3,
      [MILK]: 3,
      [LIEMPO]: 1,
    });
    expect(
      (await getCart(signedIn, ctx)).lines.find((l) => l.product.id === MILK)!
        .substitution.preference
    ).toBe("none");
    expect(await getCartQuantities(shopper)).toEqual({});
    expect(await db.cart.count()).toBe(1);
  });

  it("hands the guest Cart over when the Customer has none", async () => {
    const shopper = guest();
    const signedIn = await customer("paolo@example.com");
    await setLineQuantity(shopper, MILK, 2, HUB);
    await mergeGuestCart(
      (shopper as { guestToken: string }).guestToken,
      (signedIn as { customerId: string }).customerId,
      HUB
    );
    expect(await getCartQuantities(signedIn)).toEqual({ [MILK]: 2 });
    expect(await db.cart.count()).toBe(1);
  });

  it("merges once when sign-in fires twice at the same moment", async () => {
    const shopper = guest();
    const signedIn = await customer("ligaya@example.com");
    await setLineQuantity(signedIn, MILK, 1, HUB);
    await setLineQuantity(shopper, MILK, 2, HUB);
    const token = (shopper as { guestToken: string }).guestToken;
    const id = (signedIn as { customerId: string }).customerId;
    await Promise.all([
      mergeGuestCart(token, id, HUB),
      mergeGuestCart(token, id, HUB),
    ]);
    expect(await getCartQuantities(signedIn)).toEqual({ [MILK]: 3 });
  });
});
