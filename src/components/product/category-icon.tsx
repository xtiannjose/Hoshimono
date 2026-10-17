import {
  AvocadoIcon,
  BasketIcon,
  BreadIcon,
  BroomIcon,
  CarrotIcon,
  CoffeeIcon,
  CookieIcon,
  CowIcon,
  DropIcon,
  EggIcon,
  FishSimpleIcon,
  GrainsIcon,
  OrangeSliceIcon,
  PackageIcon,
  SnowflakeIcon,
} from "@phosphor-icons/react/ssr";
import type { IconProps } from "@phosphor-icons/react";
import type { ComponentType } from "react";

// Placeholder art until Product photography exists (mockup-v2 README).
const ICONS: Record<string, ComponentType<IconProps>> = {
  "fruit-and-vegetables": OrangeSliceIcon,
  fruit: OrangeSliceIcon,
  vegetables: CarrotIcon,
  "herbs-and-aromatics": AvocadoIcon,
  "meat-and-fish": CowIcon,
  pork: CowIcon,
  chicken: CowIcon,
  beef: CowIcon,
  "fish-and-seafood": FishSimpleIcon,
  "dairy-and-eggs": EggIcon,
  milk: DropIcon,
  eggs: EggIcon,
  bakery: BreadIcon,
  bread: BreadIcon,
  frozen: SnowflakeIcon,
  "ice-cream": SnowflakeIcon,
  pantry: GrainsIcon,
  rice: GrainsIcon,
  drinks: CoffeeIcon,
  "coffee-and-tea": CoffeeIcon,
  snacks: CookieIcon,
  household: BroomIcon,
  "paper-goods": PackageIcon,
};

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
