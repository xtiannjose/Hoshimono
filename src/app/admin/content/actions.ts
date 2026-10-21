"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { CONTENT_TAG } from "@/app/_data/storefront";
import {
  deleteArticle,
  deleteRecipe,
  saveArticle,
  saveRecipe,
  setContentPhoto,
} from "@/modules/content";
import { recordAudits, requireStaff } from "@/modules/identity";

import { adminWrite } from "../admin-write";

// Recipes and Articles (ADR 0013). Every action re-checks the role, records
// an audit row and refreshes the shop at once.

export type ContentFormState = {
  errors: Record<string, string>;
  saved?: boolean;
};

const editor = (next: string) => requireStaff("content", next);

const recipeShape = z.object({
  title: z.string().max(500),
  intro: z.string().max(5000),
  servings: z.number(),
  prepMinutes: z.number(),
  cookMinutes: z.number(),
  status: z.enum(["draft", "published"]),
  featured: z.boolean(),
  steps: z.array(z.string().max(5000)).max(60),
  ingredients: z
    .array(
      z.object({
        productId: z.string().nullable(),
        label: z.string().max(500),
        note: z.string().max(500),
        quantity: z.number(),
        scales: z.boolean(),
        optional: z.boolean(),
      })
    )
    .max(60),
});

const articleShape = z.object({
  title: z.string().max(500),
  intro: z.string().max(5000),
  status: z.enum(["draft", "published"]),
  sections: z
    .array(z.object({ heading: z.string().max(500), text: z.string() }))
    .max(40),
  productIds: z.array(z.string()).max(60),
});

/** The editor sends its whole draft as JSON in one field. */
function draft<T>(fd: FormData, shape: z.ZodType<T>): T | null {
  try {
    const parsed = shape.safeParse(JSON.parse(String(fd.get("draft") ?? "")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const UNREADABLE = {
  errors: { form: "That did not save. Reload the page and try again." },
};

export async function saveRecipeAction(
  id: string | null,
  _prev: ContentFormState,
  fd: FormData
): Promise<ContentFormState> {
  const staff = await editor(
    id ? `/admin/recipes/${id}` : "/admin/recipes/new"
  );
  const input = draft(fd, recipeShape);
  if (!input) return UNREADABLE;
  const result = await adminWrite(
    staff.id,
    (tx) => saveRecipe(input, id ?? undefined, tx),
    (done) => [
      {
        action: id ? "update" : "create",
        entity: "recipe",
        entityId: done.id,
        after: input,
      },
    ]
  );
  if (!result.ok) return { errors: result.errors };
  updateTag(CONTENT_TAG);
  if (!id) redirect(`/admin/recipes/${result.id}?created=1`);
  return { errors: {}, saved: true };
}

export async function saveArticleAction(
  id: string | null,
  _prev: ContentFormState,
  fd: FormData
): Promise<ContentFormState> {
  const staff = await editor(
    id ? `/admin/articles/${id}` : "/admin/articles/new"
  );
  const input = draft(fd, articleShape);
  if (!input) return UNREADABLE;
  const result = await adminWrite(
    staff.id,
    (tx) => saveArticle(input, id ?? undefined, tx),
    (done) => [
      {
        action: id ? "update" : "create",
        entity: "article",
        entityId: done.id,
        after: input,
      },
    ]
  );
  if (!result.ok) return { errors: result.errors };
  updateTag(CONTENT_TAG);
  if (!id) redirect(`/admin/articles/${result.id}?created=1`);
  return { errors: {}, saved: true };
}

export async function uploadContentPhoto(
  kind: "recipe" | "article",
  id: string,
  _prev: ContentFormState,
  fd: FormData
): Promise<ContentFormState> {
  const staff = await editor(`/admin/${kind}s/${id}`);
  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0)
    return { errors: { photo: "Choose a photo." } };
  const result = await setContentPhoto(kind, id, {
    bytes: Buffer.from(await file.arrayBuffer()),
    alt: String(fd.get("alt") ?? ""),
  });
  if (!result.ok) return { errors: result.errors };
  // Audited after the write, like Product photos: storing it can outlast a
  // transaction.
  await recordAudits([
    {
      staffId: staff.id,
      action: "photo",
      entity: kind,
      entityId: id,
      after: { url: result.url },
    },
  ]);
  updateTag(CONTENT_TAG);
  return { errors: {}, saved: true };
}

export async function deleteContent(kind: "recipe" | "article", id: string) {
  const staff = await editor(`/admin/${kind}s/${id}`);
  const deleted = await adminWrite(
    staff.id,
    async (tx) => ({
      ok: await (kind === "recipe"
        ? deleteRecipe(id, tx)
        : deleteArticle(id, tx)),
    }),
    () => [{ action: "delete", entity: kind, entityId: id }]
  );
  if (deleted.ok) updateTag(CONTENT_TAG);
  redirect(`/admin/${kind}s`);
}
