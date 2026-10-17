import { MapPinIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";

// Placeholder until Batch 2.3 adds the address and Zone picker.
export function DeliveryButton() {
  return (
    <Button
      variant="ghost"
      className="h-12 gap-2.5 px-3 max-sm:px-2.5"
      disabled
    >
      <MapPinIcon size={22} aria-hidden />
      <span className="text-left leading-[18px] max-sm:sr-only">
        <small className="text-muted-foreground block text-xs leading-4">
          Deliver to
        </small>
        <b className="text-sm font-bold">Choose your area</b>
      </span>
    </Button>
  );
}
