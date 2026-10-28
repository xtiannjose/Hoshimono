import { z } from "zod";

import { db } from "@/lib/db";
import { isUuid } from "@/lib/uuid";
import { resolveZone } from "@/modules/delivery";

/** Enough for home, work and family; stops a script filling the table. */
export const MAX_ADDRESSES = 10;

export type AddressView = {
  id: string;
  label: string;
  line1: string;
  barangay: string;
  city: string;
  landmark: string;
  notes: string | null;
  isDefault: boolean;
  zoneId: string | null;
};

export type AddressField =
  "label" | "line1" | "barangay" | "city" | "landmark" | "notes" | "area";

/** What is wrong with a field; the shop words it in its language (ADR 0019). */
export type AddressProblem =
  | "no_label"
  | "no_street"
  | "no_barangay"
  | "no_city"
  | "no_landmark"
  | "too_long"
  | "not_served"
  | "not_found"
  | "too_many"
  | "invalid";

export type SaveAddressResult =
  | { ok: true; address: AddressView }
  | { ok: false; errors: Partial<Record<AddressField, AddressProblem>> };

// Every rule's message is an AddressProblem, so any issue maps to one.
const text = (min: number, max: number, missing: AddressProblem) =>
  z.string(missing).trim().min(min, missing).max(max, "too_long");

const addressInput = z.object(
  {
    label: text(1, 40, "no_label"),
    line1: text(3, 120, "no_street"),
    barangay: text(2, 60, "no_barangay"),
    city: text(2, 60, "no_city"),
    landmark: text(3, 120, "no_landmark"),
    notes: z
      .string("invalid")
      .trim()
      .max(200, "too_long")
      .nullish()
      .transform((v) => v || null),
    isDefault: z.boolean("invalid").optional(),
  },
  "invalid"
);

const select = {
  id: true,
  label: true,
  line1: true,
  barangay: true,
  city: true,
  landmark: true,
  notes: true,
  isDefault: true,
  zoneId: true,
} as const;

/** The Customer's addresses, default first, then oldest first. */
export async function listAddresses(
  customerId: string
): Promise<AddressView[]> {
  return db.address.findMany({
    where: { customerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select,
  });
}

export async function getAddress(
  customerId: string,
  id: string
): Promise<AddressView | null> {
  if (!isUuid(id)) return null;
  return db.address.findFirst({ where: { id, customerId }, select });
}

export async function getDefaultAddress(
  customerId: string
): Promise<AddressView | null> {
  return db.address.findFirst({
    where: { customerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select,
  });
}

/**
 * Add or edit an address. Only places a Zone serves are saved, so Checkout
 * never meets an address we cannot deliver to (PRD CHK-5). The first
 * address, or one marked default, becomes the default.
 */
export async function saveAddress(
  customerId: string,
  input: unknown,
  addressId?: string
): Promise<SaveAddressResult> {
  const parsed = addressInput.safeParse(input);
  if (!parsed.success) {
    const errors: Partial<Record<AddressField, AddressProblem>> = {};
    for (const issue of parsed.error.issues) {
      const field = (issue.path[0] ?? "area") as AddressField;
      errors[field] ??= issue.message as AddressProblem;
    }
    if (Object.keys(errors).length === 0) errors.area = "invalid";
    return { ok: false, errors };
  }
  const { isDefault, ...fields } = parsed.data;

  const zone = await resolveZone(fields);
  if (!zone) return { ok: false, errors: { area: "not_served" } };

  return db.$transaction(async (tx) => {
    const others = await tx.address.findMany({
      where: { customerId, id: addressId ? { not: addressId } : undefined },
      select: { id: true, isDefault: true },
    });
    let id = addressId;
    if (id) {
      const { count } = await tx.address.updateMany({
        where: { id, customerId },
        data: { ...fields, zoneId: zone.zoneId },
      });
      if (count === 0) return { ok: false, errors: { area: "not_found" } };
    } else {
      if (others.length >= MAX_ADDRESSES) {
        return { ok: false, errors: { area: "too_many" } };
      }
      id = (
        await tx.address.create({
          data: { ...fields, customerId, zoneId: zone.zoneId },
          select: { id: true },
        })
      ).id;
    }
    if (isDefault || !others.some((a) => a.isDefault)) {
      await tx.address.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
      await tx.address.update({ where: { id }, data: { isDefault: true } });
    }
    const address = await tx.address.findUniqueOrThrow({
      where: { id },
      select,
    });
    return { ok: true, address };
  });
}

/** Make one of the Customer's addresses the default. */
export async function setDefaultAddress(
  customerId: string,
  id: string
): Promise<boolean> {
  if (!(await getAddress(customerId, id))) return false;
  await db.$transaction([
    db.address.updateMany({
      where: { customerId },
      data: { isDefault: false },
    }),
    db.address.updateMany({
      where: { id, customerId },
      data: { isDefault: true },
    }),
  ]);
  return true;
}

/** Delete an address; if it was the default, the oldest other one takes over. */
export async function deleteAddress(
  customerId: string,
  id: string
): Promise<boolean> {
  const address = await getAddress(customerId, id);
  if (!address) return false;
  await db.$transaction(async (tx) => {
    await tx.address.deleteMany({ where: { id, customerId } });
    if (!address.isDefault) return;
    const next = await tx.address.findFirst({
      where: { customerId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (next) {
      await tx.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  });
  return true;
}
