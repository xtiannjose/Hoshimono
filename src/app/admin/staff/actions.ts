"use server";

import { refresh } from "next/cache";

import { addStaff, requireStaff, updateStaff } from "@/modules/identity";

import { adminWrite } from "../admin-write";

export type StaffFormState = {
  errors: Record<string, string>;
  saved?: boolean;
};

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Add a Staff member (admins only, PRD ADM-11). */
export async function addStaffAction(
  _prev: StaffFormState,
  fd: FormData
): Promise<StaffFormState> {
  const admin = await requireStaff("staff", "/admin/staff");
  const input = {
    name: text(fd, "name"),
    email: text(fd, "email"),
    role: text(fd, "role"),
  };
  const result = await adminWrite(
    admin.id,
    (tx) => addStaff(input, tx),
    (done) => [
      { action: "create", entity: "staff", entityId: done.id, after: input },
    ]
  );
  if (!result.ok) return { errors: result.errors };
  refresh();
  return { errors: {}, saved: true };
}

/** Change a role or switch an account off or on. */
export async function updateStaffAction(
  id: string,
  _prev: StaffFormState,
  fd: FormData
): Promise<StaffFormState> {
  const admin = await requireStaff("staff", "/admin/staff");
  const patch = {
    role: text(fd, "role"),
    isActive: fd.get("isActive") === "on",
  };
  const result = await adminWrite(
    admin.id,
    (tx) => updateStaff(id, patch, admin.id, tx),
    () => [{ action: "update", entity: "staff", entityId: id, after: patch }]
  );
  if (!result.ok) return { errors: result.errors };
  refresh();
  return { errors: {}, saved: true };
}
