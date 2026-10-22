import type { ComponentProps } from "react";

import { LABEL } from "./field-classes";

function Label({ className = "", ...props }: ComponentProps<"label">) {
  return <label className={`${LABEL} ${className}`.trim()} {...props} />;
}

export { Label };
