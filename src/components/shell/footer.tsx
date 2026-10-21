import { BrandLogo } from "@/components/shell/brand-logo";
import { brand } from "@/config/brand";

export function Footer() {
  return (
    <footer className="bg-surface-2 mt-24 print:hidden">
      <div className="wrap flex flex-col gap-3 py-10">
        <BrandLogo className="text-[22px]" />
        <p className="type-small text-muted-foreground max-w-[44ch]">
          {brand.description}
        </p>
      </div>
    </footer>
  );
}
