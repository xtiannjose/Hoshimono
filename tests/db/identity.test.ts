import { randomUUID } from "node:crypto";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { customerForUser, safeNext, staffForUser } from "@/modules/identity";

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
  });

  it("falls back to /account for anything that could leave the site", () => {
    for (const bad of [
      "//evil.example",
      "/\\evil.example",
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

describe("staffForUser", () => {
  async function staff(
    role: "admin" | "picker" | "merchandiser",
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

  it("links Staff by verified email and allows their role", async () => {
    const picker = await staff("picker");
    const user = await authUser("picker@hoshimono.test");
    const found = await staffForUser(db, user, "picker");
    expect(found?.id).toBe(picker.id);
    expect(found?.authUserId).toBe(user.id);
  });

  it("refuses an unverified email and does not link it", async () => {
    const picker = await staff("picker");
    const user = await authUser("picker@hoshimono.test", false);
    expect(await staffForUser(db, user, "picker")).toBeNull();
    const row = await db.staff.findUniqueOrThrow({ where: { id: picker.id } });
    expect(row.authUserId).toBeNull();
  });

  it("refuses the wrong role, but admins pass every role", async () => {
    await staff("picker");
    await staff("admin");
    const picker = await authUser("picker@hoshimono.test");
    const admin = await authUser("admin@hoshimono.test");
    expect(await staffForUser(db, picker, "merchandiser")).toBeNull();
    expect(await staffForUser(db, admin, "picker")).not.toBeNull();
  });

  it("refuses inactive Staff and people who are not Staff", async () => {
    await staff("merchandiser", false);
    const inactive = await authUser("merchandiser@hoshimono.test");
    const shopper = await authUser("ligaya@example.com");
    expect(await staffForUser(db, inactive, "merchandiser")).toBeNull();
    expect(await staffForUser(db, shopper, "picker")).toBeNull();
  });
});
