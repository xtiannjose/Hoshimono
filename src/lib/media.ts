import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where uploaded files live. The app stores the returned URL and serves it
 * through next/image. Provider-agnostic like payments (docs/03 section 1).
 */
/**
 * Pixels an uploaded photo may have: a 48-megapixel phone photo fits, a
 * small file that unpacks into gigabytes of pixels does not.
 */
export const MAX_IMAGE_PIXELS = 50_000_000;

export interface MediaStore {
  /** Saves bytes under `key` and returns the public URL. */
  put(key: string, bytes: Buffer, contentType: string): Promise<string>;
  remove(url: string): Promise<void>;
}

/**
 * shortcut: local disk under public/media, which works in development
 * only (Vercel's filesystem is read-only). Add an R2 store behind this
 * interface when the Cloudflare account exists (docs/07 section 4).
 */
function localMediaStore(): MediaStore {
  const dir =
    process.env.MEDIA_LOCAL_DIR ??
    path.join(/* turbopackIgnore: true */ process.cwd(), "public", "media");
  const base = (process.env.MEDIA_PUBLIC_URL || "/media").replace(/\/$/, "");
  const safe = (key: string) => {
    const full = path.resolve(/* turbopackIgnore: true */ dir, key);
    if (
      !full.startsWith(path.resolve(/* turbopackIgnore: true */ dir) + path.sep)
    ) {
      throw new Error("Media key escapes the media folder");
    }
    return full;
  };
  return {
    async put(key, bytes) {
      const file = safe(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
      return `${base}/${key}`;
    },
    async remove(url) {
      if (!url.startsWith(`${base}/`)) return;
      await rm(safe(url.slice(base.length + 1)), { force: true });
    },
  };
}

export function mediaStore(): MediaStore {
  return localMediaStore();
}
