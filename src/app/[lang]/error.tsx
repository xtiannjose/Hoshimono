"use client";

import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { useMessages } from "@/i18n/client";

// Shown when a page fails to load; the header and footer stay.
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = useMessages().error;
  return (
    <section className="wrap py-20">
      <div className="mx-auto grid max-w-md justify-items-start gap-4">
        <h1 className="type-h2">{t.title}</h1>
        <p className="text-muted-foreground">{t.body}</p>
        <button type="button" onClick={reset} className={PRIMARY_BUTTON}>
          {t.retry}
        </button>
      </div>
    </section>
  );
}
