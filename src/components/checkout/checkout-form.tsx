"use client";

import {
  CheckCircleIcon,
  CreditCardIcon,
  DeviceMobileIcon,
  MoneyIcon,
  ScalesIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  holdSlotAction,
  placeOrderAction,
  type CheckoutState,
} from "@/app/checkout/actions";
import { CartSummary } from "@/components/cart/cart-summary";
import { VoucherForm } from "@/components/cart/voucher-form";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { productName } from "@/lib/product-name";
import type { CartView } from "@/modules/cart";
import type { AddressView } from "@/modules/customers";

type SlotChoice = {
  id: string;
  date: string;
  /** Such as "Today" or "Thu, 22 Oct". */
  day: string;
  /** Such as "2:00 to 4:00 PM". */
  time: string;
  state: "open" | "few" | "full";
};

const FIELD =
  "h-11 w-full rounded-field border border-input bg-card px-3 text-base";
const CARD =
  "rounded-field border-border-strong bg-card has-[:checked]:border-ink has-[:focus-visible]:outline-ring flex cursor-pointer border has-[:checked]:border-2 has-[:focus-visible]:outline-2";
const SUBSTITUTION = {
  allow: "Pick a similar item",
  preferred: "I'll choose",
  none: "No substitute",
} as const;
const PAYMENT = [
  {
    value: "gcash",
    Icon: DeviceMobileIcon,
    name: "GCash",
    hint: "You approve the payment in the GCash app",
  },
  {
    value: "card",
    Icon: CreditCardIcon,
    name: "Credit or debit card",
    hint: "Visa and Mastercard, entered on our payment partner's secure page",
  },
  {
    value: "cod",
    Icon: MoneyIcon,
    name: "Cash on delivery",
    hint: "Pay the Rider when your order arrives",
  },
] as const;
const initial: CheckoutState = {};

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const id = `h-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <section
      aria-labelledby={id}
      className="rounded-card border-border bg-card grid min-w-0 grid-cols-1 gap-5 border p-5 md:p-7"
    >
      <h2 id={id} className="type-h3">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** One-page Checkout (PRD CHK-1): address, contact, Slot, payment, summary. */
export function CheckoutForm({
  idempotencyKey,
  addresses,
  addressId,
  zone,
  cart,
  slots,
  heldSlotId,
  heldExpiresAt,
  phone,
  onlinePayments,
}: {
  idempotencyKey: string;
  addresses: AddressView[];
  addressId: string;
  zone: { name: string; deliveryFeeCents: number } | null;
  cart: CartView;
  slots: SlotChoice[];
  heldSlotId: string | null;
  /** When the cart's current hold ends. */
  heldExpiresAt: Date | null;
  phone: string;
  /** GCash and card are on offer (a payment provider is set up). */
  onlinePayments: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(placeOrderAction, initial);
  const address = addresses.find((a) => a.id === addressId)!;
  const [slotId, setSlotId] = useState<string>(
    state.values?.slotId ?? heldSlotId ?? ""
  );
  const [slotMessage, setSlotMessage] = useState<string | null>(null);
  const [payment, setPayment] = useState(
    onlinePayments ? (state.values?.payment ?? "cod") : "cod"
  );
  const online = payment !== "cod";
  // When the hold on the chosen Slot ends; null means no live hold shown.
  const [heldUntil, setHeldUntil] = useState<Date | null>(
    heldSlotId && slotId === heldSlotId ? heldExpiresAt : null
  );
  const [now, setNow] = useState(() => Date.now());
  // Re-render when the hold lapses, so the label stops promising it.
  useEffect(() => {
    if (!heldUntil) return;
    const wait = heldUntil.getTime() - Date.now();
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, wait) + 50);
    return () => clearTimeout(timer);
  }, [heldUntil]);
  const holdLive = heldUntil !== null && heldUntil.getTime() > now;
  const days = [...new Map(slots.map((s) => [s.date, s.day]))];
  const [day, setDay] = useState(
    slots.find((s) => s.id === slotId)?.date ?? days[0]?.[0] ?? ""
  );
  const { priced } = cart;
  const blocked =
    !zone || priced.lines.length === 0 || priced.belowMinimumByCents > 0;

  const latestChoice = useRef<string | null>(null);
  async function choose(id: string) {
    latestChoice.current = id;
    setSlotId(id);
    setSlotMessage(null);
    setHeldUntil(null);
    const result = await holdSlotAction(id, addressId);
    // A slow answer for an earlier choice must not undo a newer one.
    if (latestChoice.current !== id) return;
    if (result.ok) {
      setHeldUntil(new Date(result.expiresAt));
    } else {
      setSlotId("");
      setSlotMessage(result.message);
    }
  }

  return (
    <form
      action={action}
      className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]"
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="addressId" value={addressId} />
      <input type="hidden" name="slotId" value={slotId} />
      <input
        type="hidden"
        name="expectedTotalCents"
        value={priced.totalCents}
      />

      <div className="grid min-w-0 gap-6">
        <Panel title="Delivery address">
          <fieldset className="grid gap-2">
            <legend className="sr-only">Deliver to</legend>
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`${CARD} items-start gap-3 px-4 py-3.5 has-[:checked]:px-[15px] has-[:checked]:py-[13px]`}
              >
                <input
                  type="radio"
                  name="address"
                  value={a.id}
                  checked={a.id === addressId}
                  onChange={() =>
                    router.replace(`/checkout?address=${a.id}`, {
                      scroll: false,
                    })
                  }
                  className="accent-ink mt-0.5 size-5 shrink-0"
                />
                <span className="text-[15px] leading-[22px]">
                  <b>{a.label}</b>
                  <span className="block">
                    {a.line1}, {a.barangay}, {a.city}
                  </span>
                  <span className="text-muted-foreground block text-[13px]">
                    Landmark: {a.landmark}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          {zone ? (
            <p className="text-muted-foreground text-sm">
              Delivery to {zone.name}:{" "}
              {priced.deliveryFeeCents === 0
                ? "free for this order"
                : formatMoney(zone.deliveryFeeCents)}
              .
            </p>
          ) : (
            <p
              role="alert"
              className="rounded-field bg-warn-soft text-warn px-4 py-3 text-sm font-semibold"
            >
              We do not deliver to this address yet. Please choose another.
            </p>
          )}
          <div className="flex flex-wrap gap-x-5 text-sm font-semibold">
            <Link
              href={`/account/addresses/${address.id}`}
              className="underline underline-offset-[3px]"
            >
              Edit {address.label}
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <label htmlFor="phone" className="text-sm font-semibold">
                Mobile number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                defaultValue={state.values?.phone ?? phone}
                aria-describedby="phone-hint"
                className={FIELD}
              />
              <p id="phone-hint" className="text-muted-foreground text-[13px]">
                The Rider calls this number on arrival.
              </p>
            </div>
            <div className="grid content-start gap-1.5">
              <label htmlFor="riderNotes" className="text-sm font-semibold">
                Note for the Rider (optional)
              </label>
              <input
                id="riderNotes"
                name="riderNotes"
                maxLength={200}
                defaultValue={state.values?.riderNotes ?? address.notes ?? ""}
                className={FIELD}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Delivery slot">
          {slots.length === 0 ? (
            <p>No delivery slots are open right now. Please check back soon.</p>
          ) : (
            <>
              {/* Fieldsets default to min-content width; let the chips scroll. */}
              <fieldset className="min-w-0">
                <legend className="sr-only">Delivery day</legend>
                <div className="flex gap-2 overflow-x-auto p-0.5">
                  {days.map(([date, label]) => (
                    <label
                      key={date}
                      className="rounded-field border-border-strong bg-card text-muted-foreground has-[:checked]:bg-ink has-[:checked]:border-ink has-[:checked]:text-bg has-[:focus-visible]:outline-ring relative min-w-[92px] shrink-0 cursor-pointer border px-3.5 py-2.5 text-[15px] leading-5 font-semibold has-[:focus-visible]:outline-2"
                    >
                      <input
                        type="radio"
                        name="day"
                        value={date}
                        checked={day === date}
                        onChange={() => setDay(date)}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="min-w-0">
                <legend className="sr-only">Delivery time</legend>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                  {slots
                    .filter((s) => s.date === day)
                    .map((s) => {
                      const full = s.state === "full" && s.id !== slotId;
                      return (
                        <label
                          key={s.id}
                          className={`${CARD} has-[:checked]:bg-accent-soft relative grid gap-0.5 px-3.5 py-3 has-[:checked]:px-[13px] has-[:checked]:py-[11px] ${full ? "bg-muted cursor-not-allowed border-dashed opacity-75" : ""}`}
                        >
                          <input
                            type="radio"
                            name="slot"
                            value={s.id}
                            checked={slotId === s.id}
                            disabled={full}
                            onChange={() => choose(s.id)}
                            className="sr-only"
                          />
                          <b
                            className={`text-[15px] tabular-nums ${full ? "text-muted-foreground line-through" : ""}`}
                          >
                            {s.time}
                          </b>
                          <small
                            className={`inline-flex items-center gap-1 text-[13px] ${slotId === s.id ? "text-foreground" : s.state === "few" ? "text-warn font-semibold" : "text-muted-foreground"}`}
                          >
                            {slotId === s.id ? (
                              <>
                                <CheckCircleIcon size={16} aria-hidden />
                                {holdLive && heldUntil
                                  ? `Held for you until ${formatTime(heldUntil)}`
                                  : "Chosen"}
                              </>
                            ) : full ? (
                              "Full"
                            ) : s.state === "few" ? (
                              "Only a few left"
                            ) : (
                              "Available"
                            )}
                          </small>
                        </label>
                      );
                    })}
                </div>
              </fieldset>
            </>
          )}
          {slotMessage && (
            <p role="alert" className="text-warn text-sm font-semibold">
              {slotMessage}
            </p>
          )}
        </Panel>

        <Panel title="Payment">
          <fieldset className="grid gap-2">
            <legend className="sr-only">Payment method</legend>
            {PAYMENT.filter((p) => onlinePayments || p.value === "cod").map(
              ({ value, Icon, name, hint }) => (
                <label
                  key={value}
                  className={`${CARD} grid grid-cols-[28px_1fr_22px] items-center gap-3.5 px-4 py-3.5 has-[:checked]:px-[15px] has-[:checked]:py-[13px]`}
                >
                  <Icon size={26} aria-hidden />
                  <span>
                    <b className="block">{name}</b>
                    <small className="text-muted-foreground block text-[13px] leading-[18px]">
                      {hint}
                    </small>
                  </span>
                  <input
                    type="radio"
                    name="payment"
                    value={value}
                    checked={payment === value}
                    onChange={() => setPayment(value)}
                    className="accent-ink size-5"
                  />
                </label>
              )
            )}
          </fieldset>
          {!onlinePayments && (
            <p className="text-muted-foreground text-[13px]">
              GCash and card payments are coming soon.
            </p>
          )}
          {priced.weighedSubtotalCents > 0 && (
            <p className="rounded-field bg-warn-soft flex items-start gap-3 px-4 py-3.5 text-[15px] leading-[22px]">
              <ScalesIcon
                size={22}
                aria-hidden
                className="text-warn mt-px shrink-0"
              />
              {online
                ? "Some items are sold by weight. You pay this estimate now; we charge the weight we actually pack and refund any difference within one day."
                : "Some items are sold by weight. We charge the weight we actually pack, so your final total may change a little. You pay the final amount in cash."}
            </p>
          )}
        </Panel>
      </div>

      <aside
        aria-labelledby="h-summary"
        className="rounded-card border-border bg-card grid min-w-0 gap-4 border p-5 md:p-7 lg:sticky lg:top-28"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="h-summary" className="type-h3">
            Order summary
          </h2>
          <span className="text-muted-foreground text-sm">
            {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
          </span>
        </div>
        <ul className="grid">
          {cart.lines.map((line) => {
            const total = priced.lines.find(
              (p) => p.productId === line.product.id
            );
            const name = productName(line.product);
            return (
              <li
                key={line.product.id}
                className="border-border grid grid-cols-[1fr_auto] gap-3 border-b py-2.5"
              >
                <span>
                  <b className="block text-[15px] leading-5 font-semibold">
                    {name}
                  </b>
                  <small className="text-muted-foreground block text-[13px] leading-[18px]">
                    Quantity {line.quantity}
                    {line.product.isWeighed ? ", by weight" : ""}.{" "}
                    {SUBSTITUTION[line.substitution.preference]}.
                  </small>
                </span>
                <span className="font-semibold tabular-nums">
                  {total ? (
                    formatMoney(total.lineTotalCents)
                  ) : (
                    <span className="text-muted-foreground text-sm font-medium">
                      Sold out
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <CartSummary priced={priced} size="page" />
        <VoucherForm view={cart} />
        <p className="text-muted-foreground text-[13px]">VAT included.</p>
        {priced.belowMinimumByCents > 0 && (
          <p className="rounded-field bg-warn-soft text-warn px-4 py-3 text-sm font-semibold">
            Add {formatMoney(priced.belowMinimumByCents)} more to reach the
            minimum order for this area.
          </p>
        )}
        {state.message && (
          <p
            role="alert"
            className="rounded-field bg-warn-soft text-warn px-4 py-3 text-sm font-semibold"
          >
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || blocked || !slotId}
          className={`${PRIMARY_BUTTON} w-full`}
        >
          {pending
            ? online
              ? "Opening payment page..."
              : "Placing your order..."
            : `Place order, ${formatMoney(priced.totalCents)}`}
        </button>
        {online && slotId && !blocked && (
          <p className="text-muted-foreground text-center text-[13px]">
            Next, you pay on our payment partner&apos;s secure page.
          </p>
        )}
        {!slotId && !blocked && (
          <p className="text-muted-foreground text-center text-[13px]">
            Choose a delivery slot to continue.
          </p>
        )}
        <Link
          href="/cart"
          className="text-center text-sm font-semibold underline underline-offset-[3px]"
        >
          Change items
        </Link>
      </aside>
    </form>
  );
}
