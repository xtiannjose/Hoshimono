import type { Metadata } from "next";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dates";
import { listAudits } from "@/modules/identity";

import { AdminSkeleton, StaffGate } from "../staff-gate";

export const metadata: Metadata = { title: "Audit log" };

type Props = PageProps<"/admin/audit">;

const ENTITIES = {
  order: "Orders",
  product: "Products",
  category: "Categories",
  staff: "Staff",
  refund: "Refunds",
} as const;

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

/** A short line for a change's details, never the whole record. */
const summary = (value: unknown) =>
  value == null ? "" : JSON.stringify(value).slice(0, 160);

export default function AdminAudit({ searchParams }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/audit" area="audit">
        <Audit searchParams={searchParams} />
      </StaffGate>
    </Suspense>
  );
}

/** Every admin write: who, what and when (docs/03 section 12). */
async function Audit({
  searchParams,
}: {
  searchParams: Props["searchParams"];
}) {
  const entity = one((await searchParams).entity);
  const chosen = entity in ENTITIES ? entity : undefined;
  const rows = await listAudits({ entity: chosen });
  return (
    <section className="grid gap-4">
      <h1 className="type-h2">Audit log</h1>
      <form className="flex flex-wrap items-end gap-3" action="/admin/audit">
        <label className="grid gap-1 text-sm font-semibold">
          Show
          <select
            name="entity"
            defaultValue={chosen ?? ""}
            className="rounded-field border-input bg-card h-11 border px-3 text-base font-normal"
          >
            <option value="">Everything</option>
            {Object.entries(ENTITIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className={buttonVariants({ variant: "secondary" })}
        >
          Show
        </button>
      </form>
      <div className="rounded-card border-border bg-card overflow-x-auto border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            The latest {rows.length} changes, newest first
          </caption>
          <thead className="bg-muted sticky top-0">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                When
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Who
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                What
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted-foreground px-4 py-6">
                  Nothing recorded yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-border border-t align-top">
                <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                  {formatDateTime(r.at)}
                </td>
                <td className="px-4 py-2.5">{r.staffName}</td>
                <td className="px-4 py-2.5">
                  {r.action} {r.entity}
                  <span className="text-muted-foreground block font-mono text-xs">
                    {r.entityId}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs break-all">
                  {summary(r.after)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
