"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, type Ref } from "react";

import { MAX_LINE_QUANTITY } from "@/modules/pricing";

const SNAP = { type: "spring", visualDuration: 0.2, bounce: 0.1 } as const;
// Long-press repeat (docs/05 section 6): wait, then step steadily.
const REPEAT_DELAY = 400;
const REPEAT_EVERY = 100;

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

/**
 * Pill stepper: minus, count, plus, with 44 px targets (docs/05 section 6).
 * Holding a button repeats it; a tap or the keyboard steps once.
 */
export function QuantityStepper({
  value,
  onChange,
  label,
  min = 0,
  max = MAX_LINE_QUANTITY,
  variant = "filled",
  plusRef,
  decreaseLabel = "Remove one",
  increaseLabel = "Add one",
}: Props) {
  const reduce = useReducedMotion();
  // The repeat runs between renders, so it reads the latest value here.
  const latest = useRef({ value, onChange, min, max });
  useEffect(() => {
    latest.current = { value, onChange, min, max };
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Set once a hold has repeated, so the click that ends it adds nothing.
  const held = useRef(false);

  function step(by: 1 | -1) {
    const { value: now, onChange: change, min: lo, max: hi } = latest.current;
    const next = now + by;
    if (next < lo || next > hi) return stop();
    latest.current.value = next;
    change(next);
  }
  function stop() {
    clearTimeout(timer.current);
    clearInterval(timer.current);
    timer.current = undefined;
  }
  function start(by: 1 | -1) {
    stop();
    held.current = false;
    timer.current = setTimeout(() => {
      held.current = true;
      step(by);
      timer.current = setInterval(() => step(by), REPEAT_EVERY);
    }, REPEAT_DELAY);
  }
  useEffect(() => stop, []);

  function tap(by: 1 | -1) {
    // The click that ends a long press must not add one more.
    if (held.current) {
      held.current = false;
      return;
    }
    step(by);
  }

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
        onPointerDown={(e) => {
          if (e.button === 0) start(-1);
        }}
        onPointerUp={() => stop()}
        onPointerLeave={() => stop()}
        onPointerCancel={() => stop()}
        onClick={() => tap(-1)}
        className="rounded-pill grid size-11 touch-manipulation place-items-center transition-colors select-none disabled:opacity-40"
      >
        <MinusIcon size={20} aria-hidden />
      </button>
      {/* Count bump confirms the change (motion table, docs/05 section 7). */}
      <m.output
        key={value}
        // Springs take two keyframes: mount enlarged, settle to normal size.
        initial={reduce ? false : { scale: 1.18 }}
        animate={{ scale: 1 }}
        transition={SNAP}
        className="font-display text-center text-lg font-semibold tabular-nums"
      >
        {value}
      </m.output>
      <button
        ref={plusRef}
        type="button"
        aria-label={increaseLabel}
        disabled={value >= max}
        onPointerDown={(e) => {
          if (e.button === 0) start(1);
        }}
        onPointerUp={() => stop()}
        onPointerLeave={() => stop()}
        onPointerCancel={() => stop()}
        onClick={() => tap(1)}
        className="rounded-pill grid size-11 touch-manipulation place-items-center transition-colors select-none disabled:opacity-40"
      >
        <PlusIcon size={20} aria-hidden />
      </button>
    </div>
  );
}
