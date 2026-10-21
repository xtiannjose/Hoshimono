import type { ReactNode } from "react";

import { requireStaff, type StaffArea } from "@/modules/identity";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Renders its children only for Staff who may open `area` (the catalogue
 * by default); others are sent to sign in, or get a 404. Place inside
 * <Suspense>: it reads the session.
 */
export async function StaffGate({
  next,
  area = "catalog",
  children,
}: {
  next: string;
  area?: StaffArea;
  children: ReactNode;
}) {
  await requireStaff(area, next);
  return <>{children}</>;
}

export function AdminSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid gap-3">
      <Skeleton className="rounded-pill h-10 w-64" />
      <Skeleton className="rounded-card h-64" />
    </div>
  );
}
