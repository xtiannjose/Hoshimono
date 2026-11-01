"use client";

import { ShoppingCartIcon } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { lazy, Suspense, useEffect } from "react";
import { createPortal } from "react-dom";

import { z } from "@/config/z";
import { useMessages, useShopPath } from "@/i18n/client";
import { formatMoney } from "@/lib/money";
import type { CartView } from "@/modules/cart";

import { setCartOpen, setCartView, useCart } from "./cart-store";

// The drawer's code loads on the first open, not with every page.
const CartDrawer = dynamic(() => import("./cart-drawer"), { ssr: false });
// The count's bump brings Motion, so it loads once the Cart has items.
const CountBadge = lazy(() => import("./count-badge"));
const BADGE =
  "rounded-pill bg-btn-fg text-btn inline-block min-w-6 px-[7px] text-center text-fine leading-6 font-bold tabular-nums";

/** Hands the server's Cart to the store once it streams in. */
export function CartSync({ view }: { view: CartView }) {
  useEffect(() => setCartView(view), [view]);
  return null;
}

/**
 * Header Cart button (docs/05 CartButton): a primary pill with total and
 * count from md up. Phones get the floating CartBar instead (mockup-v2).
 */
export function CartButton() {
  const count = useCart((s) => s.view?.itemCount ?? 0);
  // Goods only: the delivery fee depends on the address chosen at Checkout,
  // so the header and Checkout never disagree.
  const total = useCart((s) =>
    s.view ? s.view.priced.subtotalCents - s.view.priced.discountCents : 0
  );
  const drawerLoaded = useCart((s) => s.drawerLoaded);
  const t = useMessages();

  return (
    <>
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        aria-haspopup="dialog"
        className="rounded-pill bg-btn text-btn-fg hover:bg-btn-hover relative hidden h-12 items-center gap-2 px-4 font-semibold transition-[background-color,transform] duration-150 active:scale-[0.97] motion-reduce:active:scale-100 md:inline-flex"
      >
        <ShoppingCartIcon size={22} aria-hidden />
        {/* The name reads "Cart: ₱230.00 2 items", containing the visible text. */}
        {count > 0 ? (
          <>
            <span className="sr-only">{t.shell.cart}:</span>
            <span className="tabular-nums">{formatMoney(total)}</span>
            <Suspense
              fallback={
                <span className={BADGE}>
                  {count}
                  <span className="sr-only"> {t.items(count)}</span>
                </span>
              }
            >
              <CountBadge
                count={count}
                label={t.items(count)}
                className={BADGE}
              />
            </Suspense>
          </>
        ) : (
          <span>{t.shell.cart}</span>
        )}
      </button>
      <CartBar count={count} total={total} />
      {drawerLoaded && <CartDrawer />}
    </>
  );
}

/** Phones: a floating bar with count, "View cart" and the goods total. */
function CartBar({ count, total }: { count: number; total: number }) {
  const open = useCart((s) => s.open);
  // Nothing in the Cart is also the server render, so the page shell never
  // reads the URL (Next requires that to sit inside Suspense).
  if (count === 0 || open) return null;
  return <FloatingCartBar count={count} total={total} />;
}

function FloatingCartBar({ count, total }: { count: number; total: number }) {
  // The Cart and Checkout pages show the Cart already.
  const path = useShopPath();
  const t = useMessages().shell;
  if (path === "/cart" || path.startsWith("/checkout")) return null;
  // Portalled: the header's backdrop blur would pin a fixed child to it.
  return createPortal(
    <div
      style={{ zIndex: z.sticky }}
      data-cart-bar
      className="fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom))] md:hidden"
    >
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="rounded-pill bg-btn text-btn-fg shadow-float flex h-14 w-full items-center gap-3 px-5 font-semibold"
      >
        <span className="rounded-pill bg-btn-fg text-btn min-w-7 px-2 text-center text-sm leading-7 font-bold tabular-nums">
          {count}
        </span>
        <span>{t.viewCart}</span>
        <span className="ml-auto tabular-nums">{formatMoney(total)}</span>
      </button>
    </div>,
    document.body
  );
}
