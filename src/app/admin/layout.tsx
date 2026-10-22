import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { currentStaff, staffAreas } from "@/modules/identity";

import { RootShell } from "../root-shell";
import { AREA_LINKS } from "./areas";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false },
};

// Dense admin screens: same tokens, no Motion (docs/05 section 9). A root
// layout of its own, in English (ADR 0017).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <RootShell lang="en">
      <div className="wrap py-6">
        <Suspense
          fallback={<div className="border-border mb-6 h-11 border-b" />}
        >
          <AdminNav />
        </Suspense>
        {children}
      </div>
    </RootShell>
  );
}

/** Only the areas this Staff member's role may open (PRD ADM-11). */
async function AdminNav() {
  const staff = await currentStaff();
  const links = staff
    ? staffAreas(staff.role).flatMap((a) => AREA_LINKS[a])
    : [];
  return (
    <nav
      aria-label="Admin"
      className="border-border mb-6 flex min-h-11 flex-wrap gap-1 border-b print:hidden"
    >
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center border-b-2 border-transparent px-3 font-semibold"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
