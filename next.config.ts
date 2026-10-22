import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Photo uploads (Product 10 MB; up to 3 claim photos of 8 MB, ADR 0016)
  // and CSV imports (5 MB) go through Server Actions, which refuse bodies
  // over 1 MB by default. Every action checks who is signed in first.
  experimental: { serverActions: { bodySizeLimit: "26mb" } },
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
