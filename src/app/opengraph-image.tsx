import { ImageResponse } from "next/og";

import { brand } from "@/config/brand";

export const alt = `${brand.name}: fresh groceries delivered the same day in Metro Manila`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Light theme values from docs/05-DESIGN-SYSTEM.md section 3 (CSS variables
// are not available inside an image response).
const BG = "#F6F8EE";
const INK = "#10261A";
const LIME = "#C9E84E";
const MUTED = "#4B5A4C";

/** The default share card for every page without its own image. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: BG,
        color: INK,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          fontSize: 56,
          fontWeight: 700,
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 999,
            background: LIME,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 60,
          }}
        >
          {brand.mark}
        </div>
        {brand.wordmark}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            fontSize: 84,
            fontWeight: 600,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          Fresh groceries, delivered today.
        </div>
        <div style={{ fontSize: 34, color: MUTED }}>
          Same-day delivery across Metro Manila. GCash, card or cash on
          delivery.
        </div>
      </div>
    </div>,
    size
  );
}
