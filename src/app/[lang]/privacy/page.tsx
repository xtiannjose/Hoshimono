import type { Metadata } from "next";

import { Email, LegalPage, legalMetadata } from "@/components/legal-page";
import Link from "@/components/link";
import { legal } from "@/config/legal";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("privacy", "/privacy");
}

/**
 * Privacy Policy under the Data Privacy Act of 2012 (RA 10173), its IRR and
 * the NPC's privacy notice expectations. Every statement follows what the
 * code does; a draft until a Philippine lawyer reviews it (Batch 6.3).
 */
export default function PrivacyPage() {
  return (
    <LegalPage policy="privacy">
      <p>
        This policy explains what personal data {legal.tradeName} collects when
        you shop with us, why, who receives it, how long we keep it, and what
        you can ask us to do with it. We follow the Philippine Data Privacy Act
        of 2012 and the rules of the National Privacy Commission (NPC).
      </p>
      <p>
        {legal.tradeName} is run by {legal.businessName}, {legal.address}. We
        decide how your personal data is used, so we are responsible for it.
      </p>

      <h2 id="collect">What we collect</h2>
      <h3>Your account</h3>
      <ul>
        <li>Your name, email address and mobile number.</li>
        <li>
          If you sign in with Google: the name, email address and profile photo
          link Google shares with us. We never see your Google password.
        </li>
        <li>
          Whether you want reminders and offers. This is off until you turn it
          on.
        </li>
        <li>
          Your Referral Code, and who invited you if you joined through a
          friend&apos;s link.
        </li>
      </ul>
      <h3>Where we deliver</h3>
      <ul>
        <li>
          Your saved Addresses: a label (such as “Home”), street, barangay,
          city, a landmark and notes for the Rider.
        </li>
      </ul>
      <h3>Your Orders</h3>
      <ul>
        <li>
          What you ordered, the prices and taxes at the time, the delivery Slot,
          the mobile number for the Rider, the Address as it was when you
          ordered, and any notes for the Picker or Rider.
        </li>
        <li>
          What happened to it: picking, Substitutions and your answers, the
          weight we packed, the Delivery PIN, when it was delivered and any cash
          the Rider collected.
        </li>
        <li>
          Payments and refunds. If you pay with GCash or a card, you enter those
          details on PayMongo&apos;s page, not ours. PayMongo tells us the
          payment&apos;s reference, amount, method and status. We never see or
          store your card number or GCash login.
        </li>
        <li>
          Freshness Claims: the reason, how many items, your note and the photos
          you upload (up to 3). Please photograph the item and its label, not
          people.
        </li>
      </ul>
      <h3>Things you save</h3>
      <ul>
        <li>Your Cart, Shopping Lists, Stock Alerts and Vouchers.</li>
        <li>
          A Cart you start before signing in (a guest Cart), found through a
          random code in a cookie. We keep only a scrambled (hashed) copy of
          that code.
        </li>
      </ul>
      <h3>Security records</h3>
      <ul>
        <li>
          Your sign-in sessions, with the IP address and browser they came from.
        </li>
        <li>Sign-in codes and links, which stop working after 5 minutes.</li>
        <li>
          Short counters that stop too many attempts in a row, such as sign-in
          codes or new Orders. They hold an IP address, email or mobile number
          and are deleted when their time window ends, after an hour at most.
        </li>
        <li>
          A record of each email and text message we send you: which message, to
          which address or number, and when.
        </li>
      </ul>
      <h3>What we don&apos;t collect</h3>
      <p>
        We don&apos;t ask for government IDs, birthdays, health information or
        anything else the law calls sensitive personal information. We
        don&apos;t use advertising trackers. To see how people shop, we count
        steps per day (Products viewed, items added to Carts, Checkouts started,
        Orders placed). Those counts carry no name, account, cookie or other
        identifier.
      </p>

      <h2 id="use">Why we use it, and on what basis</h2>
      <ul>
        <li>
          <strong>To sell and deliver your groceries.</strong> Your account,
          Addresses, Orders, payments, Substitution questions, the Delivery PIN,
          Stock Alerts you ask for, Freshness Claims, refunds and Vouchers. We
          need these to do what you ask us to do (a contract with you).
        </li>
        <li>
          <strong>To message you about your Orders.</strong> Confirmations,
          Substitution questions, “on the way” with your Delivery PIN, refunds,
          claim decisions and missed deliveries, by email and text. These are
          part of your Order, not marketing.
        </li>
        <li>
          <strong>To send reminders and offers, only if you say yes.</strong>{" "}
          Today this is one Cart Reminder email when you leave items in your
          Cart for 3 hours. Turn it off any time in{" "}
          <Link href="/account">your account</Link> or with the link in the
          email (your consent).
        </li>
        <li>
          <strong>To keep tax and accounting records.</strong> Orders, payments,
          refunds and receipts (a legal obligation).
        </li>
        <li>
          <strong>To keep the shop safe and working.</strong> Sign-in sessions,
          attempt counters, logs of what our staff change, and fixing problems
          (our legitimate interest in a secure shop).
        </li>
      </ul>
      <p>
        We don&apos;t make decisions about you by computer alone that
        significantly affect you. Our staff review every Freshness Claim.
      </p>

      <h2 id="share">Who receives it</h2>
      <p>
        We never sell your personal data. These companies handle it for us, only
        to provide their service, under contract with us:
      </p>
      <ul>
        <li>
          <strong>PayMongo</strong>, for GCash and card payments and refunds. We
          send it the Order Number and amount; you give it your payment details
          on its own page.
        </li>
        <li>
          <strong>Resend</strong>, to send our emails: your email address and
          the message.
        </li>
        <li>
          <strong>{legal.smsProvider}</strong>, to send our text messages: your
          mobile number and the message.
        </li>
        <li>
          <strong>Vercel</strong>, which hosts the shop in Singapore.
        </li>
        <li>
          <strong>Neon</strong>, which hosts our database in Singapore.
        </li>
        <li>
          <strong>Google</strong>, only if you choose to sign in with Google.
        </li>
      </ul>
      <p>Inside {legal.tradeName}, people see only what their job needs:</p>
      <ul>
        <li>
          Pickers see your items and notes for the Picker. Riders see your name,
          Address, landmark, notes for the Rider and mobile number while they
          deliver your Order.
        </li>
        <li>
          Dispatchers and Admins see Orders and Freshness Claims to run
          deliveries and answer you. Every change staff make is logged with
          their name.
        </li>
      </ul>
      <p>We also share personal data in these cases:</p>
      <ul>
        <li>
          If a friend invited you, we tell them your first name when your first
          Order is delivered, so they know why they got a Voucher.
        </li>
        <li>
          When the law requires it, such as a valid order from a court, the BIR
          or the NPC.
        </li>
      </ul>

      <h2 id="abroad">Data stored outside the Philippines</h2>
      <p>
        Our hosting and database are in Singapore, and some of the companies
        above, such as Google and Resend, may handle data in the United States
        or other countries. We stay responsible for your data wherever it is,
        and we use companies that protect it at least as well as Philippine law
        asks.
      </p>

      <h2 id="keep">How long we keep it</h2>
      <ul>
        <li>
          <strong>Your account, Addresses and Shopping Lists:</strong> while
          your account is open. Close it and we delete them.
        </li>
        <li>
          <strong>
            Orders, payments, refunds, receipts and Freshness Claims
          </strong>{" "}
          (with their photos and the messages about them): for as long as tax
          and accounting law requires, {legal.taxRecordYears}. We keep them even
          after you close your account.
        </li>
        <li>
          <strong>Your Cart:</strong> while your account is open. A Cart that
          became an Order is deleted 30 days later; the Order keeps its own copy
          of the items.
        </li>
        <li>
          <strong>A guest Cart:</strong> deleted after 30 days without changes.
        </li>
        <li>
          <strong>A held delivery Slot:</strong> 10 minutes.
        </li>
        <li>
          <strong>Stock Alerts:</strong> end when we send the message, or after
          30 days.
        </li>
        <li>
          <strong>Sign-in codes and links:</strong> 5 minutes. A sign-in session
          lasts 7 days and renews while you use the shop.
        </li>
        <li>
          <strong>Sign-in records</strong> (IP address and browser): while your
          account is open.
        </li>
        <li>
          <strong>Attempt counters:</strong> deleted when their window ends,
          after an hour at most.
        </li>
        <li>
          <strong>Background tasks,</strong> such as a message waiting to go
          out: deleted 30 days after they finish.
        </li>
      </ul>

      <h2 id="cookies">Cookies and storage on your device</h2>
      <p>
        We use only what the shop needs to work or to remember a choice you
        made. We have no advertising or analytics cookies and no third-party
        trackers, so we don&apos;t show a cookie banner.
      </p>
      <ul>
        <li>
          <strong>Sign-in cookies</strong> (names start with{" "}
          <code>better-auth</code>, sometimes after <code>__Secure-</code>):
          keep you signed in for 7 days, renewed while you use the shop. One
          holds a signed copy of your session for 5 minutes so pages load
          faster. While you sign in with Google, another checks for 5 minutes
          that Google&apos;s answer belongs to your sign-in.
        </li>
        <li>
          <strong>
            <code>hm_cart</code>
          </strong>
          : a random code that finds your guest Cart before you sign in. Lasts
          30 days.
        </li>
        <li>
          <strong>
            <code>hoshimono_ref</code>
          </strong>
          : set only when you open a friend&apos;s invite link. It remembers
          their Referral Code until your first Checkout, for up to 30 days.
        </li>
        <li>
          <strong>
            <code>theme</code>
          </strong>{" "}
          (browser storage): remembers light or dark mode. It stays on your
          device and is never sent to us.
        </li>
        <li>
          <strong>App storage:</strong> copies of pages and pictures you have
          already opened (up to 150 of each), so they still open on a weak
          connection. Your Cart, Checkout, Orders and account are never stored
          this way.
        </li>
      </ul>
      <p>
        Your language is part of the page address (<code>/fil</code>), not a
        cookie. Google&apos;s sign-in page and PayMongo&apos;s payment page set
        their own cookies under their own policies. If you block cookies, you
        can still browse, but you can&apos;t sign in or keep a Cart.
      </p>

      <h2 id="protect">How we protect it</h2>
      <ul>
        <li>Every page is sent over an encrypted (HTTPS) connection.</li>
        <li>
          Sign-in and Cart cookies can&apos;t be read by scripts on the page.
        </li>
        <li>Card and GCash details stay with PayMongo.</li>
        <li>
          Staff open only the parts of the system their role needs, and their
          changes are logged.
        </li>
        <li>
          We limit repeated attempts at sign-in, ordering and other actions.
        </li>
      </ul>

      <h2 id="rights">Your rights</h2>
      <p>Under the Data Privacy Act, you can:</p>
      <ul>
        <li>be told how we use your personal data (this policy);</li>
        <li>get a copy of the personal data we hold about you;</li>
        <li>have wrong or incomplete data corrected;</li>
        <li>
          have your data deleted or blocked, unless the law requires us to keep
          it;
        </li>
        <li>
          object to how we use it, and withdraw consent you gave, such as for
          reminders and offers;
        </li>
        <li>receive your data in a common electronic format;</li>
        <li>claim damages if your rights are violated; and</li>
        <li>
          complain to the National Privacy Commission at{" "}
          <a href="https://privacy.gov.ph">privacy.gov.ph</a>.
        </li>
      </ul>
      <p>
        You can change your name, Addresses and reminder setting yourself in{" "}
        <Link href="/account">your account</Link>. For anything else, write to
        our Data Protection Officer below. We&apos;ll check it&apos;s really you
        before we act.
      </p>

      <h2 id="breach">If something goes wrong</h2>
      <p>
        If a breach of our systems is likely to put you at real risk, we will
        tell you and the National Privacy Commission within 72 hours of finding
        out. We&apos;ll say what happened, what data was involved, what
        we&apos;re doing about it and what you can do to protect yourself.
      </p>

      <h2 id="children">Children</h2>
      <p>
        You need to be 18 or older to have an account and order. We don&apos;t
        knowingly collect data from children.
      </p>

      <h2 id="changes">Changes to this policy</h2>
      <p>
        When we change this policy, we update the date at the top. If a change
        affects how we use data you already gave us, we&apos;ll email you before
        it applies.
      </p>

      <h2 id="contact">Contact our Data Protection Officer</h2>
      <dl>
        <dt>Name</dt>
        <dd>{legal.dpoName}</dd>
        <dt>Email</dt>
        <dd>
          <Email to={legal.dpoEmail} />
        </dd>
        <dt>Address</dt>
        <dd>
          {legal.businessName}, {legal.address}
        </dd>
      </dl>
      <p>
        See also our <Link href="/terms">Terms of Use and Sale</Link> and{" "}
        <Link href="/business-info">Tax and Business Information</Link>.
      </p>
    </LegalPage>
  );
}
