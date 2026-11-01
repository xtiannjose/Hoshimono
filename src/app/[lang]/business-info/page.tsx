import type { Metadata } from "next";

import { Email, LegalPage, legalMetadata } from "@/components/legal-page";
import Link from "@/components/link";
import { legal } from "@/config/legal";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("business", "/business-info");
}

/**
 * The details an online merchant must show (Internet Transactions Act, RA
 * 11967; Consumer Act, RA 7394), tax status and receipts (ADR 0007, 0012).
 * A draft until a Philippine lawyer reviews it (Batch 6.3).
 */
export default function BusinessInfoPage() {
  return (
    <LegalPage policy="business">
      <p>
        Philippine law asks online shops to say clearly who they are and how to
        reach them. Here are our details.
      </p>

      <h2 id="business">Our business</h2>
      <dl>
        <dt>Registered name</dt>
        <dd>{legal.businessName}</dd>
        <dt>Trade name</dt>
        <dd>{legal.tradeName}</dd>
        <dt>Business type</dt>
        <dd>{legal.businessType}</dd>
        <dt>DTI or SEC registration</dt>
        <dd>{legal.registration}</dd>
        <dt>Business permit</dt>
        <dd>{legal.businessPermit}</dd>
        <dt>Registered address</dt>
        <dd>{legal.address}</dd>
        <dt>Email</dt>
        <dd>
          <Email to={legal.supportEmail} />
        </dd>
        <dt>Phone</dt>
        <dd>{legal.supportPhone}</dd>
        <dt>Hours</dt>
        <dd>{legal.supportHours}</dd>
      </dl>

      <h2 id="tax">Tax</h2>
      <dl>
        <dt>TIN</dt>
        <dd>{legal.tin}</dd>
        <dt>BIR registration</dt>
        <dd>{legal.birRegistration}</dd>
        <dt>VAT status</dt>
        <dd>{legal.vatStatus}</dd>
      </dl>
      <p>
        Our prices are in Philippine pesos and already include VAT where it
        applies. Fresh, unprocessed food such as fruit, vegetables, meat and
        fish is usually VAT-exempt; most other items and the Delivery Fee
        include 12% VAT. Your Order page shows how much VAT your total includes.
      </p>

      <h2 id="receipts">Receipts</h2>
      <p>
        Every Order comes with a printed Delivery Receipt, packed with your
        groceries. It lists what each item was charged after picking, the total,
        and how that total splits into VATable, VAT-exempt and zero-rated sales
        and the VAT included.
      </p>
      <p>
        Until our registration with the Bureau of Internal Revenue (BIR) is
        complete, the Delivery Receipt says “This is not an official receipt.”
        Once we&apos;re registered, you&apos;ll get a BIR-registered invoice
        with each Order instead.
      </p>

      <h2 id="consumers">Your rights as a shopper</h2>
      <ul>
        <li>
          The price you see is the price you pay, in pesos, with VAT included.
          We show a Unit Price (per 100 g, per litre or per piece) so you can
          compare sizes.
        </li>
        <li>
          Product pages list allergens and storage. Items sold by weight say so,
          and are charged for the weight we pack.
        </li>
        <li>
          Refunds, Substitutions and Freshness Claims follow our{" "}
          <Link href="/refunds">Refunds and Returns</Link> policy, which
          doesn&apos;t limit your rights under the Consumer Act or the Internet
          Transactions Act.
        </li>
        <li>Online payments are handled by PayMongo on its own secure page.</li>
      </ul>

      <h2 id="complaints">Complaints</h2>
      <p>
        If something isn&apos;t right, please tell us first at{" "}
        <Email to={legal.supportEmail} /> or {legal.supportPhone}, and
        we&apos;ll work to fix it. If we can&apos;t settle it, you can bring a
        complaint to the Department of Trade and Industry (DTI) through its
        Consumer Care Hotline, 1-384, or at{" "}
        <a href="https://www.dti.gov.ph">dti.gov.ph</a>.
      </p>
      <p>
        For questions about your personal data, see our{" "}
        <Link href="/privacy">Privacy Policy</Link> or write to our Data
        Protection Officer at <Email to={legal.dpoEmail} />.
      </p>
    </LegalPage>
  );
}
