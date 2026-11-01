import type { Metadata } from "next";

import { Email, LegalPage, legalMetadata } from "@/components/legal-page";
import Link from "@/components/link";
import { legal } from "@/config/legal";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("terms", "/terms");
}

/**
 * Terms of use and sale. Numbers match the code (Slot hold, Payment Window,
 * cash limits, Referral Voucher); a draft until a Philippine lawyer reviews
 * it (Batch 6.3).
 */
export default function TermsPage() {
  return (
    <LegalPage policy="terms">
      <p>
        These terms apply when you use {legal.tradeName}, on the web or as the
        installed app, and when you buy from us. The seller is{" "}
        {legal.businessName}, {legal.address}. By creating an account or placing
        an Order, you agree to them.
      </p>
      <p>
        Nothing in these terms takes away your rights under Philippine law,
        including the Consumer Act and the Internet Transactions Act.
      </p>

      <h2 id="words">Words we use</h2>
      <ul>
        <li>
          <strong>Cart:</strong> the items you are choosing before you check
          out.
        </li>
        <li>
          <strong>Order:</strong> what you confirm at Checkout, to be delivered
          to one Address in one delivery Slot.
        </li>
        <li>
          <strong>Slot:</strong> a delivery window on a given day, such as 2:00
          to 4:00 PM.
        </li>
        <li>
          <strong>Hub:</strong> our own facility, not open to the public, where
          Pickers pick your Order and Riders set off from.
        </li>
        <li>
          <strong>Substitution:</strong> a Product we deliver instead of one
          that ran out.
        </li>
        <li>
          <strong>Final Total:</strong> what your Order comes to after picking,
          by what we actually packed.
        </li>
        <li>
          <strong>Voucher:</strong> a code that takes money off an Order or
          makes delivery free.
        </li>
      </ul>

      <h2 id="account">Your account</h2>
      <ul>
        <li>You need to be 18 or older to have an account and order.</li>
        <li>
          You sign in with a code sent to your mobile, a link sent to your
          email, or Google. Keep your phone and email secure: anyone who can
          read them can sign in as you.
        </li>
        <li>
          Give us your real name, a working mobile number and an accurate
          Address, so the Rider can find you.
        </li>
        <li>
          We may suspend an account used for fraud, to abuse Vouchers or
          Freshness Claims, or to harass our staff. We&apos;ll tell you why.
        </li>
      </ul>

      <h2 id="delivery-areas">Where and when we deliver</h2>
      <ul>
        <li>
          We deliver to the areas of Metro Manila on our{" "}
          <Link href="/delivery">delivery page</Link>. Each area has its own
          Delivery Fee, the amount at which delivery becomes free, and a minimum
          Order. You see all three before you pay.
        </li>
        <li>
          You choose a delivery Slot at Checkout, up to 7 days ahead. We hold it
          for 10 minutes while you finish. A Slot stops taking new Orders 90
          minutes before it starts, so we have time to pick and travel.
        </li>
        <li>
          Someone needs to be at the Address during the Slot to receive the
          Order.
        </li>
      </ul>

      <h2 id="prices">Prices</h2>
      <ul>
        <li>
          Prices are in Philippine pesos and include VAT where it applies.
        </li>
        <li>
          Prices and Promotions can change while an item sits in your Cart. Your
          Cart tells you when a price went up or down. The prices on your Order
          are fixed when you place it; later changes in our shop never change a
          placed Order.
        </li>
        <li>
          The minimum Order and free delivery are checked once, at Checkout. If
          picking leaves your Order below either, we don&apos;t add a fee or ask
          for more.
        </li>
      </ul>

      <h2 id="ordering">Placing an Order</h2>
      <ul>
        <li>
          At Checkout you confirm the Address, delivery Slot, mobile number and
          how you&apos;ll pay. We check prices, stock and the delivery area on
          our side when you place the Order, and tell you plainly if something
          changed.
        </li>
        <li>
          <strong>Cash on delivery:</strong> your Order is confirmed when you
          place it. A cash Order can be up to ₱20,000, and you can have up to 3
          cash Orders on the way at a time.
        </li>
        <li>
          <strong>GCash or card:</strong> your Order is confirmed once PayMongo
          tells us the payment went through. We hold your items and Slot for 15
          minutes while you pay. If the payment doesn&apos;t arrive in that
          time, we cancel the Order and put the items back in your Cart.
        </li>
        <li>
          We may refuse an Order if items sold out, the Slot filled up, or the
          Address is outside our delivery areas, and we limit how many Orders
          one account or connection can try in an hour.
        </li>
      </ul>

      <h2 id="picking">Stock, weighed items and Substitutions</h2>
      <p>
        You never pay for an item you don&apos;t get, and you never pay more
        than the estimate at Checkout. Items sold by weight are charged for the
        weight we pack. Each item in your Cart says what we should do if
        it&apos;s out of stock. Our{" "}
        <Link href="/refunds">Refunds and Returns</Link> policy explains how all
        of this works.
      </p>

      <h2 id="paying">Paying</h2>
      <ul>
        <li>
          <strong>Cash on delivery:</strong> you pay the Rider the Final Total
          at your door.
        </li>
        <li>
          <strong>GCash or card:</strong> you pay on PayMongo&apos;s secure
          page; card details never reach our servers. You pay the estimated
          total when you order. If the Final Total comes out lower, we refund
          the difference once picking is done.
        </li>
      </ul>

      <h2 id="delivery">Delivery</h2>
      <ul>
        <li>The Rider calls your mobile number when they arrive.</li>
        <li>
          When your Order leaves the Hub, we send you a 4-digit Delivery PIN by
          text and email, and show it on your Order page. Give it only to our
          Rider, at your door. The Rider enters it to confirm the delivery.
        </li>
        <li>
          If we can&apos;t deliver, we contact you to try again. See{" "}
          <Link href="/refunds#missed">missed deliveries</Link>.
        </li>
      </ul>

      <h2 id="cancel">Cancelling and refunds</h2>
      <p>
        You can cancel from your Order page until we start picking. Refunds,
        Freshness Claims and missed deliveries are covered in our{" "}
        <Link href="/refunds">Refunds and Returns</Link> policy.
      </p>

      <h2 id="vouchers">Vouchers and Referrals</h2>
      <ul>
        <li>
          You can use one Voucher per Order, on top of any Promotion. Each
          Voucher has its own rules, such as dates, a minimum spend, first Order
          only, or how many times it can be used. We tell you if a Voucher
          can&apos;t be used, and why.
        </li>
        <li>
          A Voucher takes money off your items, not the Delivery Fee, unless it
          is a free-delivery Voucher. Vouchers can&apos;t be exchanged for cash.
        </li>
        <li>
          When a friend you invited with your Referral link has their first
          Order delivered, you each get a ₱100 Voucher. It needs a ₱500 minimum
          Order and lasts 60 days. You get one reward per friend.
        </li>
        <li>
          We may cancel Vouchers gained through fake accounts or other abuse.
        </li>
      </ul>

      <h2 id="products">Product information</h2>
      <ul>
        <li>
          Product names, photos, descriptions, allergens and storage notes come
          from our suppliers and product labels. Packaging can change, and a
          photo may differ a little from what you get.
        </li>
        <li>
          If you have an allergy, always read the pack before eating, even when
          we list no allergens.
        </li>
        <li>
          Recipes and Tips and guides are for general cooking information.
        </li>
      </ul>

      <h2 id="fair-use">Using the shop fairly</h2>
      <p>
        Please don&apos;t try to break into accounts or our systems, copy the
        shop in bulk with automated tools, place Orders you don&apos;t mean to
        receive, or misuse Vouchers or Freshness Claims.
      </p>

      <h2 id="responsibility">Our responsibility</h2>
      <ul>
        <li>
          We are responsible for selling you goods that are safe and as
          described, as Philippine consumer law requires.
        </li>
        <li>
          If a typhoon, flood, road closure or similar event stops us from
          delivering, we&apos;ll contact you to move your Order to another Slot
          or cancel it. If you paid online, a cancelled Order is refunded in
          full.
        </li>
      </ul>

      <h2 id="changes">Changes to these terms</h2>
      <p>
        When we change these terms, we update the date at the top. An Order
        follows the terms in place when you placed it.
      </p>

      <h2 id="law">Law and disputes</h2>
      <p>
        Philippine law governs these terms. If something goes wrong, please
        contact us first so we can fix it. You can also bring a complaint to the
        Department of Trade and Industry (DTI). See{" "}
        <Link href="/business-info">Tax and Business Information</Link>.
      </p>

      <h2 id="contact">Contact us</h2>
      <dl>
        <dt>Email</dt>
        <dd>
          <Email to={legal.supportEmail} />
        </dd>
        <dt>Phone</dt>
        <dd>{legal.supportPhone}</dd>
        <dt>Hours</dt>
        <dd>{legal.supportHours}</dd>
        <dt>Address</dt>
        <dd>
          {legal.businessName}, {legal.address}
        </dd>
      </dl>
    </LegalPage>
  );
}
