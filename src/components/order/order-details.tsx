import { PAYMENT_METHOD_LABEL } from "@/components/order/status-labels";
import { formatSlot } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { OrderDetail } from "@/modules/orders";

/** Delivery, items and totals of an Order, as stored at checkout. */
export function OrderDetails({ order }: { order: OrderDetail }) {
  const { address } = order;
  // Weighed Products are charged by packed weight: the total is an estimate.
  const estimated = order.lines.some((l) => l.weighed);
  return (
    <div className="grid gap-6">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-sm">Delivery slot</dt>
          <dd className="font-semibold">
            {formatSlot(order.slot.startsAt, order.slot.endsAt)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">Deliver to</dt>
          <dd>
            <b>{address.label}</b>, {address.line1}, {address.barangay},{" "}
            {address.city}
            <span className="text-muted-foreground block text-sm">
              Landmark: {address.landmark}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">Payment</dt>
          <dd>
            {order.paymentMethod
              ? PAYMENT_METHOD_LABEL[order.paymentMethod]
              : "Online"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">Mobile number</dt>
          <dd className="tabular-nums">{order.contactPhone}</dd>
        </div>
      </dl>

      <div>
        <h2 className="type-h3 mb-2">Items</h2>
        <ul>
          {order.lines.map((line, i) => (
            <li
              key={i}
              className="border-border grid grid-cols-[1fr_auto] gap-3 border-b py-2.5"
            >
              <span>
                {line.name}
                <small className="text-muted-foreground block text-[13px]">
                  {line.quantity} x {formatMoney(line.unitPriceCents)}
                  {line.weighed ? ", by weight" : ""}
                </small>
              </span>
              <span className="tabular-nums">
                {formatMoney(line.lineTotalCents)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 grid gap-2 tabular-nums">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatMoney(order.subtotalCents)}</dd>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between">
              <dt>Discount</dt>
              <dd>-{formatMoney(order.discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>
              {order.deliveryFeeCents === 0
                ? "Free"
                : formatMoney(order.deliveryFeeCents)}
            </dd>
          </div>
          <div className="border-border font-display flex justify-between border-t pt-2 text-xl font-semibold">
            <dt>{estimated ? "Estimated total" : "Total"}</dt>
            <dd data-testid="order-total">{formatMoney(order.totalCents)}</dd>
          </div>
          {order.finalTotalCents !== null &&
            order.finalTotalCents !== order.totalCents && (
              <div className="flex justify-between font-semibold">
                <dt>Final total, as packed</dt>
                <dd>{formatMoney(order.finalTotalCents)}</dd>
              </div>
            )}
          {order.refundedCents > 0 && (
            <div className="flex justify-between">
              <dt>
                Refund to your{" "}
                {order.paymentMethod === "card" ? "card" : "GCash"}
              </dt>
              <dd>{formatMoney(order.refundedCents)}</dd>
            </div>
          )}
        </dl>
        <p className="text-muted-foreground mt-2 text-[13px]">
          VAT included ({formatMoney(order.vatCents)}).
          {estimated &&
            order.finalTotalCents === null &&
            " Weighed items are charged by the weight we pack, so the final amount may change a little."}
        </p>
      </div>
    </div>
  );
}
