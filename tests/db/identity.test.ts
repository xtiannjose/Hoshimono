import { randomUUID } from "node:crypto";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { customerForUser } from "@/modules/customers";
import {
  addStaff,
  listAudits,
  listRiders,
  listStaff,
  recordAudits,
  safeNext,
  staffForUser,
  updateStaff,
} from "@/modules/identity";

import { createTestDb, resetDb } from "./helpers";

const db = createTestDb();

beforeEach(() => resetDb(db));
afterAll(() => db.$disconnect());

async function authUser(email: string, emailVerified = true) {
  return db.authUser.create({
    data: { id: randomUUID(), name: "", email, emailVerified },
  });
}

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/account")).toBe("/account");
    expect(safeNext("/admin?tab=orders")).toBe("/admin?tab=orders");
    expect(safeNext("/orders/SW-261018-ABCD#top")).toBe(
      "/orders/SW-261018-ABCD#top"
    );
    // An encoded tab stays a harmless path segment.
    expect(safeNext("/%09/evil.example")).toBe("/%09/evil.example");
  });

  it("falls back to /account for anything that could leave the site", () => {
    for (const bad of [
      "//evil.example",
      "/\\evil.example",
      // Browsers drop tabs and newlines in URLs, so these become //evil.example.
      "/\t/evil.example",
      "/\n/evil.example",
      "/\r//evil.example",
      "/\u0000/evil.example",
      "https://evil.example",
      "account",
      "",
      null,
      undefined,
    ]) {
      expect(safeNext(bad), String(bad)).toBe("/account");
    }
  });
});

describe("customerForUser", () => {
  it("creates a Customer on first sign-in and reuses it after", async () => {
    const user = await authUser("ligaya@example.com");
    const first = await customerForUser(db, user);
    const again = await customerForUser(db, user);
    expect(again.id).toBe(first.id);
    expect(first.email).toBe("ligaya@example.com");
    expect(first.name).toBe("ligaya");
    expect(await db.customer.count()).toBe(1);
  });

  it("creates one Customer when two parts of a page ask at once", async () => {
    const user = await authUser("new.shopper@example.com");
    const [a, b, c] = await Promise.all([
      customerForUser(db, user),
      customerForUser(db, user),
      customerForUser(db, user),
    ]);
    expect(new Set([a.id, b.id, c.id]).size).toBe(1);
    expect(await db.customer.count()).toBe(1);
  });

  it("links an existing Customer with the same verified email", async () => {
    const existing = await db.customer.create({
      data: { name: "Ligaya Dimaculangan", email: "ligaya@example.com" },
    });
    const user = await authUser("ligaya@example.com");
    const customer = await customerForUser(db, user);
    expect(customer.id).toBe(existing.id);
    expect(customer.authUserId).toBe(user.id);
  });

  it("never links by an unverified email", async () => {
    const existing = await db.customer.create({
      data: { name: "Ligaya Dimaculangan", email: "ligaya@example.com" },
    });
    const user = await authUser("ligaya@example.com", false);
    const customer = await customerForUser(db, user);
    expect(customer.id).not.toBe(existing.id);
    expect(customer.email).toBeNull();
    const untouched = await db.customer.findUniqueOrThrow({
      where: { id: existing.id },
    });
    expect(untouched.authUserId).toBeNull();
  });
});

