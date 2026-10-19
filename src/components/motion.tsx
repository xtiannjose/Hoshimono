"use client";

import { domAnimation, LazyMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Motion for one island that animates (live Add button, Cart count, Cart
 * lines). Those islands load lazily, so Motion never ships with a page's
 * first load (docs/05 section 11 budget). `strict` fails loudly if a full
 * `motion` component sneaks in instead of `m`.
 */
export function Motion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
