import { WifiSlashIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";

import { getMessages } from "@/i18n/server";

import { RetryButton } from "./retry-button";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getMessages()).app.offlineTitle,
    robots: { index: false },
  };
}

/** What the service worker shows for a page it has not kept (ADR 0017). */
export default async function OfflinePage() {
  const t = (await getMessages()).app;
  return (
    <section className="wrap py-20">
      <div className="mx-auto grid max-w-md justify-items-start gap-4">
        <WifiSlashIcon size={40} aria-hidden />
        <h1 className="type-h2">{t.offlineTitle}</h1>
        <p className="text-muted-foreground">{t.offlineBody}</p>
        <RetryButton label={t.retry} />
      </div>
    </section>
  );
}
