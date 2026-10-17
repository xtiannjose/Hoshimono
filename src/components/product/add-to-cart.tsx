"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
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
    setQuantity(next);
    announce(
      next === 0 ? `${name} removed from cart` : `${name}, ${next} in cart`
    );
  }

  return (
    <motion.div
      layout={!reduce}
      transition={SNAP}
      style={{ borderRadius: 999 }}
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
    </motion.div>
  );
}
