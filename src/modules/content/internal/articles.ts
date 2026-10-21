import { db, inTransaction, type Client } from "@/lib/db";
import { isUuid } from "@/lib/uuid";
import { getProductSummaries, type ProductSummary } from "@/modules/catalog";

import {
  MAX_TEXT,
  MAX_TITLE,
  publishedAt,
  refused,
  uniqueSlug,
  type ContentStatus,
  type FieldErrors,
  type SaveResult,
} from "./shared";

// Articles: guides, tips and stories in sections, with Products linked
// from them (ADR 0013).

export type Section = { heading: string; text: string };

export type ArticleInput = {
  title: string;
  intro: string;
  sections: Section[];
  /** In the order to show them; repeats are dropped. */
  productIds: string[];
  status: ContentStatus;
};

export type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  photoUrl: string | null;
  photoAlt: string;
};

export type ArticleView = ArticleSummary & {
  sections: Section[];
  publishedAt: Date | null;
  updatedAt: Date;
  /** Linked Products still sold. */
  products: ProductSummary[];
  /** Every linked Product, sold or not, for the editor. */
  productIds: string[];
};

const summarySelect = {
  id: true,
  slug: true,
  title: true,
  intro: true,
  photoUrl: true,
  photoAlt: true,
} as const;

/** Sections as stored: only well-formed ones survive a bad row. */
function toSections(json: unknown): Section[] {
  return Array.isArray(json)
    ? json.flatMap((s) =>
        s && typeof s.text === "string"
          ? [{ heading: String(s.heading ?? ""), text: s.text }]
          : []
      )
    : [];
}

async function loadArticle(where: { slug: string } | { id: string }) {
  const article = await db.article.findUnique({
    where,
    select: {
      ...summarySelect,
      sections: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      products: { orderBy: { position: "asc" }, select: { productId: true } },
    },
  });
  if (!article) return null;
  const productIds = article.products.map((p) => p.productId);
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    intro: article.intro,
    photoUrl: article.photoUrl,
    photoAlt: article.photoAlt,
    sections: toSections(article.sections),
    status: article.status,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    products: await getProductSummaries(productIds),
    productIds,
  } satisfies ArticleView & { status: ContentStatus };
}

/** A published Article by its slug, or null. */
export async function getArticle(slug: string): Promise<ArticleView | null> {
  const article = await loadArticle({ slug });
  return article?.status === "published" ? article : null;
}

/** Published Articles, newest first. */
export async function listArticles(): Promise<ArticleSummary[]> {
  return db.article.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    select: summarySelect,
  });
}

// ---------- Content Editor ----------

export async function listArticlesForAdmin() {
  return db.article.findMany({
    orderBy: { updatedAt: "desc" },
    select: { ...summarySelect, status: true, updatedAt: true },
  });
}

export async function getArticleForAdmin(id: string) {
  return isUuid(id) ? loadArticle({ id }) : null;
}

/**
 * Create (no `id`) or update an Article. Blank sections are dropped; the
 * slug is made from the title on create and kept after (ADR 0009 form result).
 */
export async function saveArticle(
  input: ArticleInput,
  id?: string,
  client: Client = db
): Promise<SaveResult> {
  const errors: FieldErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = "Give the Article a title.";
  else if (title.length > MAX_TITLE)
    errors.title = `Keep the title under ${MAX_TITLE} characters.`;
  if (input.intro.length > MAX_TEXT)
    errors.intro = `Keep the intro under ${MAX_TEXT} characters.`;
  const sections = input.sections
    .map((s) => ({ heading: s.heading.trim(), text: s.text.trim() }))
    .filter((s) => s.text);
  if (sections.some((s) => s.heading.length > MAX_TITLE))
    errors.sections = `Keep each heading under ${MAX_TITLE} characters.`;
  else if (sections.some((s) => s.text.length > MAX_TEXT * 5))
    errors.sections = `Keep each section under ${MAX_TEXT * 5} characters.`;
  if (input.status === "published" && sections.length === 0)
    errors.status = "Write at least one section before publishing.";
  const productIds = [...new Set(input.productIds)];
  if (productIds.some((p) => !isUuid(p)))
    errors.products = "One of the Products no longer exists.";
  if (Object.keys(errors).length) return { ok: false, errors };

  return inTransaction<SaveResult>(client, async (tx) => {
    const before = id
      ? await tx.article.findUnique({
          where: { id },
          select: { slug: true, publishedAt: true },
        })
      : null;
    if (id && !before) return refused("form", "That Article no longer exists.");
    if (
      (await tx.product.count({ where: { id: { in: productIds } } })) !==
      productIds.length
    )
      return refused("products", "One of the Products no longer exists.");
    const fields = {
      title,
      intro: input.intro.trim(),
      sections,
      status: input.status,
      publishedAt: publishedAt(input.status, before?.publishedAt),
    };
    const slug =
      before?.slug ??
      (await uniqueSlug(title, "article", async (base) =>
        (
          await tx.article.findMany({
            where: { slug: { startsWith: base } },
            select: { slug: true },
          })
        ).map((a) => a.slug)
      ));
    const saved = id
      ? await tx.article.update({ where: { id }, data: fields })
      : await tx.article.create({ data: { ...fields, slug } });
    await tx.articleProduct.deleteMany({ where: { articleId: saved.id } });
    await tx.articleProduct.createMany({
      data: productIds.map((productId, position) => ({
        articleId: saved.id,
        productId,
        position,
      })),
    });
    return { ok: true, id: saved.id, slug };
  });
}

export async function deleteArticle(id: string, client: Client = db) {
  if (!isUuid(id)) return false;
  const { count } = await client.article.deleteMany({ where: { id } });
  return count > 0;
}
