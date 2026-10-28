import type { Metadata } from "next";
import type { ReactNode } from "react";

import { legal } from "@/config/legal";
import { localPath } from "@/i18n/lang";
import { getLang, getMessages } from "@/i18n/server";
import { formatDate } from "@/lib/dates";

type Policy = "privacy" | "terms" | "refunds" | "business";

export async function legalMetadata(
  policy: Policy,
  path: string
): Promise<Metadata> {
  const t = (await getMessages()).legal[policy];
  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: localPath(await getLang(), path) },
  };
}

// Plain reading layout for long text: headings, short paragraphs, lists
// (docs/05 section 4: prose at most 65 characters wide).
const PROSE = [
  "mt-8 grid max-w-[65ch] gap-4 leading-relaxed",
  "[&_h2]:type-h3 [&_h2]:mt-6 [&_h2]:scroll-mt-24",
  "[&_h3]:mt-2 [&_h3]:font-semibold",
  "[&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-5",
  "[&_dl]:grid [&_dl]:gap-x-6 [&_dl]:gap-y-1 sm:[&_dl]:grid-cols-[auto_1fr] [&_dt]:font-semibold max-sm:[&_dd]:mb-2",
  "[&_a]:decoration-border-strong [&_a]:font-semibold [&_a]:underline [&_a]:decoration-[1.5px] [&_a]:underline-offset-4 [&_a:hover]:decoration-current",
].join(" ");

/**
 * A policy page (Batch 6.3). The heading and dates follow the page's
 * language; the policy text is English on every page, marked as such for
 * screen readers.
 */
export async function LegalPage({
  policy,
  children,
}: {
  policy: Policy;
  children: ReactNode;
}) {
  const lang = await getLang();
  const t = (await getMessages()).legal;
  return (
    <article className="wrap max-w-3xl py-10 md:py-14">
      <h1 className="type-h1">{t[policy].title}</h1>
      <p className="text-muted-foreground mt-3">
        {t.updated(formatDate(new Date(legal.updated), lang))}
      </p>
      {t.englishOnly && <p className="mt-2">{t.englishOnly}</p>}
      <div lang="en" className={PROSE}>
        {children}
      </div>
    </article>
  );
}

/** An email address as a link, or the "[to confirm: ...]" text as is. */
export function Email({ to }: { to: string }) {
  return to.includes("@") ? <a href={`mailto:${to}`}>{to}</a> : <>{to}</>;
}
