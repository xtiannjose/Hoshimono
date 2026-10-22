import type { ComponentProps } from "react";

import { FIELD } from "./field-classes";

/** The one field (ADR 0018); callers add layout classes only. */
function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${FIELD} ${className}`.trim()} {...props} />;
}

export { Input };