describe("customerForUser with a mobile number", () => {
  async function phoneUser(phone: string, verified = true) {
    return db.authUser.create({
      data: {
        id: randomUUID(),
        name: phone,
        email: `${phone.slice(1)}@phone.hoshimono.invalid`,
        emailVerified: false,
        phoneNumber: phone,
        phoneNumberVerified: verified,
      },
    });
  }

  it("links an existing Customer with the same verified mobile number", async () => {
    const existing = await db.customer.create({
      data: { name: "Paolo Villanueva", phone: "+639171234502" },
    });
    const customer = await customerForUser(
      db,
      await phoneUser("+639171234502")
    );
    expect(customer.id).toBe(existing.id);
  });

  it("creates a Customer with the number, never the stand-in email", async () => {
    const customer = await customerForUser(
      db,
      await phoneUser("+639171234599")
    );
    expect(customer).toMatchObject({ phone: "+639171234599", email: null });
  });

  it("leaves a number that belongs to another account where it is", async () => {
    const owner = await customerForUser(
      db,
      await authUser("paolo@example.com")
    );
    await db.customer.update({
      where: { id: owner.id },
      data: { phone: "+639171234502" },
    });
    const customer = await customerForUser(
      db,
      await phoneUser("+639171234502")
    );
    expect(customer.id).not.toBe(owner.id);
    expect(customer.phone).toBeNull();
  });

  it("never links or stores an unverified number", async () => {
    const existing = await db.customer.create({
      data: { name: "Paolo Villanueva", phone: "+639171234502" },
    });
    const customer = await customerForUser(
      db,
      await phoneUser("+639171234502", false)
    );
    expect(customer.id).not.toBe(existing.id);
    expect(customer.phone).toBeNull();
  });
});

describe("staffForUser", () => {
  async function staff(
    role: "admin" | "dispatcher" | "merchandiser" | "picker",
    isActive = true
  ) {
    return db.staff.create({
      data: {
        email: `${role}@hoshimono.test`,
        name: "Arnel Bautista",
        role,
        isActive,
      },
    });
  }

  it("links Staff by verified email and lets them into their area", async () => {
    const dispatcher = await staff("dispatcher");
    const user = await authUser("dispatcher@hoshimono.test");
    const found = await staffForUser(db, user, "orders");
    expect(found?.id).toBe(dispatcher.id);
    expect(found?.authUserId).toBe(user.id);
  });

  it("refuses an unverified email and does not link it", async () => {
    const dispatcher = await staff("dispatcher");
    const user = await authUser("dispatcher@hoshimono.test", false);
    expect(await staffForUser(db, user, "orders")).toBeNull();
    const row = await db.staff.findUniqueOrThrow({
      where: { id: dispatcher.id },
    });
    expect(row.authUserId).toBeNull();
  });

  it("keeps each role to its areas; admins use every area", async () => {
    await staff("dispatcher");
    await staff("merchandiser");
    await staff("picker");
    await staff("admin");
    const dispatcher = await authUser("dispatcher@hoshimono.test");
    const merchandiser = await authUser("merchandiser@hoshimono.test");
    const picker = await authUser("picker@hoshimono.test");
    const admin = await authUser("admin@hoshimono.test");
    expect(await staffForUser(db, dispatcher, "catalog")).toBeNull();
    expect(await staffForUser(db, merchandiser, "orders")).toBeNull();
    expect(await staffForUser(db, merchandiser, "staff")).toBeNull();
    expect(await staffForUser(db, picker, "orders")).toBeNull();
    expect(await staffForUser(db, picker, "picking")).not.toBeNull();
    expect(await staffForUser(db, dispatcher, "picking")).toBeNull();
    expect(await staffForUser(db, dispatcher, "dispatch")).not.toBeNull();
    expect(await staffForUser(db, dispatcher, "delivery")).toBeNull();
    for (const area of [
      "picking",
      "dispatch",
      "delivery",
      "catalog",
      "orders",
      "refunds",
      "staff",
      "audit",
    ] as const) {
      expect(await staffForUser(db, admin, area), area).not.toBeNull();
    }
  });

  it("refuses inactive Staff and people who are not Staff", async () => {
    await staff("merchandiser", false);
    const inactive = await authUser("merchandiser@hoshimono.test");
    const shopper = await authUser("ligaya@example.com");
    expect(await staffForUser(db, inactive, "catalog")).toBeNull();
    expect(await staffForUser(db, shopper, "orders")).toBeNull();
  });
});

