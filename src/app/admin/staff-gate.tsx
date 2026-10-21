import type { ReactNode } from "react";

import { requireStaff } from "@/modules/identity";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Renders its children only for a Merchandiser or Admin; others are sent
 * to sign in, or get a 404. Place inside <Suspense>: it reads the session.
 */
export async function StaffGate({
  next,
  children,
}: {
  next: string;
  children: ReactNode;
}) {
  await requireStaff("merchandiser", next);
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
