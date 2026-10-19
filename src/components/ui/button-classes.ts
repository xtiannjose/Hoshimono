// The Button look as plain class strings, for client components on every
// storefront page: importing <Button> there ships Radix Slot, cva and the
// cn merge tables to every visitor, which Lighthouse counts against us.
export const PRIMARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-primary px-[22px] text-base font-semibold whitespace-nowrap text-primary-foreground transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100";

export const ICON_BUTTON =
  "inline-flex size-11 items-center justify-center rounded-pill text-foreground transition-colors hover:bg-muted active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:active:scale-100";
