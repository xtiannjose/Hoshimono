import { z } from "zod";

import { db } from "@/lib/db";
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

export type SaveAddressResult =
  | { ok: true; address: AddressView }
  | { ok: false; errors: Partial<Record<AddressField, string>> };

const text = (min: number, max: number, message: string) =>
  z
    .string(message)
    .trim()
    .min(min, message)
    .max(max, `Keep this under ${max} characters.`);

const addressInput = z.object({
  label: text(1, 40, "Give this address a name, such as Home."),
  line1: text(3, 120, "Enter the house or unit number and street."),
  barangay: text(2, 60, "Enter the barangay."),
  city: text(2, 60, "Choose the city."),
  landmark: text(3, 120, "Add a landmark so the Rider can find you."),
  notes: z
    .string()
    .trim()
    .max(200, "Keep notes under 200 characters.")
    .nullish()
    .transform((v) => v || null),
  isDefault: z.boolean().optional(),
});

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
  if (!z.guid().safeParse(id).success) return null;
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
    const errors: Partial<Record<AddressField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = (issue.path[0] ?? "area") as AddressField;
      errors[field] ??= issue.message;
    }
    if (Object.keys(errors).length === 0)
      errors.area = "Please check the address.";
    return { ok: false, errors };
  }
  const { isDefault, ...fields } = parsed.data;

  const zone = await resolveZone(fields);
  if (!zone) {
    return {
      ok: false,
      errors: {
        area: `We do not deliver to ${fields.barangay}, ${fields.city} yet.`,
      },
    };
  }

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
      if (count === 0) {
        return {
          ok: false,
          errors: { area: "We could not find that address." },
        };
      }
    } else {
      if (others.length >= MAX_ADDRESSES) {
        return {
          ok: false,
          errors: {
            area: `You can keep up to ${MAX_ADDRESSES} addresses. Remove one first.`,
          },
        };
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
