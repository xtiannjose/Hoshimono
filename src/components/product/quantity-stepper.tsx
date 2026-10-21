"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState, type Ref } from "react";

import { MAX_LINE_QUANTITY } from "@/lib/cart-limits";

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
  // A hold counts here and tells the parent once, on release: one server
  // update and one announcement instead of one every REPEAT_EVERY ms.
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? value;
  // Timers run between renders, so they read the latest props and draft here.
  const latest = useRef({ value, onChange, min, max });
  useEffect(() => {
    latest.current = { value, onChange, min, max };
  });
  const drafting = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Set once a hold has repeated, so the click that ends it adds nothing.
  const repeated = useRef(false);

  function clear() {
    clearTimeout(timer.current);
    clearInterval(timer.current);
    timer.current = undefined;
  }
  function release() {
    clear();
    const next = drafting.current;
    if (next === null) return;
    drafting.current = null;
    setDraft(null);
    if (next !== latest.current.value) latest.current.onChange(next);
  }
  function start(by: 1 | -1) {
    clear();
    repeated.current = false;
    timer.current = setTimeout(() => {
      repeated.current = true;
      const tick = () => {
        const { value: now, min: lo, max: hi } = latest.current;
        const next = (drafting.current ?? now) + by;
        // At a limit the button disables and may never see pointerup.
        if (next < lo || next > hi) return release();
        drafting.current = next;
        setDraft(next);
      };
      tick();
      timer.current = setInterval(tick, REPEAT_EVERY);
    }, REPEAT_DELAY);
  }
  useEffect(() => clear, []);

  function tap(by: 1 | -1, detail: number) {
    // The click that ends a long press must not add one more. Keyboard
    // clicks (detail 0) never end a press.
    const endsHold = repeated.current && detail > 0;
    repeated.current = false;
    if (endsHold) return;
    const { value: now, onChange: change, min: lo, max: hi } = latest.current;
    const next = now + by;
    if (next >= lo && next <= hi) change(next);
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
        disabled={shown <= min}
        onPointerDown={(e) => {
          if (e.button === 0) start(-1);
        }}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onClick={(e) => tap(-1, e.detail)}
        className="rounded-pill grid size-11 touch-manipulation place-items-center transition-colors select-none disabled:opacity-40"
      >
        <MinusIcon size={20} aria-hidden />
      </button>
      {/* Count bump confirms the change (motion table, docs/05 section 7). */}
      {/* Not a live region: the Cart announces "Name, 2 in cart" itself. */}
      <m.output
        key={shown}
        aria-live="off"
        // Springs take two keyframes: mount enlarged, settle to normal size.
        initial={reduce ? false : { scale: 1.18 }}
        animate={{ scale: 1 }}
        transition={SNAP}
        className="font-display text-center text-lg font-semibold tabular-nums"
      >
        {shown}
      </m.output>
      <button
        ref={plusRef}
        type="button"
        aria-label={increaseLabel}
        disabled={shown >= max}
        onPointerDown={(e) => {
          if (e.button === 0) start(1);
        }}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onClick={(e) => tap(1, e.detail)}
        className="rounded-pill grid size-11 touch-manipulation place-items-center transition-colors select-none disabled:opacity-40"
      >
        <PlusIcon size={20} aria-hidden />
      </button>
    </div>
  );
}
