// Single place for the brand, so renaming stays a five-minute job.
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Hoshimono",
  wordmark: "hoshimono",
  mark: "h",
  description: "Online supermarket for Metro Manila.",
} as const;
