import {
  CheckCircleIcon,
  CircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { formatDateTime } from "@/lib/dates";
import type { OrderDetail } from "@/modules/orders";

type Status = OrderDetail["status"];

const STEPS: { status: Status; label: string }[] = [
  { status: "confirmed", label: "Order confirmed" },
  { status: "picking", label: "Picking your items" },
  { status: "picked", label: "Ready for the Rider" },
  { status: "out_for_delivery", label: "On the way" },
  { status: "delivered", label: "Delivered" },
];

/** Where the Order is now, with the time each step happened (Manila time). */
export function OrderTimeline({
  status,
  events,
}: {
  status: Status;
  events: OrderDetail["events"];
}) {
  if (status === "cancelled" || status === "delivery_failed") {
    return (
      <p
        role="status"
        className="rounded-field bg-warn-soft text-warn flex items-center gap-2 px-4 py-3 font-semibold"
      >
        <WarningCircleIcon size={22} aria-hidden />
        {status === "cancelled"
          ? "This order was cancelled."
          : "We could not deliver this order. We will contact you to try again."}
      </p>
    );
  }
  const reached = STEPS.findIndex((s) => s.status === status);
  const at = (s: Status) => events.findLast((e) => e.to === s)?.at;
  return (
    <ol aria-label="Order progress" className="grid gap-3">
      {STEPS.map((step, i) => {
        const done = i <= reached;
        const time = at(step.status);
        return (
          <li
            key={step.status}
            aria-current={i === reached ? "step" : undefined}
            className={`flex items-center gap-3 ${done ? "" : "text-muted-foreground"}`}
          >
            {done ? (
              <CheckCircleIcon size={24} weight="fill" aria-hidden />
            ) : (
              <CircleIcon size={24} aria-hidden />
            )}
            <span className={i === reached ? "font-bold" : ""}>
              {step.label}
              {!done && <span className="sr-only"> (not yet)</span>}
            </span>
            {done && time && (
              <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                {formatDateTime(time)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
