"use client";

import { PRIMARY_BUTTON } from "@/components/ui/button-classes";

// Shown when a page fails to load; the header and footer stay.
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="wrap py-20">
      <div className="mx-auto grid max-w-md justify-items-start gap-4">
        <h1 className="type-h2">This page did not load</h1>
        <p className="text-muted-foreground">
          Something went wrong on our side. Please try again.
        </p>
        <button type="button" onClick={reset} className={PRIMARY_BUTTON}>
          Try again
        </button>
      </div>
    </section>
  );
}
