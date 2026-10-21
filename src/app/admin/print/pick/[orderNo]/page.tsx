import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PrintButton } from "@/components/print-button";
import { formatSlot } from "@/lib/dates";
import { getPickList } from "@/modules/orders";

import { AdminSkeleton, StaffGate } from "../../../staff-gate";

export const metadata: Metadata = { title: "Pick sheet" };

type Props = PageProps<"/admin/print/pick/[orderNo]">;

const IF_MISSING = {
  allow: "Similar item OK",
  preferred: "Only their choice",
  none: "No substitute",
} as const;

export default function PickSheetPage({ params }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/pick" area="picking">
        <PickSheet params={params} />
      </StaffGate>
    </Suspense>
  );
}

/** The Pick List on paper, in aisle order, with boxes to tick (ADR 0012). */
async function PickSheet({ params }: { params: Props["params"] }) {
  const { orderNo } = await params;
  const list = await getPickList(orderNo);
  if (!list) notFound();
  return (
    <article className="grid max-w-3xl gap-4 print:max-w-none print:text-sm">
      <div className="flex flex-wrap gap-3 print:hidden">
        <Link
          href={`/admin/pick/${list.orderNo}`}
          className="text-muted-foreground self-center text-sm hover:underline"
        >
          Back to the Pick List
        </Link>
        <PrintButton>Print pick sheet</PrintButton>
      </div>
      <header>
        <h1 className="type-h2">
          Pick sheet <span className="font-mono">{list.orderNo}</span>
        </h1>
        <p className="tabular-nums">
          {formatSlot(list.slot.startsAt, list.slot.endsAt)}
        </p>
      </header>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Items in aisle order</caption>
        <thead>
          <tr className="border-ink border-b-2">
            <th scope="col" className="w-10 py-2">
              <span className="sr-only">Picked</span>
            </th>
            <th scope="col" className="py-2 font-semibold">
              Item
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Get
            </th>
            <th scope="col" className="py-2 pl-4 font-semibold">
              If missing
            </th>
          </tr>
        </thead>
        <tbody>
          {list.lines.map((l) => (
            <tr key={l.id} className="border-border border-b align-top">
              <td className="py-2">
                <span
                  aria-hidden
                  className="border-ink inline-block size-5 rounded-sm border-2"
                />
              </td>
              <td className="py-2">
                <b>{l.name}</b>
                {l.note && <span className="block italic">Note: {l.note}</span>}
              </td>
              <td className="py-2 text-right font-semibold tabular-nums">
                {l.weighed ? `${l.orderedWeightGrams} g` : `${l.orderedQty}`}
              </td>
              <td className="py-2 pl-4">
                {l.weighed ? "No substitute" : IF_MISSING[l.preference]}
                {l.preferred && (
                  <span className="block">{l.preferred.name}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted-foreground text-sm">
        {list.lines.length} lines. Record what you found in the Pick List on the
        phone.
      </p>
    </article>
  );
}
