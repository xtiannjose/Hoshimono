"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import { saveArticleAction, type ContentFormState } from "../content/actions";
import {
  FIELD,
  FieldError,
  Labeled,
  moved,
  PRODUCT_LIST,
  ProductChoices,
  rowKey,
  RowTools,
  type ProductChoice,
} from "../content/editor-parts";
import { FormMessage } from "../form-message";

export type ArticleDraft = {
  title: string;
  intro: string;
  status: "draft" | "published";
  sections: { heading: string; text: string }[];
  productIds: string[];
};

const initial: ContentFormState = { errors: {} };

/** An Article on one page: sections and the Products to buy (ADR 0013). */
export function ArticleEditor({
  id,
  article,
  products,
}: {
  id: string | null;
  article: ArticleDraft;
  products: ProductChoice[];
}) {
  const [state, action, pending] = useActionState(
    saveArticleAction.bind(null, id),
    initial
  );
  const labelOf = new Map(products.map((p) => [p.id, p.label]));
  const idOf = new Map(products.map((p) => [p.label, p.id]));

  const [title, setTitle] = useState(article.title);
  const [intro, setIntro] = useState(article.intro);
  const [status, setStatus] = useState(article.status);
  const [sections, setSections] = useState(() =>
    article.sections.map((s) => ({ ...s, key: rowKey() }))
  );
  const [linked, setLinked] = useState(article.productIds);
  const [finding, setFinding] = useState("");

  const draft: ArticleDraft = {
    title,
    intro,
    status,
    sections: sections.map(({ heading, text }) => ({ heading, text })),
    productIds: linked,
  };
  const found = idOf.get(finding);
  const e = state.errors;

  return (
    <form action={action} className="grid max-w-4xl gap-8">
      <input type="hidden" name="draft" value={JSON.stringify(draft)} />
      <ProductChoices products={products} />

      <section aria-labelledby="about-h" className="grid gap-4">
        <h2 id="about-h" className="type-h3">
          About the Article
        </h2>
        <Labeled label="Title" htmlFor="title" error={e.title}>
          <input
            id="title"
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
            className={FIELD}
          />
        </Labeled>
        <Labeled
          label="Intro"
          htmlFor="intro"
          hint="One or two sentences on the list and at the top of the page."
          error={e.intro}
        >
          <textarea
            id="intro"
            rows={3}
            value={intro}
            onChange={(ev) => setIntro(ev.target.value)}
            className={`${FIELD} py-2`}
          />
        </Labeled>
      </section>

      <section aria-labelledby="sections-h" className="grid gap-4">
        <div className="grid gap-1">
          <h2 id="sections-h" className="type-h3">
            Sections
          </h2>
          <p className="text-muted-foreground text-sm">
            A heading (optional) and its text. Leave a blank line between
            paragraphs.
          </p>
        </div>
        <FieldError message={e.sections} />
        <ol className="grid gap-3">
          {sections.map((s, index) => {
            const n = index + 1;
            const patch = (p: Partial<typeof s>) =>
              setSections((list) =>
                list.map((x) => (x.key === s.key ? { ...x, ...p } : x))
              );
            return (
              <li
                key={s.key}
                aria-label={`Section ${n}`}
                className="rounded-card border-border bg-card grid gap-3 border p-4 md:grid-cols-[1fr_auto]"
              >
                <div className="grid gap-3">
                  <Labeled label={`Heading (${n})`} htmlFor={`h-${s.key}`}>
                    <input
                      id={`h-${s.key}`}
                      value={s.heading}
                      onChange={(ev) => patch({ heading: ev.target.value })}
                      className={FIELD}
                    />
                  </Labeled>
                  <Labeled label={`Text (${n})`} htmlFor={`t-${s.key}`}>
                    <textarea
                      id={`t-${s.key}`}
                      rows={6}
                      value={s.text}
                      onChange={(ev) => patch({ text: ev.target.value })}
                      className={`${FIELD} py-2`}
                    />
                  </Labeled>
                </div>
                <div className="self-start md:pt-6">
                  <RowTools
                    index={index}
                    count={sections.length}
                    what={`section ${n}`}
                    onMove={(to) =>
                      setSections((list) => moved(list, index, to))
                    }
                    onRemove={() =>
                      setSections((list) => list.filter((x) => x.key !== s.key))
                    }
                  />
                </div>
              </li>
            );
          })}
        </ol>
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setSections((list) => [
                ...list,
                { key: rowKey(), heading: "", text: "" },
              ])
            }
          >
            <PlusIcon aria-hidden />
            Add section
          </Button>
        </div>
      </section>

      <section aria-labelledby="products-h" className="grid gap-4">
        <div className="grid gap-1">
          <h2 id="products-h" className="type-h3">
            Products to buy
          </h2>
          <p className="text-muted-foreground text-sm">
            Shown at the end of the Article, ready to add to the Cart.
          </p>
        </div>
        <FieldError message={e.products} />
        {linked.length > 0 && (
          <ol className="grid gap-2">
            {linked.map((productId, index) => (
              <li
                key={productId}
                className="border-border flex flex-wrap items-center justify-between gap-2 border-b pb-2"
              >
                <span>
                  {labelOf.get(productId) ?? "A Product no longer sold"}
                </span>
                <RowTools
                  index={index}
                  count={linked.length}
                  what={labelOf.get(productId) ?? `Product ${index + 1}`}
                  onMove={(to) => setLinked((list) => moved(list, index, to))}
                  onRemove={() =>
                    setLinked((list) => list.filter((p) => p !== productId))
                  }
                />
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <Labeled label="Find a Product" htmlFor="find-product">
              <input
                id="find-product"
                list={PRODUCT_LIST}
                value={finding}
                onChange={(ev) => setFinding(ev.target.value)}
                className={FIELD}
              />
            </Labeled>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!found || linked.includes(found)}
            onClick={() => {
              if (found) setLinked((list) => [...list, found]);
              setFinding("");
            }}
          >
            <PlusIcon aria-hidden />
            Add Product
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="publish-h"
        className="rounded-card border-border bg-card grid gap-4 border p-4"
      >
        <h2 id="publish-h" className="type-h3">
          Publishing
        </h2>
        <Labeled label="Status" htmlFor="status">
          <select
            id="status"
            value={status}
            onChange={(ev) =>
              setStatus(ev.target.value as ArticleDraft["status"])
            }
            className={`${FIELD} w-56`}
          >
            <option value="draft">Draft: only staff see it</option>
            <option value="published">Published: on the shop</option>
          </select>
        </Labeled>
        <FieldError message={e.status} />
        <FieldError message={e.form} />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : id ? "Save changes" : "Create Article"}
          </Button>
          {state.saved && <FormMessage state={state} />}
        </div>
      </section>
    </form>
  );
}
