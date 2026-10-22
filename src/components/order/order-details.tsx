import type { Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import { formatSlot } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { OrderDetail } from "@/modules/orders";

/** Delivery, items and totals of an Order, as stored at checkout. */
export function OrderDetails({
  order,
  lang = "en",
}: {
  order: OrderDetail;
  lang?: Lang;
}) {
  const t = MESSAGES[lang].order;
  const { address } = order;
  // Weighed Products are charged by packed weight: the total is an estimate.
  const estimated = order.lines.some((l) => l.weighed);
  return (
    <div className="grid gap-6">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground text-sm">{t.slot}</dt>
          <dd className="font-semibold">
            {formatSlot(
              order.slot.startsAt,
              order.slot.endsAt,
              undefined,
              lang
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">{t.deliverTo}</dt>
          <dd>
            <b>{address.label}</b>, {address.line1}, {address.barangay},{" "}
            {address.city}
            <span className="text-muted-foreground block text-sm">
              {t.landmark(address.landmark)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">{t.payment}</dt>
          <dd>
            {order.paymentMethod ? t.methods[order.paymentMethod] : t.online}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-sm">{t.mobile}</dt>
          <dd className="tabular-nums">{order.contactPhone}</dd>
        </div>
      </dl>

      <div>
        <h2 className="type-h3 mb-2">{t.items}</h2>
        <ul>
          {order.lines.map((line, i) => (
            <li
              key={i}
              className="border-border grid grid-cols-[1fr_auto] gap-3 border-b py-2.5"
            >
              <span>
                {line.name}
                <small className="text-muted-foreground block text-[13px]">
                  {t.lineDetail(
                    line.quantity,
                    formatMoney(line.unitPriceCents),
                    line.weighed
                  )}
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
            <dt>{t.subtotal}</dt>
            <dd>{formatMoney(order.subtotalCents)}</dd>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between">
              <dt>{t.discount}</dt>
              <dd>-{formatMoney(order.discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>{t.delivery}</dt>
            <dd>
              {order.deliveryFeeCents === 0
                ? t.free
                : formatMoney(order.deliveryFeeCents)}
            </dd>
          </div>
          <div className="border-border font-display flex justify-between border-t pt-2 text-xl font-semibold">
            <dt>{estimated ? t.estimatedTotal : t.total}</dt>
            <dd data-testid="order-total">{formatMoney(order.totalCents)}</dd>
          </div>
          {order.finalTotalCents !== null &&
            order.finalTotalCents !== order.totalCents && (
              <div className="flex justify-between font-semibold">
                <dt>{t.finalTotal}</dt>
                <dd>{formatMoney(order.finalTotalCents)}</dd>
              </div>
            )}
          {order.refundedCents > 0 && (
            <div className="flex justify-between">
              <dt>
                {t.refund(order.paymentMethod === "card" ? "card" : "gcash")}
              </dt>
              <dd>{formatMoney(order.refundedCents)}</dd>
            </div>
          )}
        </dl>
        <p className="text-muted-foreground mt-2 text-[13px]">
          {t.vat(formatMoney(order.vatCents))}
          {estimated && order.finalTotalCents === null && t.weighedNote}
        </p>
      </div>
    </div>
  );
}