describe("managing Staff", () => {
  const admin = () =>
    db.staff.create({
      data: {
        email: "admin@hoshimono.test",
        name: "Rafael Cruz",
        role: "admin",
      },
    });

  it("adds Staff with a role, refusing a bad email or one already used", async () => {
    await admin();
    expect(
      await addStaff({
        name: " Arnel Bautista ",
        email: "Arnel@Hoshimono.test ",
        role: "picker",
      })
    ).toEqual({ ok: true, id: expect.any(String) });
    expect(await addStaff({ name: "", email: "nope", role: "picker" })).toEqual(
      {
        ok: false,
        errors: { name: "Enter a name.", email: "Enter an email address." },
      }
    );
    expect(
      await addStaff({
        name: "Arnel",
        email: "arnel@hoshimono.test",
        role: "picker",
      })
    ).toEqual({
      ok: false,
      errors: { email: "This email already belongs to a staff member." },
    });
    expect(
      await addStaff({
        name: "Joanna Lim",
        email: "joanna@hoshimono.test",
        role: "owner",
      })
    ).toEqual({ ok: false, errors: { role: "Choose a role." } });

    expect(
      (await listStaff()).map((s) => [s.name, s.email, s.role, s.isActive])
    ).toEqual([
      ["Arnel Bautista", "arnel@hoshimono.test", "picker", true],
      ["Rafael Cruz", "admin@hoshimono.test", "admin", true],
    ]);
  });

  it("changes roles and switches accounts off, but never your own", async () => {
    const boss = await admin();
    const marites = await db.staff.create({
      data: {
        email: "marites@hoshimono.test",
        name: "Marites Aquino",
        role: "dispatcher",
      },
    });

    expect(
      await updateStaff(marites.id, { role: "merchandiser" }, boss.id)
    ).toEqual({
      ok: true,
    });
    expect(await updateStaff(marites.id, { isActive: false }, boss.id)).toEqual(
      {
        ok: true,
      }
    );
    // The acting admin stays an active admin, so an admin always remains.
    expect(await updateStaff(boss.id, { role: "picker" }, boss.id)).toEqual({
      ok: false,
      errors: { role: "You cannot change your own role." },
    });
    expect(await updateStaff(boss.id, { isActive: false }, boss.id)).toEqual({
      ok: false,
      errors: { isActive: "You cannot switch your own account off." },
    });

    const listed = await listStaff();
    expect(listed.find((s) => s.id === marites.id)).toMatchObject({
      role: "merchandiser",
      isActive: false,
    });
    // Switched off: sign-in no longer opens anything.
    const user = await authUser("marites@hoshimono.test");
    expect(await staffForUser(db, user, "catalog")).toBeNull();
  });

  it("keeps a Rider's mobile number, and lists active Riders for dispatch", async () => {
    await admin();
    expect(
      await addStaff({
        name: "Jun Dela Rosa",
        email: "jun@hoshimono.test",
        role: "rider",
        phone: "0917 123 4599",
      })
    ).toMatchObject({ ok: true });
    expect(
      await addStaff({
        name: "Ben Cruz",
        email: "ben@hoshimono.test",
        role: "rider",
        phone: "12345",
      })
    ).toEqual({
      ok: false,
      errors: { phone: "Enter a mobile number like 0917 123 4567." },
    });
    const off = await db.staff.create({
      data: {
        email: "off@hoshimono.test",
        name: "Ramon",
        role: "rider",
        isActive: false,
      },
    });

    const riders = await listRiders();
    expect(riders).toEqual([
      expect.objectContaining({
        name: "Jun Dela Rosa",
        phone: "+639171234599",
      }),
    ]);
    expect(riders.map((r) => r.id)).not.toContain(off.id);
  });

  it("lists the audit log newest first, with who did it", async () => {
    const boss = await admin();
    await recordAudits([
      { staffId: boss.id, action: "create", entity: "staff", entityId: "a" },
    ]);
    await recordAudits([
      { staffId: boss.id, action: "update", entity: "order", entityId: "b" },
    ]);

    const all = await listAudits({});
    expect(all.map((a) => [a.action, a.entity, a.staffName])).toEqual([
      ["update", "order", "Rafael Cruz"],
      ["create", "staff", "Rafael Cruz"],
    ]);
    expect(
      (await listAudits({ entity: "staff" })).map((a) => a.entityId)
    ).toEqual(["a"]);
  });
});
