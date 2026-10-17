import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

// Pill buttons, 48px default height, ink primary that flips to lime in dark mode.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-pill border border-transparent text-base font-semibold whitespace-nowrap transition-[background-color,border-color,transform] duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-btn-hover",
        secondary:
          "border-input bg-card text-foreground hover:bg-muted aria-expanded:bg-muted",
        outline:
          "border-input bg-card text-foreground hover:bg-muted aria-expanded:bg-muted",
        ghost: "text-foreground hover:bg-muted aria-expanded:bg-muted",
        destructive: "bg-destructive text-bg hover:bg-destructive/90",
        link: "text-foreground underline decoration-border-strong decoration-[1.5px] underline-offset-4 hover:decoration-current",
      },
      size: {
        default: "min-h-12 px-[22px]",
        sm: "min-h-10 px-4 text-sm",
        lg: "min-h-14 px-7 text-[17px]",
        icon: "size-11 p-0",
        "icon-sm": "size-10 p-0",
        "icon-lg": "size-12 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
