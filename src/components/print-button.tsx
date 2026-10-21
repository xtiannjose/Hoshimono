"use client";

import { Button } from "@/components/ui/button";

/** Opens the browser's print dialog; hidden on the printout itself. */
export function PrintButton({ children = "Print" }: { children?: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="print:hidden"
      onClick={() => window.print()}
    >
      {children}
    </Button>
  );
}
