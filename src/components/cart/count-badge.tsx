"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { Motion } from "@/components/motion";

/** The header Cart count with its bump (docs/05 section 7); loaded lazily. */
export default function CountBadge({
  count,
  label,
  className,
}: {
  count: number;
  /** "items", in the page's language. */
  label: string;
  className: string;
}) {
  const reduce = useReducedMotion();
  return (
    <Motion>
      <m.span
        key={count}
        // Count bump: enlarge, settle.
        initial={reduce ? false : { scale: 1.18 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", visualDuration: 0.2, bounce: 0.1 }}
        className={className}
      >
        {count}
        <span className="sr-only"> {label}</span>
      </m.span>
    </Motion>
  );
}
