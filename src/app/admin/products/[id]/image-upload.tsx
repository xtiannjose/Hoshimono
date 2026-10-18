"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { uploadImage, type FormState } from "../../actions";

const initial: FormState = { errors: {} };

export function ImageUpload({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(
    uploadImage.bind(null, productId),
    initial
  );
  return (
    <form
      action={action}
      className="rounded-card border-border bg-card grid max-w-xl gap-3 border p-4"
    >
      <div className="grid gap-1.5">
        <label htmlFor="image" className="text-sm font-semibold">
          Add a photo
        </label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="image-help"
          className="text-sm"
        />
        <p id="image-help" className="text-muted-foreground text-[13px]">
          Square, at least 1000 x 1000 pixels, neutral background. JPEG, PNG or
          WebP under 10 MB.
        </p>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="alt" className="text-sm font-semibold">
          Describe the photo (optional)
        </label>
        <input
          id="alt"
          name="alt"
          className="rounded-field border-input bg-card h-11 border px-3 text-base"
        />
      </div>
      {state.errors.image && (
        <p role="alert" className="text-err text-sm">
          {state.errors.image}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm font-semibold">
          Photo added.
        </p>
      )}
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Uploading..." : "Upload photo"}
        </Button>
      </div>
    </form>
  );
}
