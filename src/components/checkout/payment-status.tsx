"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

// Every 3 seconds for 2 minutes; after that the page's buttons take over.
const EVERY_MS = 3000;
const TRIES = 40;

/** Re-reads the page while an Order waits for its payment to be confirmed. */
export function PaymentWatch() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (tries > TRIES) clearInterval(timer);
      else router.refresh();
    }, EVERY_MS);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}

/** A submit button that says what it is doing while its form is sent. */
export function PendingButton({
  pendingLabel,
  children,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
