"use client";

import Image from "next/image";
import { useActionState } from "react";

import { formKey } from "@/components/form-key";
import { Button } from "@/components/ui/button";

import { FormMessage } from "../form-message";
import { uploadContentPhoto, type ContentFormState } from "./actions";

const initial: ContentFormState = { errors: {} };

/** The one photo of a Recipe or Article: shown, and replaced here. */
export function PhotoForm({
  kind,
  id,
  photo,
}: {
  kind: "recipe" | "article";
  id: string;
  photo: { url: string; alt: string } | null;
}) {
  const [state, action, pending] = useActionState(
    uploadContentPhoto.bind(null, kind, id),
    initial
  );
  return (
    <section
      aria-labelledby="photo-h"
      className="rounded-card border-border bg-card grid gap-3 border p-4"
    >
      <h2 id="photo-h" className="type-h3">
        Photo
      </h2>
      {photo ? (
        <div className="rounded-field photo-slot relative aspect-[4/3] max-w-sm overflow-hidden">
          <Image
            src={photo.url}
            alt={photo.alt}
            fill
            sizes="384px"
            className="object-cover"
          />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No photo yet. The page shows an icon until there is one.
        </p>
      )}
      <form key={formKey(state)} action={action} className="grid gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="photo" className="text-sm font-semibold">
            {photo ? "Replace the photo" : "Add a photo"}
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="photo-help"
            className="text-sm"
          />
          <p id="photo-help" className="text-muted-foreground text-fine">
            At least 1000 pixels wide; landscape works best. Pages crop it to
            fit. JPEG, PNG or WebP under 10 MB.
          </p>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="alt" className="text-sm font-semibold">
            Describe the photo
          </label>
          <input
            id="alt"
            name="alt"
            defaultValue={photo?.alt}
            placeholder="Chicken adobo in a clay pot, with rice"
            className="rounded-field border-input bg-card h-11 border px-3 text-base"
          />
        </div>
        <FormMessage state={state} />
        <div>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Uploading..." : "Save photo"}
          </Button>
        </div>
      </form>
    </section>
  );
}
