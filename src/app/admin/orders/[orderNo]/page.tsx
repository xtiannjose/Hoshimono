import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OrderDetails } from "@/components/order/order-details";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/components/order/status-labels";
import type { OrderStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  getOrderForStaff,
  MAX_ORDER_NOTE_LENGTH,
  staffMoves,
} from "@/modules/orders";

import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { MoveForm, NoteForm } from "./order-forms";

export const metadata: Metadata = { title: "Order" };

type Props = PageProps<"/admin/orders/[orderNo]">;

// What the move does, in the words staff use at the Hub.
const MOVE_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Waiting for payment",
  confirmed: "Confirmed",
  picking: "Start picking",
  picked: "Picked: ready for the Rider (sets the final total)",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  delivery_failed: "Delivery failed",
  cancelled: "Cancel the Order (refunds a paid Order in full)",
};
const REFUND_STATUS = {
  pending: "Waiting to send",
  sending: "Sending",
  sent: "Sent",
  needs_review: "Needs a check",
} as const;
const PANEL = "rounded-card border-border bg-card grid gap-4 border p-5";

export default function AdminOrder({ params }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/orders" area="orders">
        <Order params={params} />
      </StaffGate>
    </Suspense>
  );
}

async function Order({ params }: { params: Props["params"] }) {
  const { orderNo } = await params;
  const order = await getOrderForStaff(orderNo);
  if (!order) notFound();
  const moves = staffMoves(order.status).map((to) => ({
    to,
    label: MOVE_LABEL[to],
  }));

  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <Link
          href="/admin/orders"
          className="text-muted-foreground text-sm hover:underline"
        >
          All Orders
        </Link>
        <h1 className="type-h2 font-mono">{order.orderNo}</h1>
        <p>
          <b>{ORDER_STATUS_LABEL[order.status]}</b>
          <span className="text-muted-foreground">
            {" "}
            Payment: {PAYMENT_STATUS_LABEL[order.paymentStatus]}
          </span>
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <section aria-labelledby="h-customer" className={PANEL}>
            <h2 id="h-customer" className="type-h3">
              Customer
            </h2>
            <p>
              <b>{order.customer.name}</b>
              <span className="text-muted-foreground block">
                {order.customer.email ?? "No email"}, mobile{" "}
                <span className="tabular-nums">{order.contactPhone}</span>
              </span>
            </p>
            {order.riderNotes && <p>Note for the Rider: {order.riderNotes}</p>}
          </section>
          <OrderDetails order={order} />
          <section aria-labelledby="h-history" className={PANEL}>
            <h2 id="h-history" className="type-h3">
              History
            </h2>
            <ol className="grid gap-2">
              {order.history.map((e, i) => (
                <li key={i} className="grid gap-0.5">
                  <span>
                    <b>{ORDER_STATUS_LABEL[e.to]}</b> by {e.actor}
                    {e.reason && <span>: {e.reason}</span>}
                  </span>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {formatDateTime(e.at)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="grid gap-6">
          <section aria-labelledby="h-move" className={PANEL}>
            <h2 id="h-move" className="type-h3">
              Next step
            </h2>
            {moves.length > 0 ? (
              <MoveForm
                orderId={order.id}
                orderNo={order.orderNo}
                status={order.status}
                moves={moves}
              />
            ) : (
              <p className="text-muted-foreground">
                {order.status === "pending_payment" ? (
                  "Waiting for the Customer to pay. The payment, or the 15-minute Payment Window, moves it on."
                ) : order.status === "picked" ||
                  order.status === "out_for_delivery" ? (
                  <>
                    It goes out and is delivered through{" "}
                    <Link
                      href="/admin/dispatch"
                      className="font-semibold underline underline-offset-4"
                    >
                      Dispatch
                    </Link>
                    , with a Rider and the Customer&apos;s PIN.
                  </>
                ) : (
                  "Nothing more to do: this Order is closed."
                )}
              </p>
            )}
          </section>
          {order.refunds.length > 0 && (
            <section aria-labelledby="h-refunds" className={PANEL}>
              <h2 id="h-refunds" className="type-h3">
                Refunds
              </h2>
              <ul className="grid gap-2">
                {order.refunds.map((r, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>
                      {r.reason.replaceAll("_", " ")}
                      <span className="text-muted-foreground block text-sm">
                        {REFUND_STATUS[r.status]}
                      </span>
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(r.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="h-notes" className={PANEL}>
            <h2 id="h-notes" className="type-h3">
              Notes
            </h2>
            {order.notes.length === 0 ? (
              <p className="text-muted-foreground">No notes yet.</p>
            ) : (
              <ul className="grid gap-3">
                {order.notes.map((n, i) => (
                  <li key={i}>
                    {n.text}
                    <span className="text-muted-foreground block text-sm">
                      {n.staffName},{" "}
                      <span className="tabular-nums">
                        {formatDateTime(n.at)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <NoteForm
              orderId={order.id}
              orderNo={order.orderNo}
              maxLength={MAX_ORDER_NOTE_LENGTH}
            />
          </section>
        </aside>
      </div>
    </section>
  );
}
