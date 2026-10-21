"use client";

import { ShareNetworkIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { announce } from "@/components/live-region";
import { Button } from "@/components/ui/button";

/** The Referral link, shared with the phone's share sheet or copied. */
export function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const text = "Get your groceries delivered by Hoshimono. Use my link:";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Hoshimono", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      announce("Link copied");
    } catch {
      // Closing the share sheet is not an error worth showing.
    }
  }
  return (
    <div className="grid gap-2">
      <label htmlFor="invite-link" className="text-sm font-semibold">
        Your link
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="invite-link"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="rounded-field border-input bg-card min-h-11 min-w-0 flex-1 border px-3 font-mono text-sm"
        />
        <Button type="button" onClick={share}>
          <ShareNetworkIcon aria-hidden />
          {copied ? "Copied" : "Share"}
        </Button>
      </div>
    </div>
  );
}
