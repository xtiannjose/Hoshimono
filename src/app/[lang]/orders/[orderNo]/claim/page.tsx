import type { Metadata } from "next";
import Link from "@/components/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getLang, getMessages } from "@/i18n/server";
import { formatDateTime } from "@/lib/dates";
import { claimableLines } from "@/modules/claims";
import { requireCustomer } from "@/modules/identity";

import { ClaimForm } from "./claim-form";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getMessages()).claims.title,
    robots: { index: false },
  };
}

type Props = PageProps<"/[lang]/orders/[orderNo]/claim">;

export default function ClaimPage({ params }: Props) {
  return (
    <section className="wrap py-10 md:py-14">
      <Suspense fallback={<Skeleton className="rounded-card h-96 max-w-xl" />}>
        <Claim params={params} />
      </Suspense>
    </section>
  );
}

/** Report a problem with a delivered item, within 24 hours (ADR 0016). */
async function Claim({ params }: { params: Props["params"] }) {
  const { orderNo } = await params;
  const customer = await requireCustomer(`/orders/${orderNo}/claim`);
  const order = await claimableLines(orderNo, customer.id);
  if (!order) notFound();
  const lang = await getLang();
  const t = (await getMessages()).claims;
  const lines = order.lines.filter((l) => !l.claim && l.units > 0);
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Link
          href={`/orders/${order.orderNo}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          {t.back(order.orderNo)}
        </Link>
        <h1 className="type-h1">{t.title}</h1>
        {order.open && order.windowEndsAt && (
          <p className="type-lead max-w-[60ch]">
            {t.lead(formatDateTime(order.windowEndsAt, lang))}
          </p>
        )}
      </div>
      {!order.open ? (
        <p className="rounded-card bg-muted max-w-xl p-5">
          {order.windowEndsAt ? t.passed : t.problems.not_delivered}
        </p>
      ) : lines.length === 0 ? (
        <p className="rounded-card bg-muted max-w-xl p-5">{t.allReported}</p>
      ) : (
        <ClaimForm orderNo={order.orderNo} lines={lines} />
      )}
    </div>
  );
}
