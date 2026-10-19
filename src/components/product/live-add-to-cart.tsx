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
import { Motion } from "@/components/motion";

import { ADD_BUTTON } from "@/components/ui/button-classes";
import { QuantityStepper } from "./quantity-stepper";

const SNAP = { type: "spring", visualDuration: 0.2, bounce: 0.1 } as const;

/**
 * The Add pill that becomes a filled stepper once the Product is in the
 * Cart, so a grid shows the basket at a glance. The quantity shows at once
 * and the server confirms it (cart-store). Loaded by AddToCart on the first
 * tap (`woke`: pop and move focus at once) or when the Cart holds it.
 */
export default function LiveAddToCart({
  productId,
  name,
  max,
  woke,
}: {
  productId: string;
  name: string;
  max?: number;
  woke: boolean;
}) {
  const quantity = useCart((s) => quantityIn(s, productId));
  const notice = useCart((s) =>
    s.notice?.productId === productId ? s.notice.text : null
  );
  // A first tap arrives here already at 1: treat it as a swap from 0.
  const previous = useRef(woke ? 0 : quantity);
  // Pop only on a swap the shopper caused, never on the first paint or
  // when the saved Cart arrives after loading.
  const [swapped, setSwapped] = useState(woke);
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
    <Motion>
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
              className={ADD_BUTTON}
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
    </Motion>
  );
}
