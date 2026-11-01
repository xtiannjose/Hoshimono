"use client";

import { Button } from "@/components/ui/button";

import { deleteContent } from "./actions";

/** Deletes a Recipe or Article after a confirm; there is no undo. */
export function DeleteButton({
  kind,
  id,
  title,
}: {
  kind: "recipe" | "article";
  id: string;
  title: string;
}) {
  return (
    <form
      action={deleteContent.bind(null, kind, id)}
      onSubmit={(e) => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`))
          e.preventDefault();
      }}
    >
      <Button type="submit" variant="danger">
        Delete {kind === "recipe" ? "Recipe" : "Article"}
      </Button>
    </form>
  );
}
