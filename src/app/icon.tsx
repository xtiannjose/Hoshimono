import { ImageResponse } from "next/og";

import { brand } from "@/config/brand";

// Tab and home screen icons (ADR 0017): the "h" mark on lime, edge to edge,
// so a launcher's round or squircle mask keeps it whole (maskable). Light
// theme values from docs/05 section 3; CSS variables do not reach an image.
const INK = "#10261A";
const LIME = "#C9E84E";

export function generateImageMetadata() {
  return [192, 512].map((px) => ({
    id: String(px),
    size: { width: px, height: px },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const px = Number(await id);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: px * 0.06,
        background: LIME,
        color: INK,
        fontSize: px * 0.62,
        fontWeight: 700,
      }}
    >
      {brand.mark}
    </div>,
    { width: px, height: px }
  );
}
