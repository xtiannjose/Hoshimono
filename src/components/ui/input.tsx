import * as React from "react";
import { cn } from "cn";

// 48px field, 14px radius, 16px text so iOS never zooms on focus.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "rounded-field border-input bg-card text-foreground placeholder:text-muted-foreground focus-visible:outline-ring aria-invalid:border-destructive h-12 w-full min-w-0 border px-4 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
