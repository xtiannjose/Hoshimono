import { randomUUID } from "node:crypto";

import sharp from "sharp";

import { MAX_IMAGE_PIXELS, mediaStore } from "@/lib/media";

// Claim photos (ADR 0016): checked, then kept as WebP no larger than
// 1600 pixels a side, through the same media store as Product photos.

export const MAX_PHOTOS = 3;
const MAX_BYTES = 8 * 1024 * 1024;
const FORMATS = new Set(["jpeg", "png", "webp"]);

export type PhotoProblem = "too_many_photos" | "photo_too_big" | "photo_type";

/** What is wrong with these photos, or null when they are fine. */
export async function checkPhotos(
  photos: Buffer[]
): Promise<PhotoProblem | null> {
  if (photos.length > MAX_PHOTOS) return "too_many_photos";
  for (const bytes of photos) {
    if (bytes.length > MAX_BYTES) return "photo_too_big";
    try {
      const meta = await sharp(bytes).metadata();
      if (!meta.format || !FORMATS.has(meta.format)) return "photo_type";
      if ((meta.width ?? 0) * (meta.height ?? 0) > MAX_IMAGE_PIXELS)
        return "photo_too_big";
    } catch {
      return "photo_type";
    }
  }
  return null;
}

export async function storePhotos(
  claimId: string,
  photos: Buffer[]
): Promise<string[]> {
  return Promise.all(
    photos.map(async (bytes) => {
      const webp = await sharp(bytes, { limitInputPixels: MAX_IMAGE_PIXELS })
        .rotate() // respect camera orientation
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      return mediaStore().put(
        `claims/${claimId}/${randomUUID()}.webp`,
        webp,
        "image/webp"
      );
    })
  );
}
