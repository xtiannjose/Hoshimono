import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/modules/identity";

export const metadata: Metadata = { title: "Admin" };

// Placeholder until Batch 1.4 builds the admin catalogue.
export default function AdminPage() {
  return (
    <section className="wrap py-14 md:py-20">
      <h1 className="type-h1">Admin</h1>
      <Suspense fallback={<Skeleton className="mt-6 h-6 w-64" />}>
        <StaffGreeting />
      </Suspense>
    </section>
  );
}

async function StaffGreeting() {
  const staff = await requireStaff("admin", "/admin");
  return (
    <p className="mt-6">
      Signed in as {staff.name} ({staff.role})
    </p>
  );
}
