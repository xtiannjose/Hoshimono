"use client";

import type { ReactNode } from "react";

import { signOutAction } from "@/app/[lang]/account/actions";

/**
 * Signs out and forgets the shop pages this phone kept for offline use
 * (public/sw.js): Home and Product pages can show "Buy again" and the
 * names of Shopping Lists.
 */
export function SignOutForm({ children }: { children: ReactNode }) {
  return (
    <form
      action={signOutAction}
      onSubmit={() => {
        if (!("caches" in window)) return;
        void caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith("pages-"))
                .map((key) => caches.delete(key))
            )
          );
      }}
    >
      {children}
    </form>
  );
}
