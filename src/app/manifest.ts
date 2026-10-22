import type { MetadataRoute } from "next";

import { brand } from "@/config/brand";
import { en } from "@/i18n/en";

// The installable app (ADR 0017). Light theme values from docs/05 section 3.
const BG = "#F6F8EE";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: en.shell.about,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BG,
    theme_color: BG,
    icons: [192, 512].flatMap((px) =>
      (["any", "maskable"] as const).map((purpose) => ({
        src: `/icon/${px}`,
        sizes: `${px}x${px}`,
        type: "image/png",
        purpose,
      }))
    ),
  };
}
