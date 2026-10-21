import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/components/order/status-labels";
import { PrintButton } from "@/components/print-button";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getReceipt } from "@/modules/orders";

import { AdminSkeleton, StaffGate } from "../../../staff-gate";

export const metadata: Metadata = { title: "Delivery receipt" };

type Props = PageProps<"/admin/print/receipt/[orderNo]">;

export default function ReceiptPage({ params }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/orders" area="orders">
        <Receipt params={params} />
      </StaffGate>
    </Suspense>
  );
}

function Row({
  label,
  cents,
  strong = false,
}: {
  label: string;
  cents: number;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatMoney(cents)}</dd>
    </div>
  );
}

/** A delivery receipt to print and pack with the Order (ADR 0012). */
async function Receipt({ params }: { params: Props["params"] }) {
  const { orderNo } = await params;
  const r = await getReceipt(orderNo);
  if (!r) notFound();
  const { breakdown: b } = r;
  return (
    <article className="grid max-w-xl gap-5 print:max-w-none print:text-sm">
      <div className="flex flex-wrap gap-3 print:hidden">
        <Link
          href={`/admin/orders/${r.orderNo}`}
          className="text-muted-foreground self-center text-sm hover:underline"
        >
          Back to the Order
        </Link>
        <PrintButton>Print receipt</PrintButton>
      </div>
      <header className="grid gap-1">
        <p className="type-h3">Hoshimono</p>
        <p className="text-muted-foreground text-sm">
          {r.hub.name}, {r.hub.address}
        </p>
        <h1 className="type-h2">Delivery receipt</h1>
        <p className="font-mono">{r.orderNo}</p>
        <p className="text-sm">
          Placed {formatDateTime(r.placedAt)}
          {r.deliveredAt && <>, delivered {formatDateTime(r.deliveredAt)}</>}
        </p>
      </header>
      <section aria-label="Delivered to" className="text-sm">
        <p className="font-semibold">{r.customerName}</p>
        <p>
          {r.address.line1}, {r.address.barangay}, {r.address.city}
        </p>
      </section>
      {!r.final && (
        <p className="bg-warn-soft text-warn rounded-card p-3 text-sm font-semibold">
          Not picked yet: these are the amounts at checkout, not the final ones.
        </p>
      )}
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Items</caption>
        <thead>
          <tr className="border-border border-b">
            <th scope="col" className="py-2 font-semibold">
              Item
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {r.lines.map((l, i) => (
            <tr key={i} className="border-border border-b align-top">
              <td className="py-2">
                {l.name}
                {l.taxClass !== "vatable" && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({l.taxClass === "vat_exempt" ? "VAT-exempt" : "zero-rated"}
                    )
                  </span>
                )}
                <span className="text-muted-foreground block tabular-nums">
                  {l.detail}
                </span>
                {l.substitute && (
                  <span className="block">
                    In its place: {l.substitute.quantity} x {l.substitute.name},{" "}
                    {formatMoney(l.substitute.amountCents)}
                  </span>
                )}
              </td>
              <td className="py-2 text-right tabular-nums">
                {formatMoney(l.amountCents + (l.substitute?.amountCents ?? 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="grid gap-1 text-sm">
        <Row label="Delivery fee" cents={r.deliveryFeeCents} />
        {r.discountCents > 0 && (
          <Row label="Discount" cents={-r.discountCents} />
        )}
        <Row label="Total" cents={r.totalCents} strong />
      </dl>
      <dl
        aria-label="VAT breakdown"
        className="border-border grid gap-1 border-t pt-3 text-sm"
      >
        <Row label="VATable sales (VAT included)" cents={b.vatableSalesCents} />
        <Row label="VAT-exempt sales" cents={b.vatExemptSalesCents} />
        <Row label="Zero-rated sales" cents={b.zeroRatedSalesCents} />
        <Row label="VAT (12%)" cents={b.vatCents} />
      </dl>
      <p className="text-sm">
        Paid by{" "}
        {r.paymentMethod ? PAYMENT_METHOD_LABEL[r.paymentMethod] : "Online"}:{" "}
        {PAYMENT_STATUS_LABEL[r.paymentStatus]}
      </p>
      <p className="border-border border-t pt-3 text-sm font-bold">
        This is not an official receipt.
      </p>
      <p className="text-muted-foreground text-sm">Salamat po!</p>
    </article>
  );
}
