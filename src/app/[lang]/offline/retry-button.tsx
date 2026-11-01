"use client";

import { PRIMARY_BUTTON } from "@/components/ui/button-classes";

/** Loads the address again: the page wanted, once the connection is back. */
export function RetryButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => location.reload()}
      className={PRIMARY_BUTTON}
    >
      {label}
    </button>
  );
}
