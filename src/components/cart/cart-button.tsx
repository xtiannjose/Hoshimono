"use client";

import { ShoppingCartIcon } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { z } from "@/config/z";
import { formatMoney } from "@/lib/money";
import type { CartView } from "@/modules/cart";

import { setCartOpen, setCartView, useCart } from "./cart-store";

// The drawer's code loads on the first open, not with every page.
const CartDrawer = dynamic(() => import("./cart-drawer"), { ssr: false });

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
  const total = useCart((s) => s.view?.priced.totalCents ?? 0);
  const drawerLoaded = useCart((s) => s.drawerLoaded);

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
            <span className="sr-only">Cart:</span>
            <span className="tabular-nums">{formatMoney(total)}</span>
            <span className="rounded-pill bg-btn-fg text-btn min-w-6 px-[7px] text-center text-[13px] leading-6 font-bold tabular-nums">
              {count}
              <span className="sr-only"> {count === 1 ? "item" : "items"}</span>
            </span>
          </>
        ) : (
          <span>Cart</span>
        )}
      </button>
      <CartBar count={count} total={total} />
      {drawerLoaded && <CartDrawer />}
    </>
  );
}

/** Phones: a floating bar with count, "View cart" and total. */
function CartBar({ count, total }: { count: number; total: number }) {
  const pathname = usePathname();
  const open = useCart((s) => s.open);
  if (
    count === 0 ||
    open ||
    pathname === "/cart" ||
    pathname.startsWith("/checkout")
  ) {
    return null;
  }
  // Portalled: the header's backdrop blur would pin a fixed child to it.
  return createPortal(
    <div
      style={{ zIndex: z.sticky }}
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
        <span>View cart</span>
        <span className="ml-auto tabular-nums">{formatMoney(total)}</span>
      </button>
    </div>,
    document.body
  );
}
