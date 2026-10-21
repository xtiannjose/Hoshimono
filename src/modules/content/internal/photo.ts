import { randomUUID } from "node:crypto";

import sharp, { type Metadata } from "sharp";

import { db } from "@/lib/db";
import { mediaStore } from "@/lib/media";
import { isUuid } from "@/lib/uuid";

const MIN_WIDTH = 1000;
const MASTER_WIDTH = 1600;
const MAX_BYTES = 10 * 1024 * 1024;
const FORMATS = new Set(["jpeg", "png", "webp", "avif"]);

type PhotoResult =
  { ok: true; url: string } | { ok: false; errors: { photo: string } };
const refuse = (photo: string): PhotoResult => ({
  ok: false,
  errors: { photo },
});

/**
 * One photo per Recipe or Article (ADR 0013): checked, then stored as a
 * 1600-pixel-wide WebP, never cropped (pages crop it to fit). Replaces the
 * old one and deletes its file.
 */
export async function setContentPhoto(
  kind: "recipe" | "article",
  id: string,
  file: { bytes: Buffer; alt: string }
): Promise<PhotoResult> {
  const alt = file.alt.trim();
  if (!alt) return refuse("Describe the photo for people who cannot see it.");
  if (file.bytes.length > MAX_BYTES) return refuse("Use an image under 10 MB.");
  let meta: Metadata;
  try {
    meta = await sharp(file.bytes).metadata();
  } catch {
    return refuse(
      "This file is not an image we can read. Use JPEG, PNG or WebP."
    );
  }
  if (!meta.format || !FORMATS.has(meta.format))
    return refuse("Use a JPEG, PNG or WebP image.");
  if ((meta.width ?? 0) < MIN_WIDTH)
    return refuse(`Use an image at least ${MIN_WIDTH} pixels wide.`);

  const table = kind === "recipe" ? db.recipe : db.article;
  const before = isUuid(id)
    ? await (table as typeof db.recipe).findUnique({
        where: { id },
        select: { photoUrl: true },
      })
    : null;
  if (!before)
    return refuse(
      `That ${kind === "recipe" ? "Recipe" : "Article"} no longer exists.`
    );

  const master = await sharp(file.bytes)
    .rotate() // respect camera orientation
    .resize({ width: MASTER_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const url = await mediaStore().put(
    `${kind}s/${id}/${randomUUID()}.webp`,
    master,
    "image/webp"
  );
  await (table as typeof db.recipe).update({
    where: { id },
    data: { photoUrl: url, photoAlt: alt },
  });
  if (before.photoUrl) await mediaStore().remove(before.photoUrl);
  return { ok: true, url };
}
