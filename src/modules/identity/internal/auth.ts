import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";

import { db } from "@/lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  user: { modelName: "authUser" },
  session: { modelName: "authSession" },
  account: { modelName: "authAccount" },
  verification: { modelName: "authVerification" },
  plugins: [
    magicLink({
      async sendMagicLink({ email, url }) {
        // shortcut: no email provider yet, links go to the dev server log.
        // Batch 2.5 sends them with Resend. Never log a live link in production.
        if (process.env.NODE_ENV === "production") {
          throw new Error("Email delivery is not configured");
        }
        console.info(`[dev] Sign-in link for ${email}: ${url}`);
      },
    }),
    nextCookies(), // keep last: lets Server Actions set auth cookies
  ],
});
