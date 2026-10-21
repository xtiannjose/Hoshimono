import Link from "next/link";
import { Suspense } from "react";

import { requireAnyStaff, staffAreas } from "@/modules/identity";

import { AREA_LINKS } from "./areas";
import { AdminSkeleton } from "./staff-gate";

export default function AdminHome() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const staff = await requireAnyStaff("/admin");
  const links = staffAreas(staff.role).flatMap((a) => AREA_LINKS[a]);
  return (
    <section className="grid max-w-xl gap-4">
      <h1 className="type-h2">Admin</h1>
      <p>
        Signed in as {staff.name} ({staff.role})
      </p>
      {links.length === 0 ? (
        <p className="text-muted-foreground">Nothing for your role here yet.</p>
      ) : (
        <ul className="grid gap-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="font-semibold underline underline-offset-4"
              >
                {l.label}
              </Link>
              <span className="text-muted-foreground">: {l.hint}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
