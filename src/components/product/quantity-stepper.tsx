"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import type { Ref } from "react";

const SNAP = { type: "spring", visualDuration: 0.2, bounce: 0.1 } as const;

type Props = {
  value: number;
  onChange: (next: number) => void;
  /** Group label, such as "Quantity of Fresh Milk". */
  label: string;
  min?: number;
  max?: number;
  /** Filled on Product cards ("in your Cart"); ghost for servings and Cart Lines. */
  variant?: "filled" | "ghost";
  plusRef?: Ref<HTMLButtonElement>;
  decreaseLabel?: string;
  increaseLabel?: string;
};

/** Pill stepper: minus, count, plus, with 44 px targets (docs/05 section 6). */
export function QuantityStepper({
  value,
  onChange,
  label,
  min = 0,
  max = 99,
  variant = "filled",
  plusRef,
  decreaseLabel = "Remove one",
  increaseLabel = "Add one",
}: Props) {
  const reduce = useReducedMotion();
  const tone =
    variant === "filled"
      ? "bg-btn text-btn-fg [&_button:hover]:bg-white/10"
      : "border border-input bg-card text-foreground [&_button:hover]:bg-muted";
  return (
    <div
      role="group"
      aria-label={label}
      className={`rounded-pill grid h-11 grid-cols-[44px_minmax(36px,1fr)_44px] items-center ${tone}`}
    >
      <button
        type="button"
        aria-label={decreaseLabel}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="rounded-pill grid size-11 place-items-center transition-colors disabled:opacity-40"
      >
        <MinusIcon size={20} aria-hidden />
      </button>
      {/* Count bump confirms the change (motion table, docs/05 section 7). */}
      <motion.output
        key={value}
        initial={reduce ? false : { scale: 1 }}
        animate={reduce ? undefined : { scale: [1, 1.18, 1] }}
        transition={SNAP}
        className="font-display text-center text-lg font-semibold tabular-nums"
      >
        {value}
      </motion.output>
      <button
        ref={plusRef}
        type="button"
        aria-label={increaseLabel}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="rounded-pill grid size-11 place-items-center transition-colors disabled:opacity-40"
      >
        <PlusIcon size={20} aria-hidden />
      </button>
    </div>
  );
}
