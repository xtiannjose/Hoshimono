"use client";

const ID = "live-region";

/** One polite live region for the page; quantity and Cart changes speak here. */
export function LiveRegion() {
  return <div id={ID} aria-live="polite" className="sr-only" />;
}

export function announce(message: string) {
  const region = document.getElementById(ID);
  if (!region) return;
  // Clearing first makes screen readers repeat an identical message.
  region.textContent = "";
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}
