import type { Metadata } from "next";

import Link from "@/components/link";
import { buttonVariants } from "@/components/ui/button";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getMessages()).account.goodbyeTitle,
    robots: { index: false },
  };
}

/** Where "Delete my account" lands (ADR 0020). */
export default async function GoodbyePage() {
  const t = (await getMessages()).account;
  return (
    <section className="wrap py-20">
      <div className="mx-auto grid max-w-md justify-items-start gap-4">
        <h1 className="type-h2">{t.goodbyeTitle}</h1>
        <p className="text-muted-foreground">{t.goodbyeBody}</p>
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          {t.goodbyeHome}
        </Link>
      </div>
    </section>
  );
}
