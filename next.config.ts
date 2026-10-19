import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Photo uploads (10 MB) and CSV imports (5 MB) go through Server Actions,
  // which refuse bodies over 1 MB by default.
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  // Product photos are stored as one WebP master; serve AVIF where supported.
  images: { formats: ["image/avif", "image/webp"] },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
