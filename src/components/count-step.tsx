"use client";

import { useEffect } from "react";

type BrowserStep = "product_viewed" | "added_to_cart" | "checkout_started";

/** Count one funnel step (ADR 0017): the step's name only, no identifier. */
export function sendStep(step: BrowserStep) {
  try {
    navigator.sendBeacon?.("/api/events", step);
  } catch {
    // A count is never worth an error.
  }
}

/** Counts a step once when its page opens. */
export function CountStep({ step }: { step: BrowserStep }) {
  useEffect(() => {
    // Deferred, so development's double effect run counts once.
    const timer = setTimeout(() => sendStep(step), 0);
    return () => clearTimeout(timer);
  }, [step]);
  return null;
}
