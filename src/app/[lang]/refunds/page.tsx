import type { Metadata } from "next";

import { Email, LegalPage, legalMetadata } from "@/components/legal-page";
import Link from "@/components/link";
import { legal } from "@/config/legal";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("refunds", "/refunds");
}

/**
 * Refunds and returns, as the code does them: ADR 0008 (weighed items and
 * refunds), 0010 (Substitutions), 0011 (missed deliveries), 0016 (Freshness
 * Claims). A draft until a Philippine lawyer reviews it (Batch 6.3).
 */
export default function RefundsPage() {
  return (
    <LegalPage policy="refunds">
      <p>
        Groceries should arrive fresh, complete and as you ordered them. Here is
        what happens when plans change or something goes wrong, and how your
        money comes back.
      </p>

      <h2 id="cancel">Cancelling an Order</h2>
      <ul>
        <li>
          You can cancel from your Order page, free of charge, until we start
          picking it.
        </li>
        <li>
          Paid with GCash or a card? We refund everything you paid, Delivery Fee
          included, to the same GCash account or card, automatically.
        </li>
        <li>Paying cash on delivery? There is nothing to pay.</li>
        <li>
          If you leave an online payment unfinished, we wait 15 minutes, then
          cancel the Order and put the items back in your Cart. If your payment
          arrives after that, we refund it in full, automatically.
        </li>
        <li>
          Once picking has started, the Order can&apos;t be cancelled from the
          app. Contact us and we&apos;ll see what we can do.
        </li>
      </ul>

      <h2 id="weighed">Items sold by weight</h2>
      <p>
        Meat, fish and some fruit and vegetables are charged for the weight we
        pack. You order an estimated weight, and our Pickers pack within 10% of
        it.
      </p>
      <ul>
        <li>
          If we pack less, you pay less. If we pack more, the extra is on us:
          you never pay more than the estimate.
        </li>
        <li>
          Paid with GCash or a card? You pay the estimate when you order. When
          picking is done, we refund any difference in one go.
        </li>
        <li>
          Paying cash? The Rider collects the Final Total, by what we packed.
        </li>
        <li>Your Order page shows both the estimate and the Final Total.</li>
      </ul>

      <h2 id="substitutions">When something is out of stock</h2>
      <p>
        Each item in your Cart says what we should do if it&apos;s out of stock
        when we pick your Order:
      </p>
      <ul>
        <li>
          <strong>Pick a similar item:</strong> our Picker chooses the closest
          match. We text and email you a link, and you have 10 minutes to say
          no. If we don&apos;t hear from you, we take it as a yes.
        </li>
        <li>
          <strong>I&apos;ll choose:</strong> we use the item you picked, without
          asking again.
        </li>
        <li>
          <strong>No substitute:</strong> we leave it out, and you aren&apos;t
          charged for it.
        </li>
      </ul>
      <p>
        A Substitution never costs you more. You pay the lower of the two
        prices. If you say no to a Substitution, you don&apos;t pay for that
        item. Items sold by weight are never substituted: we pack what we have,
        or leave it out.
      </p>
      <p>
        If we find fewer than you ordered, you pay only for what we pack. Paid
        online, the difference comes back with the rest of your refund when
        picking is done.
      </p>

      <h2 id="claims">Something arrived spoiled, damaged, missing or wrong</h2>
      <p>
        Tell us within 24 hours of delivery with a Freshness Claim, from your
        Order page:
      </p>
      <ul>
        <li>
          Choose the item and the reason: spoiled or not fresh, damaged,
          missing, or wrong item.
        </li>
        <li>
          Say how many of that item had the problem. An item sold by weight is
          claimed as a whole.
        </li>
        <li>
          For spoiled or damaged items, add 1 to 3 photos of the item and its
          label.
        </li>
      </ul>
      <p>
        Our team reviews every claim. We may approve it in full, approve part of
        it, or say no with a reason. We work out the amount: what you paid for
        those items after picking, less their share of any Voucher discount. The
        Delivery Fee isn&apos;t part of a claim. You don&apos;t need to send the
        item back.
      </p>
      <p>When a claim is approved:</p>
      <ul>
        <li>
          <strong>Paid with GCash or a card:</strong> we refund the amount to
          the same GCash account or card.
        </li>
        <li>
          <strong>Paid cash</strong> (or nothing is left to refund on your
          payment): you get a Voucher for the amount, with no minimum spend,
          valid for 90 days.
        </li>
      </ul>
      <p>
        We tell you our decision by email, or by text if you have no email. Your
        Order page shows each claim and where it stands. Missed the 24 hours?
        Contact us anyway and we&apos;ll look into it.
      </p>

      <h2 id="missed">Missed deliveries</h2>
      <ul>
        <li>
          The Rider calls your mobile number when they arrive, and you give them
          your Delivery PIN.
        </li>
        <li>
          If they can&apos;t deliver, for example because nobody is home, they
          record why. We send you a “we missed you” message and call you to
          arrange another try. We don&apos;t charge another Delivery Fee for it.
        </li>
        <li>
          If we can&apos;t deliver in the end, we cancel the Order. Paid with
          GCash or a card, you get a full refund, Delivery Fee included. Paying
          cash, there is nothing to pay.
        </li>
      </ul>

      <h2 id="how">How refunds reach you</h2>
      <ul>
        <li>
          Every refund goes back to the GCash account or card you paid with,
          through PayMongo, down to the last centavo. We send each refund once
          and never charge a fee for it.
        </li>
        <li>
          We message you when we send one. Your bank or GCash may take a few
          days to show it.
        </li>
        <li>
          Cash Orders are not refunded in cash. When a Freshness Claim is
          approved, you get a Voucher instead.
        </li>
      </ul>

      <h2 id="returns">Returns</h2>
      <p>
        Because we sell food, we can&apos;t take items back because you changed
        your mind after delivery. For anything spoiled, damaged, missing or
        wrong, use a Freshness Claim. This policy doesn&apos;t limit your rights
        under the Consumer Act or other Philippine law.
      </p>

      <h2 id="contact">Questions</h2>
      <p>
        Email <Email to={legal.supportEmail} /> or call {legal.supportPhone} (
        {legal.supportHours}). See also our{" "}
        <Link href="/terms">Terms of Use and Sale</Link>.
      </p>
    </LegalPage>
  );
}
