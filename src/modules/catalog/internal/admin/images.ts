import { randomUUID } from "node:crypto";

import sharp, { type Metadata } from "sharp";

import { db, inTransaction, type Client } from "@/lib/db";
import { MAX_IMAGE_PIXELS, mediaStore } from "@/lib/media";

import { fieldError, type WriteResult } from "./products";

const MIN_SIDE = 1000; // docs/03-ARCHITECTURE.md section 13
const MASTER = 1200;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 6; // one primary plus up to five more
const FORMATS = new Set(["jpeg", "png", "webp", "avif"]);

const error = (message: string) => fieldError("image", message);

/**
 * Checks an upload and stores one square 1200 px WebP master. A photo that
 * is not square is padded with white, never cropped, so a tall bottle keeps
 * its cap and label (docs/03 section 13). next/image then serves AVIF or
 * WebP at the sizes each page asks for.
 */
export async function addProductImage(
  productId: string,
  file: { bytes: Buffer; alt: string }
): Promise<WriteResult<{ id: string }>> {
  if (file.bytes.length > MAX_BYTES) return error("Use an image under 10 MB");
  let meta: Metadata;
  try {
    meta = await sharp(file.bytes).metadata();
  } catch {
    return error(
      "This file is not an image we can read. Use JPEG, PNG or WebP."
    );
  }
  if (!meta.format || !FORMATS.has(meta.format))
    return error("Use a JPEG, PNG or WebP image");
  if ((meta.width ?? 0) < MIN_SIDE || (meta.height ?? 0) < MIN_SIDE) {
    return error(`Use an image at least ${MIN_SIDE} x ${MIN_SIDE} pixels`);
  }
  if ((meta.width ?? 0) * (meta.height ?? 0) > MAX_IMAGE_PIXELS)
    return error("This image is too large. Use one under 50 megapixels");
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { name: true, _count: { select: { images: true } } },
  });
  if (!product) return error("No such Product");
  if (product._count.images >= MAX_IMAGES)
    return error(`A Product can have at most ${MAX_IMAGES} images`);

  const master = await sharp(file.bytes, { limitInputPixels: MAX_IMAGE_PIXELS })
    .rotate() // respect camera orientation
    .resize(MASTER, MASTER, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .webp({ quality: 82 })
    .toBuffer();
  const url = await mediaStore().put(
    `products/${productId}/${randomUUID()}.webp`,
    master,
    "image/webp"
  );
  const image = await db.productImage.create({
    data: {
      productId,
      url,
      alt: file.alt.trim().slice(0, 200) || product.name,
      sortOrder: product._count.images,
      isPrimary: product._count.images === 0,
    },
  });
  return { ok: true, id: image.id };
}

export async function setPrimaryImage(
  imageId: string,
  client: Client = db
): Promise<WriteResult> {
  return inTransaction(client, async (tx) => {
    const image = await tx.productImage.findUnique({ where: { id: imageId } });
    if (!image) return error("No such image");
    await tx.productImage.updateMany({
      where: { productId: image.productId },
      data: { isPrimary: false },
    });
    await tx.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });
    return { ok: true };
  });
}

/** Removes an image; if it was primary, the next one becomes primary. */
export async function removeProductImage(
  imageId: string
): Promise<
  WriteResult<{ removed: { url: string; alt: string; isPrimary: boolean } }>
> {
  const image = await db.productImage.findUnique({ where: { id: imageId } });
  if (!image) return error("No such image");
  await db.productImage.delete({ where: { id: imageId } });
  if (image.isPrimary) {
    const next = await db.productImage.findFirst({
      where: { productId: image.productId },
      orderBy: { sortOrder: "asc" },
    });
    if (next)
      await db.productImage.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
  }
  await mediaStore().remove(image.url);
  return {
    ok: true,
    removed: { url: image.url, alt: image.alt, isPrimary: image.isPrimary },
  };
}
