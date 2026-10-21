import type { Metadata } from "next";
import { Suspense } from "react";

import { listStaff } from "@/modules/identity";

import { AdminSkeleton, StaffGate } from "../staff-gate";
import { AddStaffForm, StaffRowForm } from "./forms";

export const metadata: Metadata = { title: "Staff" };

export default function AdminStaff() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/staff" area="staff">
        <Staff />
      </StaffGate>
    </Suspense>
  );
}

/** Who works at the Hub and what each may open (PRD ADM-11). */
async function Staff() {
  const staff = await listStaff();
  return (
    <section className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="type-h2">Staff</h1>
        <p className="text-muted-foreground max-w-2xl">
          People sign in with the email given here. You cannot change your own
          role or switch yourself off, so the shop always keeps an admin.
        </p>
      </div>
      <AddStaffForm />
      <ul className="divide-border grid max-w-5xl divide-y">
        {staff.map((s) => (
          <li key={s.id} className="grid gap-2 py-4">
            <p>
              <b>{s.name}</b>{" "}
              <span className="text-muted-foreground">{s.email}</span>
              {!s.isActive && (
                <span className="text-warn ml-2 text-sm font-semibold">
                  Switched off
                </span>
              )}
              {s.isActive && !s.linked && (
                <span className="text-muted-foreground ml-2 text-sm">
                  Has not signed in yet
                </span>
              )}
            </p>
            <StaffRowForm
              id={s.id}
              name={s.name}
              role={s.role}
              isActive={s.isActive}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
