import { en, type Messages } from "./en";
import { fil } from "./fil";
import type { Lang } from "./lang";

export type { Messages };

export const MESSAGES: Record<Lang, Messages> = { en, fil };

/** What a Cart action can answer besides the Cart; the shop words it. */
export type CartNotice = keyof Messages["cart"]["notices"];
