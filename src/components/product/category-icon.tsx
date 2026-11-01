import {
  BasketIcon,
  BreadIcon,
  BroomIcon,
  CarrotIcon,
  CheeseIcon,
  CookieIcon,
  FishSimpleIcon,
  JarIcon,
  PintGlassIcon,
  SnowflakeIcon,
} from "@phosphor-icons/react/ssr";
import type { IconProps } from "@phosphor-icons/react";
import type { ComponentType } from "react";

// Placeholder art until Product photography exists, one per top-level
// Category, so a cheese never gets a basket (ADR 0018).
const ICONS: Record<string, ComponentType<IconProps>> = {
  "fruit-and-vegetables": CarrotIcon,
  "meat-and-fish": FishSimpleIcon,
  "dairy-and-eggs": CheeseIcon,
  bakery: BreadIcon,
  frozen: SnowflakeIcon,
  pantry: JarIcon,
  drinks: PintGlassIcon,
  snacks: CookieIcon,
  household: BroomIcon,
};

/** The icon for a top-level Category slug. */
export function CategoryIcon({
  slug,
  size = 40,
  className,
}: {
  slug: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[slug] ?? BasketIcon;
  return <Icon size={size} className={className} aria-hidden />;
}
