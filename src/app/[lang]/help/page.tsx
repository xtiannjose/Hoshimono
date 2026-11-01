import type { Metadata } from "next";

import Link from "@/components/link";
import { brand } from "@/config/brand";
import { localPath } from "@/i18n/lang";
import { getLang, getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getMessages()).help;
  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: localPath(await getLang(), "/help") },
  };
}

const LINK =
  "decoration-border-strong font-semibold underline decoration-[1.5px] underline-offset-4 hover:decoration-current";

/** Short answers to what shoppers ask most (ADR 0018). */
export default async function HelpPage() {
  const t = (await getMessages()).help;
  return (
    <section className="wrap max-w-3xl py-10 md:py-14">
      <h1 className="type-h1">{t.title}</h1>
      <p className="type-lead text-muted-foreground mt-3 max-w-[60ch]">
        {t.intro}
      </p>
      <div className="mt-8 grid gap-2">
        {t.questions.map(({ q, a }, i) => (
          <details
            key={q}
            open={i === 0}
            className="rounded-card border-border bg-card border px-5 py-1"
          >
            <summary className="flex min-h-12 cursor-pointer items-center font-semibold">
              {q}
            </summary>
            <p className="text-muted-foreground max-w-[60ch] pb-4">{a}</p>
          </details>
        ))}
      </div>
      <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/delivery" className={LINK}>
          {t.deliveryAreas}
        </Link>
        <Link href="/account/orders" className={LINK}>
          {t.orders}
        </Link>
      </p>
      {brand.supportEmail && (
        <p className="mt-4">
          {t.contact}{" "}
          <a href={`mailto:${brand.supportEmail}`} className={LINK}>
            {brand.supportEmail}
          </a>
          .
        </p>
      )}
    </section>
  );
}
