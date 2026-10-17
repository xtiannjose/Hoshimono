import { DeliveryButton } from "@/components/shell/delivery-button";
import { BrandLogo } from "@/components/shell/brand-logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { z } from "@/config/z";

export function Header() {
  return (
    <header
      style={{ zIndex: z.header }}
      className="border-border bg-bg/90 sticky top-0 border-b backdrop-blur-md backdrop-saturate-150 motion-reduce:backdrop-blur-none"
    >
      <div className="wrap flex h-[72px] items-center gap-4">
        <BrandLogo />
        <div className="ml-auto flex items-center gap-2">
          <DeliveryButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
