import type { Metadata } from "next";
import { Suspense } from "react";

import { Breadcrumb } from "@/components/breadcrumb";
import { Tag } from "@/components/product/tag";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getReferralCode, listReferrals } from "@/modules/customers";
import { requireCustomer } from "@/modules/identity";
import { listCustomerVouchers, REFERRAL_REWARD_CENTS } from "@/modules/pricing";

import { ShareLink } from "./share-link";

export const metadata: Metadata = {
  title: "Invite friends",
  robots: { index: false },
};

export default function InvitePage() {
  return (
    <section className="wrap pb-14">
      <Breadcrumb
        items={[
          { name: "Your account", href: "/account" },
          { name: "Invite friends", href: "/account/invite" },
        ]}
      />
      <h1 className="type-h1 pt-2">Invite friends</h1>
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
  const reward = formatMoney(REFERRAL_REWARD_CENTS);
  return (
    <div className="mt-4 grid max-w-2xl gap-10">
      <div className="grid gap-4">
        <p className="type-lead">
          Share your link. When a friend&apos;s first order is delivered, you
          each get {reward} off your next order.
        </p>
        <ShareLink url={new URL(`/r/${code}`, appUrl()).toString()} />
        <p className="text-muted-foreground text-sm">
          Your code is <b className="text-foreground font-mono">{code}</b>.
        </p>
      </div>

      <section aria-labelledby="h-friends" className="grid gap-3">
        <h2 id="h-friends" className="type-h3">
          Friends who joined
        </h2>
        {friends.length === 0 ? (
          <p className="text-muted-foreground">
            No one yet. Your first reward is a share away.
          </p>
        ) : (
          <ul className="divide-border grid divide-y">
            {friends.map((f, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <span>
                  {f.name}, joined {formatDate(f.joinedAt)}
                </span>
                <Tag tone={f.rewardedAt ? "soft" : "quiet"}>
                  {f.rewardedAt ? `${reward} earned` : "First order on the way"}
                </Tag>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-vouchers" className="grid gap-3">
        <h2 id="h-vouchers" className="type-h3">
          Your Vouchers
        </h2>
        {vouchers.length === 0 ? (
          <p className="text-muted-foreground">
            Vouchers you earn show here. Type the code in your cart.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {vouchers.map((v) => (
              <li
                key={v.id}
                className="rounded-card border-border bg-card grid gap-1 border p-4"
              >
                <b className="font-mono">{v.code}</b>
                <span className="text-sm">
                  {formatMoney(v.value)} off orders of{" "}
                  {formatMoney(v.minSpendCents)} or more
                </span>
                <span className="text-muted-foreground text-sm">
                  {v.used ? "Used" : `Until ${formatDate(v.endsAt)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
