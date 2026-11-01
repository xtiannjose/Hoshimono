import Link from "next/link";
import { Suspense } from "react";

import { requireAnyStaff, staffAreas } from "@/modules/identity";

import { AREA_GROUPS, AREA_LINKS } from "./areas";
import { ROLE_NAME } from "./role-names";
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
  const allowed = new Set(staffAreas(staff.role));
  const groups = AREA_GROUPS.map((g) => ({
    label: g.label,
    links: g.areas.filter((a) => allowed.has(a)).flatMap((a) => AREA_LINKS[a]),
  })).filter((g) => g.links.length > 0);
  return (
    <section className="grid max-w-4xl gap-6">
      <div>
        <h1 className="type-h2">Hello, {staff.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">
          Signed in as {ROLE_NAME[staff.role]}.
        </p>
      </div>
      {groups.length === 0 ? (
        <p className="text-muted-foreground">Nothing for your role here yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {groups.map((g) => (
            <section
              key={g.label}
              aria-label={g.label}
              className="grid content-start gap-2"
            >
              <h2 className="text-muted-foreground text-sm font-bold">
                {g.label}
              </h2>
              <ul className="grid gap-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="rounded-card border-border bg-card hover:border-border-strong grid gap-0.5 border px-4 py-3"
                    >
                      <b>{l.label}</b>
                      <span className="text-muted-foreground text-sm">
                        {l.hint}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
