"use client";

import { TrashIcon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";

import { saveNote } from "@/app/cart/actions";
import { CategoryIcon } from "@/components/product/category-icon";
import { formatPackSize } from "@/components/product/format";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { formatMoney } from "@/lib/money";
import { productName } from "@/lib/product-name";
import { productHref } from "@/lib/routes";
import type { CartLineView } from "@/modules/cart";

import { changeQuantity, setCartView, showNotice, useCart } from "./cart-store";
import { SubstitutionSelect } from "./substitution-select";

/** One Cart Line: what it is, what changed, what to do if it runs out. */
export function CartLine({
  line,
  lineTotalCents,
  onNavigate,
}: {
  line: CartLineView;
  /** From priceCart; null when the line is left out of the total. */
  lineTotalCents: number | null;
  onNavigate?: () => void;
}) {
  const { product } = line;
  const pending = useCart((s) => s.pending[product.id]);
  const notice = useCart((s) =>
    s.notice?.productId === product.id ? s.notice.text : null
  );
  const quantity = pending ?? line.quantity;
  const out = line.stock === "out";
  const name = productName(product);

  return (
    <li className="border-border grid grid-cols-[56px_1fr] gap-3 border-b py-3.5">
      <div className="rounded-field bg-muted relative grid size-14 place-items-center overflow-hidden">
        {product.primaryImage ? (
          <Image
            src={product.primaryImage.url}
            alt=""
            fill
            sizes="56px"
            className={`object-cover ${out ? "opacity-60 grayscale" : ""}`}
          />
        ) : (
          <CategoryIcon
            slug={product.category.slug}
            size={24}
            className="opacity-70"
          />
        )}
      </div>
      <div className="min-w-0">
        <Link
          href={productHref(product)}
          onClick={onNavigate}
          className="block text-[15px] leading-5 font-semibold hover:underline"
        >
          {name}
        </Link>
        <small className="text-muted-foreground block text-[13px] leading-[18px]">
          {formatPackSize(product.packSize, product.isWeighed)},{" "}
          {formatMoney(product.priceCents)} each
        </small>
        {product.isWeighed && (
          <small className="text-muted-foreground block text-[13px] leading-[18px]">
            Final price follows the actual weight.
          </small>
        )}
        <Flags line={line} />
        <SubstitutionSelect
          productId={product.id}
          name={name}
          value={line.substitution}
        />
        {product.isWeighed && (
          <PickerNote productId={product.id} note={line.note} />
        )}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {out ? null : (
              <div className="w-36">
                <QuantityStepper
                  variant="ghost"
                  value={quantity}
                  min={1}
                  onChange={(next) => changeQuantity(product.id, name, next)}
                  label={`Quantity of ${name}`}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => changeQuantity(product.id, name, 0)}
              aria-label={`Remove ${name}`}
              className="rounded-pill hover:bg-muted text-muted-foreground hover:text-foreground grid size-11 place-items-center"
            >
              <TrashIcon size={20} aria-hidden />
            </button>
          </div>
          <span
            aria-busy={pending !== undefined}
            className={`font-display text-[17px] font-semibold tabular-nums transition-opacity ${pending !== undefined ? "opacity-50" : ""}`}
          >
            {lineTotalCents === null ? (
              <span className="text-muted-foreground text-sm font-medium">
                Not in total
              </span>
            ) : (
              formatMoney(lineTotalCents)
            )}
          </span>
        </div>
        {notice && (
          <p className="text-warn mt-1.5 text-[13px] leading-[18px] font-semibold">
            {notice}
          </p>
        )}
      </div>
    </li>
  );
}

function Flags({ line }: { line: CartLineView }) {
  const was = line.priceWasCents;
  const flags: string[] = [];
  if (line.stock === "out") {
    flags.push("Out of stock today, so it is not in your total.");
  } else if (line.short) {
    flags.push(`Running low. We may not have all ${line.quantity}.`);
  }
  if (was !== null) {
    flags.push(
      `${line.product.priceCents > was ? "Price went up" : "Price dropped"} from ${formatMoney(was)}.`
    );
  }
  if (flags.length === 0) return null;
  return (
    <div className="rounded-field bg-warn-soft text-warn mt-1.5 grid gap-0.5 px-2.5 py-1.5 text-[13px] leading-[18px] font-semibold">
      {flags.map((flag) => (
        <p key={flag}>{flag}</p>
      ))}
    </div>
  );
}

/** A short note for whoever weighs it, such as "lean cuts" or "ripe ones". */
function PickerNote({
  productId,
  note,
}: {
  productId: string;
  note: string | null;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setSaving(true);
    try {
      const result = await saveNote(productId, String(formData.get("note")));
      setCartView(result.cart);
      if (result.message) showNotice(productId, result.message);
      else setOpen(false);
    } catch {
      showNotice(productId, "We could not save your note. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground mt-1 block min-h-11 text-left text-[13px] font-semibold underline underline-offset-[3px]"
      >
        {note ? `Note: ${note}` : "Add a note for your picker"}
      </button>
    );
  }
  return (
    <form action={submit} className="mt-2 grid gap-1.5">
      <label htmlFor={`${id}-note`} className="text-sm font-semibold">
        Note for your picker
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-note`}
          name="note"
          defaultValue={note ?? ""}
          maxLength={200}
          autoFocus
          className="rounded-field border-input bg-card h-11 min-w-0 flex-1 border px-3 text-base"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-pill bg-btn text-btn-fg hover:bg-btn-hover h-11 px-4 text-sm font-semibold disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </form>
  );
}
