"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { lazy, Suspense, useState } from "react";

import {
  changeQuantity,
  quantityIn,
  useCart,
} from "@/components/cart/cart-store";
import { ADD_BUTTON } from "@/components/ui/button-classes";
import { useLang, useMessages } from "@/i18n/client";

// The stepper and Motion load on the first tap, or once the Cart holds this
// Product, so a grid of Add buttons ships no animation code (docs/05
// section 11 budget).
const LiveAddToCart = lazy(() => import("./live-add-to-cart"));

/** The Add pill; it hands over to LiveAddToCart once there is a quantity. */
export function AddToCart({
  productId,
  name,
  max,
}: {
  productId: string;
  name: string;
  max?: number;
}) {
  const quantity = useCart((s) => quantityIn(s, productId));
  const [woke, setWoke] = useState(false);
  const lang = useLang();
  const t = useMessages().product;

  // The same markup LiveAddToCart starts from, so the swap does not shift.
  const add = (busy: boolean) => (
    <div className="grid gap-1.5">
      <div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setWoke(true);
            void changeQuantity(productId, name, 1, lang);
          }}
          aria-label={t.addToCart(name)}
          className={ADD_BUTTON}
        >
          <PlusIcon size={18} aria-hidden />
          {t.add}
        </button>
      </div>
    </div>
  );

  if (!woke && quantity === 0) return add(false);
  return (
    <Suspense fallback={add(true)}>
      <LiveAddToCart productId={productId} name={name} max={max} woke={woke} />
    </Suspense>
  );
}
