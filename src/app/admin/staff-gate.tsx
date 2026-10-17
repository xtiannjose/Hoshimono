import type { ReactNode } from "react";

import { requireStaff } from "@/modules/identity";

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
      <div className="rounded-pill bg-muted h-10 w-64 animate-pulse" />
      <div className="rounded-card bg-muted h-64 animate-pulse" />
    </div>
  );
}
