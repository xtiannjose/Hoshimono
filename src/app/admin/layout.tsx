import type { Metadata } from "next";
import { Suspense } from "react";

import { BrandLogo } from "@/components/shell/brand-logo";
import { currentStaff, staffAreas } from "@/modules/identity";

import { Document } from "../root-shell";
import { AdminMenu } from "./admin-menu";
import { AREA_GROUPS, AREA_LINKS } from "./areas";
import { ROLE_NAME } from "./role-names";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false },
};

// Dense staff screens with a frame of their own (ADR 0018): no shopper
// header, Cart or language switch. English, no Motion (docs/05 section 9).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Document lang="en">
      <div className="flex-1 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="border-border bg-surface-2 relative border-b px-3 py-3 lg:border-r lg:border-b-0 print:hidden">
          <div className="lg:sticky lg:top-0 lg:flex lg:max-h-dvh lg:min-h-[calc(100dvh-1.5rem)] lg:flex-col lg:overflow-y-auto lg:pt-3">
            <div className="flex min-h-11 items-baseline gap-2 px-3">
              <BrandLogo className="text-[20px]" />
              <span className="text-muted-foreground text-xs font-bold">
                Staff
              </span>
            </div>
            <Suspense fallback={null}>
              <Menu />
            </Suspense>
          </div>
        </aside>
        <main id="main" className="min-w-0 px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </Document>
  );
}

/** Only the areas this Staff member's role may open (PRD ADM-11). */
async function Menu() {
  const staff = await currentStaff();
  const allowed = new Set(staff ? staffAreas(staff.role) : []);
  const groups = AREA_GROUPS.map((g) => ({
    label: g.label,
    links: g.areas
      .filter((a) => allowed.has(a))
      .flatMap((a) =>
        AREA_LINKS[a].map(({ href, label }) => ({ href, label }))
      ),
  })).filter((g) => g.links.length > 0);
  return (
    <AdminMenu
      groups={groups}
      staff={staff && { name: staff.name, role: ROLE_NAME[staff.role] }}
    />
  );
}
