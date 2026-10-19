"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState } from "react";

import {
  changeQuantity,
  quantityIn,
  useCart,
} from "@/components/cart/cart-store";

import { QuantityStepper } from "./quantity-stepper";

const SNAP = { type: "spring", visualDuration: 0.2, bounce: 0.1 } as const;

/**
 * The Add pill that becomes a filled stepper once the Product is in the
 * Cart, so a grid shows the basket at a glance. The quantity shows at once
 * and the server confirms it (cart-store).
 */
export function AddToCart({
  productId,
  name,
  max = 99,
}: {
  productId: string;
  name: string;
  max?: number;
}) {
  const quantity = useCart((s) => quantityIn(s, productId));
  const notice = useCart((s) =>
    s.notice?.productId === productId ? s.notice.text : null
  );
  const previous = useRef(quantity);
  // Pop only on a swap the shopper caused, never on the first paint or
  // when the saved Cart arrives after loading.
  const [swapped, setSwapped] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  // Focus follows the control that replaced the one just pressed (docs/05 section 10).
  useEffect(() => {
    if (swapped && previous.current === 0 && quantity > 0) {
      plusRef.current?.focus();
    }
    if (swapped && previous.current > 0 && quantity === 0) {
      addRef.current?.focus();
    }
    previous.current = quantity;
  }, [quantity, swapped]);

  function change(next: number) {
    setSwapped(true);
    void changeQuantity(productId, name, next);
  }

  return (
    <div className="grid gap-1.5">
      {/* Each control pops in when it replaces the other (mockup-v2 "pop"),
          keyed so the swap replays it. domAnimation is enough: no layout needed. */}
      <m.div
        key={quantity === 0 ? "add" : "stepper"}
        initial={reduce || !swapped ? false : { scale: 0.92, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SNAP}
      >
        {quantity === 0 ? (
          <button
            ref={addRef}
            type="button"
            onClick={() => change(1)}
            aria-label={`Add ${name} to cart`}
            className="rounded-pill bg-accent-soft text-foreground hover:bg-accent hover:text-on-accent inline-flex h-11 w-full items-center justify-center gap-1.5 text-[15px] font-bold transition-[background-color,transform] duration-150 active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <PlusIcon size={18} aria-hidden />
            Add
          </button>
        ) : (
          <QuantityStepper
            value={quantity}
            onChange={change}
            label={`Quantity of ${name}`}
            max={max}
            plusRef={plusRef}
          />
        )}
      </m.div>
      {notice && (
        <p className="text-warn text-[13px] leading-[18px] font-semibold">
          {notice}
        </p>
      )}
    </div>
  );
}
