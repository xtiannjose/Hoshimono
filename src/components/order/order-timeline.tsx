import {
  CheckCircleIcon,
  CircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import type { Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import { formatDateTime } from "@/lib/dates";
import type { OrderDetail } from "@/modules/orders";

type Status = OrderDetail["status"];

const STEPS = [
  "confirmed",
  "picking",
  "picked",
  "out_for_delivery",
  "delivered",
] as const satisfies Status[];

/** Where the Order is now, with the time each step happened (Manila time). */
export function OrderTimeline({
  status,
  events,
  lang,
}: {
  status: Status;
  events: OrderDetail["events"];
  lang: Lang;
}) {
  const t = MESSAGES[lang].order;
  if (status === "cancelled" || status === "delivery_failed") {
    return (
      <p
        role="status"
        className="rounded-field bg-warn-soft text-warn flex items-center gap-2 px-4 py-3 font-semibold"
      >
        <WarningCircleIcon size={22} aria-hidden />
        {status === "cancelled" ? t.cancelled : t.failed}
      </p>
    );
  }
  const reached = STEPS.findIndex((s) => s === status);
  const at = (s: Status) => events.findLast((e) => e.to === s)?.at;
  return (
    <ol aria-label={t.progress} className="grid gap-3">
      {STEPS.map((step, i) => {
        const done = i <= reached;
        const time = at(step);
        return (
          <li
            key={step}
            aria-current={i === reached ? "step" : undefined}
            className={`flex items-center gap-3 ${done ? "" : "text-muted-foreground"}`}
          >
            {done ? (
              <CheckCircleIcon size={24} weight="fill" aria-hidden />
            ) : (
              <CircleIcon size={24} aria-hidden />
            )}
            <span className={i === reached ? "font-bold" : ""}>
              {t.steps[step]}
              {!done && <span className="sr-only">{t.notYet}</span>}
            </span>
            {done && time && (
              <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                {formatDateTime(time, lang)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
