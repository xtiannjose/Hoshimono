import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ORDER_STATUS_LABEL } from "@/components/order/status-labels";
import { formatSlot, formatTime } from "@/lib/dates";
import { listRelatedProducts } from "@/modules/catalog";
import { getPickList, type PickLine } from "@/modules/orders";

import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { FinishPicking, PickLineControls, StartPicking } from "./pick-controls";

export const metadata: Metadata = { title: "Pick List" };

type Props = PageProps<"/admin/pick/[orderNo]">;

const PREFERENCE = {
  allow: "If missing: a similar item (they can say no)",
  preferred: "If missing: only their choice",
  none: "If missing: no substitute",
} as const;

export default function PickPage({ params }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/pick" area="picking">
        <Pick params={params} />
      </StaffGate>
    </Suspense>
  );
}

/** One Order's Pick List, in aisle order, for a Picker's phone (ADM-6). */
async function Pick({ params }: { params: Props["params"] }) {
  const { orderNo } = await params;
  const list = await getPickList(orderNo);
  if (!list) notFound();
  const picking = list.status === "picking";
  const suggestions = new Map(
    await Promise.all(
      list.lines
        .filter((l) => picking && l.preference === "allow" && !l.weighed)
        .map(
          async (l) =>
            [
              l.id,
              (await listRelatedProducts(l.productId, 8)).map((p) => ({
                id: p.id,
                name: p.brand ? `${p.brand} ${p.name}` : p.name,
                priceCents: p.priceCents,
              })),
            ] as const
        )
    )
  );

  return (
    <section className="grid max-w-xl gap-5">
      <div className="grid gap-1">
        <Link
          href="/admin/pick"
          className="text-muted-foreground text-sm hover:underline"
        >
          All Orders to pick
        </Link>
        <h1 className="type-h2 font-mono">{list.orderNo}</h1>
        <Link
          href={`/admin/print/pick/${list.orderNo}`}
          className="text-sm font-semibold hover:underline"
        >
          Pick sheet to print
        </Link>
        <p className="tabular-nums">
          {formatSlot(list.slot.startsAt, list.slot.endsAt)},{" "}
          <b>{ORDER_STATUS_LABEL[list.status]}</b>
        </p>
      </div>
      {list.status === "confirmed" && (
        <StartPicking orderId={list.id} orderNo={list.orderNo} />
      )}
      <ol className="grid gap-3">
        {list.lines.map((line) => (
          <li
            key={line.id}
            className="rounded-card border-border bg-card grid gap-3 border p-4"
          >
            <LineSummary line={line} />
            {picking && !line.substitution && (
              <PickLineControls
                line={line}
                orderNo={list.orderNo}
                suggestions={suggestions.get(line.id) ?? []}
              />
            )}
          </li>
        ))}
      </ol>
      {picking && <FinishPicking orderId={list.id} orderNo={list.orderNo} />}
    </section>
  );
}

function LineSummary({ line }: { line: PickLine }) {
  const sub = line.substitution;
  return (
    <div className="grid gap-1">
      <p className="text-[17px] leading-6">
        <b>{line.name}</b>
        <span className="tabular-nums">
          {line.weighed
            ? `, about ${line.orderedWeightGrams} g`
            : `, ${line.orderedQty} pcs`}
        </span>
      </p>
      {line.note && (
        <p className="rounded-field bg-warn-soft text-warn px-3 py-1.5 text-sm font-semibold">
          Note: {line.note}
        </p>
      )}
      <p className="text-muted-foreground text-sm">
        {line.preference === "preferred" && line.preferred
          ? `If missing: only ${line.preferred.name}`
          : PREFERENCE[line.preference]}
      </p>
      {line.status === "picked" && (
        <p className="text-sm font-semibold">
          Done
          {line.weighed
            ? `: ${line.finalWeightGrams} g`
            : `: found all ${line.orderedQty}`}
        </p>
      )}
      {line.status === "short" && !sub && (
        <p className="text-warn text-sm font-semibold">
          Short: found {line.fulfilledQty ?? 0} of {line.orderedQty}
        </p>
      )}
      {sub && (
        <p className="text-sm font-semibold">
          Substitute: {sub.quantity} x {sub.name}.{" "}
          {sub.answer === "waiting" && sub.windowEndsAt
            ? `Waiting for the Customer until ${formatTime(sub.windowEndsAt)}.`
            : sub.answer === "refused"
              ? "They said no: leave it out."
              : "Accepted: pack it."}
        </p>
      )}
    </div>
  );
}
