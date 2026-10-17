import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  deleteAddress,
  getDefaultAddress,
  listAddresses,
  saveAddress,
  setDefaultAddress,
  MAX_ADDRESSES,
} from "@/modules/customers";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

const db = createTestDb();
let ligaya: string;
let paolo: string;

const home = {
  label: "Home",
  line1: "12 Sampaguita Street",
  barangay: "Kapitolyo",
  city: "Pasig",
  landmark: "Across the green sari-sari store",
};

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, new Date("2026-10-18T20:00:00Z"));
  ligaya = (
    await db.customer.findUniqueOrThrow({
      where: { email: "ligaya@example.com" },
    })
  ).id;
  paolo = (
    await db.customer.findUniqueOrThrow({
      where: { email: "paolo@example.com" },
    })
  ).id;
}, 60_000);
beforeEach(() => db.address.deleteMany());
afterAll(() => db.$disconnect());

describe("saveAddress", () => {
  it("saves a served address with its Zone; the first one is the default", async () => {
    const result = await saveAddress(ligaya, { ...home, notes: "Ring twice" });
    expect(result).toMatchObject({
      ok: true,
      address: {
        ...home,
        notes: "Ring twice",
        isDefault: true,
        zoneId: seedId("zone:pasig-mandaluyong"),
      },
    });
    const second = await saveAddress(ligaya, {
      ...home,
      label: "Office",
      city: "Mandaluyong",
      barangay: "Wack-Wack",
    });
    expect(second).toMatchObject({ ok: true, address: { isDefault: false } });
  });

  it("explains in plain words when we do not deliver there", async () => {
    const result = await saveAddress(ligaya, {
      ...home,
      city: "Quezon City",
      barangay: "Diliman",
    });
    expect(result).toEqual({
      ok: false,
      errors: { area: "We do not deliver to Diliman, Quezon City yet." },
    });
    expect(await db.address.count()).toBe(0);
  });

  it("asks for each missing field, landmark included", async () => {
    const result = await saveAddress(ligaya, {
      ...home,
      line1: " ",
      landmark: "",
    });
    expect(result.ok).toBe(false);
    expect(Object.keys((result as { errors: object }).errors).sort()).toEqual([
      "landmark",
      "line1",
    ]);
    expect((await saveAddress(ligaya, null)).ok).toBe(false);
  });

  it("edits only the Customer's own address", async () => {
    const saved = await saveAddress(ligaya, home);
    const id = (saved as { address: { id: string } }).address.id;
    expect(
      await saveAddress(ligaya, { ...home, landmark: "Beside the chapel" }, id)
    ).toMatchObject({
      ok: true,
      address: { id, landmark: "Beside the chapel", isDefault: true },
    });
    expect(
      await saveAddress(paolo, { ...home, landmark: "Mine now" }, id)
    ).toEqual({
      ok: false,
      errors: { area: "We could not find that address." },
    });
  });

  it(`keeps at most ${MAX_ADDRESSES} addresses`, async () => {
    for (let i = 0; i < MAX_ADDRESSES; i++) {
      expect(
        (await saveAddress(ligaya, { ...home, label: `Place ${i}` })).ok
      ).toBe(true);
    }
    expect(
      await saveAddress(ligaya, { ...home, label: "One more" })
    ).toMatchObject({ ok: false });
  });
});

describe("default address", () => {
  it("moves the default, and promotes another when the default is deleted", async () => {
    const a = (await saveAddress(ligaya, home)) as { address: { id: string } };
    const b = (await saveAddress(ligaya, { ...home, label: "Office" })) as {
      address: { id: string };
    };
    expect(await setDefaultAddress(ligaya, b.address.id)).toBe(true);
    expect((await getDefaultAddress(ligaya))?.id).toBe(b.address.id);
    expect((await listAddresses(ligaya)).map((x) => x.id)).toEqual([
      b.address.id,
      a.address.id,
    ]);

    expect(await deleteAddress(ligaya, b.address.id)).toBe(true);
    expect((await getDefaultAddress(ligaya))?.id).toBe(a.address.id);
  });

  it("never lets one Customer change another's addresses", async () => {
    const a = (await saveAddress(ligaya, home)) as { address: { id: string } };
    expect(await setDefaultAddress(paolo, a.address.id)).toBe(false);
    expect(await deleteAddress(paolo, a.address.id)).toBe(false);
    expect(await listAddresses(paolo)).toEqual([]);
    expect(await db.address.count()).toBe(1);
  });
});
