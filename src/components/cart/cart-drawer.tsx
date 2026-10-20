"use client";

import { TruckIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { Drawer } from "vaul";
import { useEffect, useState, useSyncExternalStore } from "react";

import { loadCart, loadDelivery, type DeliveryRow } from "@/app/cart/actions";
import { ICON_BUTTON, PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { z } from "@/config/z";
import { formatMoney } from "@/lib/money";

import { CartLines, EmptyCart } from "./cart-contents";
import { setCartOpen, setCartView, useCart } from "./cart-store";
import { CartNotes, CartSummary } from "./cart-summary";

const WIDE = "(min-width: 768px)";
const subscribe = (change: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

/**
 * Bottom sheet on phones, side sheet from md up (docs/05 CartDrawer), built
 * on vaul: it follows the finger 1:1 and closes on a fast or long drag.
 * vaul's own transition, not a Motion spring, and no detents: the Cart has
 * one height (docs/05, as built in Phase 2).
 */
export default function CartDrawer() {
  const open = useCart((s) => s.open);
  const view = useCart((s) => s.view);
  const close = () => setCartOpen(false);
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false
  );

  // The header normally hands over the Cart; fetch it if that has not landed.
  useEffect(() => {
    if (open && !view) loadCart().then(setCartView, () => {});
  }, [open, view]);

  // undefined while loading; null when there is no Slot to name (a guest).
  const [delivery, setDelivery] = useState<DeliveryRow | null>();
  // Asked again on each open: a hold can start or lapse in between.
  useEffect(() => {
    if (!open) return;
    let live = true;
    loadDelivery().then(
      (row) => live && setDelivery(row),
      () => live && setDelivery(null)
    );
    return () => {
      live = false;
    };
  }, [open]);

  const hasLines = (view?.lines.length ?? 0) > 0;
  const canCheckout = (view?.priced.lines.length ?? 0) > 0;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={setCartOpen}
      direction={wide ? "right" : "bottom"}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          style={{ zIndex: z.drawer }}
          className="bg-scrim fixed inset-0"
        />
        <Drawer.Content
          style={{ zIndex: z.drawer }}
          aria-describedby={undefined}
          className="bg-card shadow-float rounded-t-card fixed inset-x-0 bottom-0 flex max-h-[90dvh] flex-col outline-none md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[440px] md:rounded-none"
        >
          <div className="bg-border-strong mx-auto mt-2 h-[5px] w-10 rounded-full opacity-60 md:hidden" />
          <div className="flex items-center justify-between px-5 pt-3 pb-2 md:pt-5">
            <div className="flex items-baseline gap-2.5">
              <Drawer.Title className="type-h3">Your cart</Drawer.Title>
              {view && view.itemCount > 0 && (
                <span className="text-muted-foreground text-sm">
                  {view.itemCount} {view.itemCount === 1 ? "item" : "items"}
                </span>
              )}
            </div>
            <Drawer.Close className={`${ICON_BUTTON} bg-muted`}>
              <XIcon size={22} aria-hidden />
              <span className="sr-only">Close cart</span>
            </Drawer.Close>
          </div>

          {delivery ? (
            <div className="rounded-field bg-muted mx-5 mb-1 flex items-center gap-3 px-3.5 py-2.5 text-sm">
              <TruckIcon size={20} aria-hidden className="shrink-0" />
              <p className="min-w-0 flex-1">
                <b className="block">{delivery.slot}</b>
                <span className="text-muted-foreground">{delivery.note}</span>
              </p>
              {hasLines && (
                <Link
                  href="/checkout"
                  onClick={close}
                  className="font-semibold underline underline-offset-[3px]"
                >
                  Change
                </Link>
              )}
            </div>
          ) : delivery === null ? (
            <p className="rounded-field bg-muted mx-5 mb-1 flex items-center gap-3 px-3.5 py-2.5 text-sm">
              <TruckIcon size={20} aria-hidden className="shrink-0" />
              Same-day delivery in 2-hour slots. Choose yours at checkout.
            </p>
          ) : (
            <div
              aria-hidden
              className="rounded-field bg-muted mx-5 mb-1 h-14 animate-pulse"
            />
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3">
            {!view ? (
              <div aria-hidden className="grid gap-3 py-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="bg-muted rounded-field h-20 animate-pulse"
                  />
                ))}
              </div>
            ) : hasLines ? (
              <CartLines view={view} onNavigate={close} />
            ) : (
              <EmptyCart onNavigate={close} />
            )}
          </div>

          {view && hasLines && (
            <div className="border-border grid gap-3 border-t px-5 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
              <CartSummary priced={view.priced} />
              <CartNotes priced={view.priced} />
              <Link
                href="/checkout"
                onClick={close}
                aria-disabled={!canCheckout}
                className={`${PRIMARY_BUTTON} w-full ${canCheckout ? "" : "pointer-events-none opacity-50"}`}
              >
                Checkout, {formatMoney(view.priced.totalCents)}
              </Link>
              <Link
                href="/cart"
                onClick={close}
                className="text-center text-sm font-semibold underline underline-offset-[3px]"
              >
                See full cart
              </Link>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
