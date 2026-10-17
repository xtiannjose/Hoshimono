import Link from "next/link";
import { Suspense } from "react";

import { requireStaff } from "@/modules/identity";

import { AdminSkeleton } from "./staff-gate";

export default function AdminHome() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const staff = await requireStaff("merchandiser", "/admin");
  return (
    <section className="grid max-w-xl gap-4">
      <h1 className="type-h2">Admin</h1>
      <p>
        Signed in as {staff.name} ({staff.role})
      </p>
      <ul className="grid gap-2">
        <li>
          <Link
            href="/admin/products"
            className="font-semibold underline underline-offset-4"
          >
            Products: edit, add photos, change status
          </Link>
        </li>
        <li>
          <Link
            href="/admin/categories"
            className="font-semibold underline underline-offset-4"
          >
            Categories: rename, move, reorder
          </Link>
        </li>
        <li>
          <Link
            href="/admin/import"
            className="font-semibold underline underline-offset-4"
          >
            Import and export Products as CSV
          </Link>
        </li>
      </ul>
    </section>
  );
}
