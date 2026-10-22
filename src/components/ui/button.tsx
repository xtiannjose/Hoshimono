import type { ComponentProps } from "react";

import {
  buttonVariants,
  type ButtonSize,
  type ButtonVariant,
} from "./button-classes";

/** Pill buttons, 48px by default; ink primary that flips to lime in dark mode. */
function Button({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      data-slot="button"
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}

export { Button, buttonVariants };
