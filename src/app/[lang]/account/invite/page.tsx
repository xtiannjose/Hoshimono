import type { Metadata } from "next";
import { Suspense } from "react";

import { Breadcrumb } from "@/components/breadcrumb";
import { Tag } from "@/components/product/tag";
import { Skeleton } from "@/components/ui/skeleton";
import { localPath } from "@/i18n/lang";
import { getLang, getMessages } from "@/i18n/server";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getReferralCode, listReferrals } from "@/modules/customers";
import { requireCustomer } from "@/modules/identity";
import { listCustomerVouchers, REFERRAL_REWARD_CENTS } from "@/modules/pricing";

import { ShareLink } from "./share-link";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getMessages()).invite.title,
    robots: { index: false },
  };
}

export default async function InvitePage() {
  const m = await getMessages();
  return (
    <section className="wrap pb-14">
      <Breadcrumb
        items={[
          { name: m.account.title, href: "/account" },
          { name: m.invite.title, href: "/account/invite" },
        ]}
      />
      <h1 className="type-h1 pt-2">{m.invite.title}</h1>
      <Suspense
        fallback={<Skeleton className="rounded-card mt-6 h-64 max-w-2xl" />}
      >
        <Invite />
      </Suspense>
    </section>
  );
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** The Referral link, friends who joined, and the Customer's Vouchers (ADR 0015). */
async function Invite() {
  const customer = await requireCustomer("/account/invite");
  const [code, friends, vouchers] = await Promise.all([
    getReferralCode(customer.id),
    listReferrals(customer.id),
    listCustomerVouchers(customer.id),
  ]);
  const lang = await getLang();
  const t = (await getMessages()).invite;
  const reward = formatMoney(REFERRAL_REWARD_CENTS);
  return (
    <div className="mt-4 grid max-w-2xl gap-10">
      <div className="grid gap-4">
        <p className="type-lead">{t.lead(reward)}</p>
        {/* A Filipino page shares a link that lands on the Filipino shop. */}
        <ShareLink
          url={new URL(localPath(lang, `/r/${code}`), appUrl()).toString()}
        />
        <p className="text-muted-foreground text-sm">
          {t.codeIs} <b className="text-foreground font-mono">{code}</b>.
        </p>
      </div>

      <section aria-labelledby="h-friends" className="grid gap-3">
        <h2 id="h-friends" className="type-h3">
          {t.friends}
        </h2>
        {friends.length === 0 ? (
          <p className="text-muted-foreground">{t.noFriends}</p>
        ) : (
          <ul className="divide-border grid divide-y">
            {friends.map((f, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <span>{t.joined(f.name, formatDate(f.joinedAt, lang))}</span>
                <Tag tone={f.rewardedAt ? "soft" : "quiet"}>
                  {f.rewardedAt ? t.earned(reward) : t.waiting}
                </Tag>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-vouchers" className="grid gap-3">
        <h2 id="h-vouchers" className="type-h3">
          {t.vouchers}
        </h2>
        {vouchers.length === 0 ? (
          <p className="text-muted-foreground">{t.noVouchers}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {vouchers.map((v) => (
              <li
                key={v.id}
                className="rounded-card border-border bg-card grid gap-1 border p-4"
              >
                <b className="font-mono">{v.code}</b>
                <span className="text-sm">
                  {t.voucher(
                    formatMoney(v.value),
                    formatMoney(v.minSpendCents)
                  )}
                </span>
                <span className="text-muted-foreground text-sm">
                  {v.used ? t.used : t.until(formatDate(v.endsAt, lang))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
