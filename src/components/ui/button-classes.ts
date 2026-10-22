// The one button look (ADR 0018), as plain class strings: the Button
// component, links styled as buttons and client components all use these,
// so no class-merging library ships to the browser. Callers add layout
// classes (width, margins), never colours or sizes that fight these.

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-pill border border-transparent font-semibold whitespace-nowrap transition-[background-color,border-color,transform] duration-150 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5";

const VARIANT = {
  default: "bg-primary text-primary-foreground hover:bg-btn-hover",
  secondary:
    "border-input bg-card text-foreground hover:bg-muted aria-expanded:bg-muted",
  ghost: "text-foreground hover:bg-muted aria-expanded:bg-muted",
  danger: "text-err hover:bg-muted",
  destructive: "bg-destructive text-bg hover:bg-destructive/90",
  link: "text-foreground underline decoration-border-strong decoration-[1.5px] underline-offset-4 hover:decoration-current",
} as const;

const SIZE = {
  default: "min-h-12 px-[22px] text-base",
  sm: "min-h-10 px-4 text-sm",
  lg: "min-h-14 px-7 text-[17px]",
  icon: "size-11 p-0 text-base",
} as const;

export type ButtonVariant = keyof typeof VARIANT;
export type ButtonSize = keyof typeof SIZE;

export function buttonVariants({
  variant = "default",
  size = "default",
  className = "",
}: {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  className?: string;
} = {}): string {
  return `${BASE} ${VARIANT[variant ?? "default"]} ${SIZE[size ?? "default"]} ${className}`.trim();
}

export const PRIMARY_BUTTON = buttonVariants();

export const ICON_BUTTON = buttonVariants({ variant: "ghost", size: "icon" });

/** The Product card's Add pill (docs/05 ProductCard). */
export const ADD_BUTTON =
  "rounded-pill bg-accent-soft text-foreground hover:bg-accent hover:text-on-accent inline-flex h-11 w-full items-center justify-center gap-1.5 text-label font-bold transition-[background-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:active:scale-100";
