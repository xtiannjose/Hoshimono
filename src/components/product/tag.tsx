import type { ReactNode } from "react";

const TONES = {
  sale: "bg-sale-soft text-sale",
  warn: "bg-warn-soft text-warn",
  soft: "bg-accent-soft text-foreground",
  quiet: "bg-muted text-muted-foreground",
} as const;

export function Tag({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={`rounded-pill inline-flex h-6 items-center gap-1 px-[9px] text-xs leading-4 font-bold whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
