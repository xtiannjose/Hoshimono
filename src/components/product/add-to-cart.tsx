"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState } from "react";

import { announce } from "@/components/live-region";

import { QuantityStepper } from "./quantity-stepper";

const SNAP = { type: "spring", visualDuration: 0.2, bounce: 0.1 } as const;

/**
 * The Add pill that becomes a filled stepper once the Product is in the
 * Cart, so a grid shows the basket at a glance.
 * shortcut: the quantity lives in this component until Batch 2.2 wires it
 * to the cart module; nothing is saved yet.
 */
export function AddToCart({ name, max = 99 }: { name: string; max?: number }) {
  const [quantity, setQuantity] = useState(0);
  const previous = useRef(0);
  // Pop only on a swap the shopper caused, never on the server-rendered first paint.
  const [swapped, setSwapped] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  // Focus follows the control that replaced the one just pressed (docs/05 section 10).
  useEffect(() => {
    if (previous.current === 0 && quantity > 0) plusRef.current?.focus();
    if (previous.current > 0 && quantity === 0) addRef.current?.focus();
    previous.current = quantity;
  }, [quantity]);

  function change(next: number) {
    setSwapped(true);
    setQuantity(next);
    announce(
      next === 0 ? `${name} removed from cart` : `${name}, ${next} in cart`
    );
  }

  return (
    // Each control pops in when it replaces the other (mockup-v2 "pop"),
    // keyed so the swap replays it. domAnimation is enough: no layout needed.
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
  );
}
