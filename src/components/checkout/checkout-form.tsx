"use client";

import {
  CheckCircleIcon,
  CreditCardIcon,
  DeviceMobileIcon,
  MoneyIcon,
  ScalesIcon,
} from "@phosphor-icons/react";
import Link from "@/components/link";
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
} from "@/app/[lang]/checkout/actions";
import { CartNotes, CartSummary } from "@/components/cart/cart-summary";
import { VoucherForm } from "@/components/cart/voucher-form";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { useLang, useLocalPath, useMessages } from "@/i18n/client";
import { formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { productName } from "@/lib/product-name";
import type { CartView } from "@/modules/cart";
import type { AddressView } from "@/modules/customers";
import { FIELD, RADIO_CARD as CARD } from "@/components/ui/field-classes";

type SlotChoice = {
  id: string;
  date: string;
  /** Such as "Today" or "Thu, 22 Oct". */
  day: string;
  /** Such as "2:00 to 4:00 PM". */
  time: string;
  state: "open" | "few" | "full";
};

const PAYMENT = [
  { value: "gcash", Icon: DeviceMobileIcon },
  { value: "card", Icon: CreditCardIcon },
  { value: "cod", Icon: MoneyIcon },
] as const;
const initial: CheckoutState = {};

function Panel({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
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
  const lang = useLang();
  const local = useLocalPath();
  const m = useMessages();
  const t = m.checkout;
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
      setSlotMessage(t.hold[result.reason]);
    }
  }

  return (
    <form
      action={action}
      className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]"
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="addressId" value={addressId} />
      <input type="hidden" name="slotId" value={slotId} />
      <input
        type="hidden"
        name="expectedTotalCents"
        value={priced.totalCents}
      />

      <div className="grid min-w-0 gap-6">
        <Panel id="h-delivery-address" title={t.addressPanel}>
          <fieldset className="grid gap-2">
            <legend className="sr-only">{t.deliverTo}</legend>
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`${CARD} items-start gap-3 px-4 py-3.5`}
              >
                <input
                  type="radio"
                  name="address"
                  value={a.id}
                  checked={a.id === addressId}
                  onChange={() =>
                    router.replace(local(`/checkout?address=${a.id}`), {
                      scroll: false,
                    })
                  }
                  className="accent-ink mt-0.5 size-5 shrink-0"
                />
                <span className="text-label leading-[22px]">
                  <b>{a.label}</b>
                  <span className="block">
                    {a.line1}, {a.barangay}, {a.city}
                  </span>
                  <span className="text-muted-foreground text-fine block">
                    {t.landmark(a.landmark)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          {zone ? (
            <p className="text-muted-foreground text-sm">
              {t.zoneFee(
                zone.name,
                priced.deliveryFeeCents === 0
                  ? t.freeForOrder
                  : formatMoney(zone.deliveryFeeCents)
              )}
            </p>
          ) : (
            <p
              role="alert"
              className="rounded-field bg-warn-soft text-warn px-4 py-3 text-sm font-semibold"
            >
              {t.outOfZone}
            </p>
          )}
          <div className="flex flex-wrap gap-x-5 text-sm font-semibold">
            <Link
              href={`/account/addresses/${address.id}`}
              className="underline underline-offset-[3px]"
            >
              {t.edit(address.label)}
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <label htmlFor="phone" className="text-sm font-semibold">
                {t.mobile}
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
              <p id="phone-hint" className="text-muted-foreground text-fine">
                {t.mobileHint}
              </p>
            </div>
            <div className="grid content-start gap-1.5">
              <label htmlFor="riderNotes" className="text-sm font-semibold">
                {t.riderNote}
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

        <Panel id="h-delivery-slot" title={t.slotPanel}>
          {slots.length === 0 ? (
            <p>{t.noSlots}</p>
          ) : (
            <>
              {/* Fieldsets default to min-content width; let the chips scroll. */}
              <fieldset className="min-w-0">
                <legend className="sr-only">{t.day}</legend>
                <div className="flex gap-2 overflow-x-auto p-0.5">
                  {days.map(([date, label]) => (
                    <label
                      key={date}
                      className="rounded-field border-border-strong bg-card text-muted-foreground has-[:checked]:bg-ink has-[:checked]:border-ink has-[:checked]:text-bg has-[:focus-visible]:outline-ring text-label relative min-w-[92px] shrink-0 cursor-pointer border px-3.5 py-2.5 font-semibold has-[:focus-visible]:outline-2"
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
                <legend className="sr-only">{t.time}</legend>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                  {slots
                    .filter((s) => s.date === day)
                    .map((s) => {
                      const full = s.state === "full" && s.id !== slotId;
                      return (
                        <label
                          key={s.id}
                          className={`${CARD} has-[:checked]:bg-accent-soft relative grid gap-0.5 px-3.5 py-3 ${full ? "bg-muted cursor-not-allowed border-dashed opacity-75" : ""}`}
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
                            className={`text-label tabular-nums ${full ? "text-muted-foreground line-through" : ""}`}
                          >
                            {s.time}
                          </b>
                          <small
                            className={`text-fine inline-flex items-center gap-1 ${slotId === s.id ? "text-foreground" : s.state === "few" ? "text-warn font-semibold" : "text-muted-foreground"}`}
                          >
                            {slotId === s.id ? (
                              <>
                                <CheckCircleIcon size={16} aria-hidden />
                                {holdLive && heldUntil
                                  ? m.cart.heldUntil(formatTime(heldUntil))
                                  : t.chosen}
                              </>
                            ) : full ? (
                              t.full
                            ) : s.state === "few" ? (
                              t.few
                            ) : (
                              t.available
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

        <Panel id="h-payment" title={t.paymentPanel}>
          <fieldset className="grid gap-2">
            <legend className="sr-only">{t.paymentMethod}</legend>
            {PAYMENT.filter((p) => onlinePayments || p.value === "cod").map(
              ({ value, Icon }) => (
                <label
                  key={value}
                  className={`${CARD} grid grid-cols-[28px_1fr_22px] items-center gap-3.5 px-4 py-3.5`}
                >
                  <Icon size={26} aria-hidden />
                  <span>
                    <b className="block">{t.methods[value].name}</b>
                    <small className="text-muted-foreground text-fine block">
                      {t.methods[value].hint}
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
            <p className="text-muted-foreground text-fine">{t.comingSoon}</p>
          )}
          {priced.weighedSubtotalCents > 0 && (
            <p className="rounded-field bg-warn-soft text-label flex items-start gap-3 px-4 py-3.5 leading-[22px]">
              <ScalesIcon
                size={22}
                aria-hidden
                className="text-warn mt-px shrink-0"
              />
              {online ? t.weighedOnline : t.weighedCash}
            </p>
          )}
        </Panel>
      </div>

      <aside aria-labelledby="h-summary" className={SUMMARY}>
        <SummaryLines cart={cart} />
        <CartSummary priced={priced} size="page" />
        <VoucherForm view={cart} />
        <p className="text-muted-foreground text-fine">{t.vat}</p>
        {priced.belowMinimumByCents > 0 && (
          <p className="rounded-field bg-warn-soft text-warn px-4 py-3 text-sm font-semibold">
            {t.belowMinimum(formatMoney(priced.belowMinimumByCents))}
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
              ? t.opening
              : t.placing
            : t.place(formatMoney(priced.totalCents))}
        </button>
        {online && slotId && !blocked && (
          <p className="text-muted-foreground text-fine text-center">
            {t.payNext}
          </p>
        )}
        {!slotId && !blocked && (
          <p className="text-muted-foreground text-fine text-center">
            {t.chooseSlot}
          </p>
        )}
        <Link
          href="/cart"
          className="text-center text-sm font-semibold underline underline-offset-[3px]"
        >
          {t.changeItems}
        </Link>
      </aside>
    </form>
  );
}

const SUMMARY =
  "rounded-card border-border bg-card grid min-w-0 gap-4 border p-5 md:p-7 lg:sticky lg:top-sticky";

/** The summary's heading and one row per Cart Line. */
function SummaryLines({ cart }: { cart: CartView }) {
  const m = useMessages();
  const t = m.checkout;
  const { priced } = cart;
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="h-summary" className="type-h3">
          {m.cart.orderSummary}
        </h2>
        <span className="text-muted-foreground text-sm">
          {cart.itemCount} {m.items(cart.itemCount)}
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
                <b className="text-label block font-semibold">{name}</b>
                <small className="text-muted-foreground text-fine block">
                  {t.lineDetail(
                    line.quantity,
                    line.product.isWeighed,
                    m.cart.substitution[line.substitution.preference].label
                  )}
                </small>
              </span>
              <span className="font-semibold tabular-nums">
                {total ? (
                  formatMoney(total.lineTotalCents)
                ) : (
                  <span className="text-muted-foreground text-sm font-medium">
                    {t.soldOut}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * Checkout before the first address (ADR 0018): the address form beside
 * what is being bought and the total so far.
 */
export function SummaryPreview({ cart }: { cart: CartView }) {
  return (
    <aside aria-labelledby="h-summary" className={SUMMARY}>
      <SummaryLines cart={cart} />
      <CartSummary priced={cart.priced} size="page" />
      <CartNotes priced={cart.priced} />
      <VoucherForm view={cart} />
    </aside>
  );
}
