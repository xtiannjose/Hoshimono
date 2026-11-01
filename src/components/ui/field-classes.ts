// The one field look (ADR 0018): 44 px tall, 16 px text so iOS never zooms
// on focus, the error border from aria-invalid. Plain strings, like the
// buttons, so they cost nothing in the browser.

const LOOK =
  "rounded-field border-input bg-card text-foreground placeholder:text-muted-foreground aria-invalid:border-err min-w-0 border px-3 text-base font-normal disabled:opacity-50";

/** A text input or select filling its column. */
export const FIELD = `${LOOK} h-11 w-full`;

/** The same, sized by its content or a width class (filter rows, amounts). */
export const INLINE_FIELD = `${LOOK} h-11`;

/** A text area filling its column, growing with the text where supported. */
export const TEXTAREA = `${LOOK} field-sizing-content min-h-24 w-full py-2`;

export const LABEL = "text-sm font-semibold";

/**
 * A choice card around a radio (address, Slot, payment, Substitution): the
 * chosen one gets an ink edge drawn inside, so nothing moves when it is
 * picked. Add layout and padding classes.
 */
export const RADIO_CARD =
  "rounded-field border-border-strong bg-card has-[:checked]:border-ink has-[:checked]:shadow-[inset_0_0_0_1px_var(--ink)] has-[:focus-visible]:outline-ring flex cursor-pointer border has-[:focus-visible]:outline-2";
