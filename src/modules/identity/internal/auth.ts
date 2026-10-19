import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { phoneNumber } from "better-auth/plugins/phone-number";

import { db } from "@/lib/db";
import { consoleMessagesAllowed } from "@/lib/test-mode";
import { sendSignInCode } from "@/modules/notifications";

import { rememberLink } from "./dev-mailbox";

/** Google sign-in shows only once its OAuth keys are set (owner track). */
export function googleEnabled(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** A text-message sign-in code works for this long. */
const SIGN_IN_CODE_MINUTES = 5;

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  user: { modelName: "authUser" },
  session: {
    modelName: "authSession",
    // A signed copy of the session in a cookie: the header, the page and
    // its actions read it without a database lookup. A sign-out elsewhere
    // takes effect within 5 minutes.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  account: { modelName: "authAccount" },
  verification: { modelName: "authVerification" },
  // Sign-in links, codes and Google start only from our Server Actions,
  // which apply rate limits (src/app/sign-in/actions.ts). Better Auth's own
  // limiter covers HTTP calls only, so these HTTP routes stay closed.
  disabledPaths: [
    "/sign-in/magic-link",
    "/phone-number/send-otp",
    "/phone-number/verify",
    "/sign-in/phone-number",
    "/sign-in/social",
    // No passwords at Hoshimono.
    "/phone-number/request-password-reset",
    "/phone-number/reset-password",
  ],
  socialProviders: googleEnabled()
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  plugins: [
    magicLink({
      // Better Auth allows 5 link checks a minute per IP by default. Many
      // Filipino mobile users share one carrier IP, and a link is a
      // single-use 32-character token, so a looser limit is safe. Sending
      // links is limited by our own Server Action (ADR 0006).
      rateLimit: { window: 60, max: 60 },
      async sendMagicLink({ email, url }) {
        // shortcut: no email provider yet, links go to the dev server log
        // until Resend is set up. Never log a live link in production.
        if (!consoleMessagesAllowed()) {
          throw new Error("Email delivery is not configured");
        }
        console.info(`[dev] Sign-in link for ${email}: ${url}`);
        rememberLink(email, url);
      },
    }),
    phoneNumber({
      otpLength: 6,
      expiresIn: SIGN_IN_CODE_MINUTES * 60,
      allowedAttempts: 3,
      // Callers pass +639XXXXXXXXX (normalizePhone).
      phoneNumberValidator: (phone) => /^\+639\d{9}$/.test(phone),
      async sendOTP({ phoneNumber: phone, code }) {
        await sendSignInCode(phone, code, SIGN_IN_CODE_MINUTES);
      },
      // First sign-in by mobile creates the account; the email is a
      // stand-in that is never shown or used for mail.
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.slice(1)}@phone.hoshimono.invalid`,
        getTempName: () => "Hoshimono shopper",
      },
    }),
    nextCookies(), // keep last: lets Server Actions set auth cookies
  ],
});
