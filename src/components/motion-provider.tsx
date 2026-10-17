"use client";

import { LazyMotion } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("./motion-features").then((m) => m.default);

/**
 * Keeps Motion out of the first load (docs/05 section 11 budget): the m
 * components render instantly and animate once features arrive. `strict`
 * fails loudly if a full `motion` component sneaks back in.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
