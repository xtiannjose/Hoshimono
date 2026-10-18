import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { getProductForAdmin } from "@/modules/catalog";
import { productHref } from "@/lib/routes";

import { deleteImage, makePrimaryImage } from "../../actions";
import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { categoryOptions } from "../category-options";
import { ProductForm } from "../product-form";
import { ImageUpload } from "./image-upload";

export const metadata: Metadata = { title: "Edit Product" };

type Props = PageProps<"/admin/products/[id]">;

export default function EditProductPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/products">
        <EditProduct params={params} searchParams={searchParams} />
      </StaffGate>
    </Suspense>
  );
}

const pesos = (cents: number | null) =>
  cents === null ? "" : (cents / 100).toFixed(2);

async function EditProduct({ params, searchParams }: Props) {
  const { id } = await params;
  const created = (await searchParams).created === "1";
  const [product, categories] = await Promise.all([
    getProductForAdmin(id),
    categoryOptions(),
  ]);
  if (!product) notFound();

  return (
    <section className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            <Link href="/admin/products" className="hover:underline">
              Products
            </Link>{" "}
            / {product.slug}
          </p>
          <h1 className="type-h2">{product.name}</h1>
        </div>
        {product.status === "active" && (
          <Link
            href={productHref(product)}
            className="font-semibold underline underline-offset-4"
          >
            View in shop
          </Link>
        )}
      </div>
      {created && (
        <p
          role="status"
          className="rounded-field bg-accent-soft px-4 py-3 font-semibold"
        >
          Product created. Add a photo below, then set it to active.
        </p>
      )}

      <ProductForm
        categories={categories}
        values={{
          id: product.id,
          name: product.name,
          brand: product.brand ?? "",
          description: product.description ?? "",
          categoryId: product.categoryId,
          packSizeValue: String(product.packSizeValue),
          packSizeUnit: product.packSizeUnit,
          price: pesos(product.priceCents),
          compareAt: pesos(product.compareAtCents),
          taxClass: product.taxClass,
          isWeighed: product.isWeighed,
          storage: product.storage,
          status: product.status,
          barcode: product.barcode ?? "",
          allergens: product.allergens.join(", "),
          dietaryTags: product.dietaryTags.join(", "),
        }}
      />

      <section aria-labelledby="photos-h" className="grid gap-4">
        <h2 id="photos-h" className="type-h3">
          Photos
        </h2>
        {product.images.length === 0 ? (
          <p className="text-muted-foreground">
            No photos yet. The shop shows a placeholder.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-4">
            {product.images.map((img) => (
              <li key={img.id} className="grid w-40 gap-2">
                <div className="rounded-field border-border relative aspect-square overflow-hidden border">
                  <Image
                    src={img.url}
                    alt={img.alt}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                </div>
                {img.isPrimary ? (
                  <span className="text-sm font-semibold">Main photo</span>
                ) : (
                  <form
                    action={makePrimaryImage.bind(null, product.id, img.id)}
                  >
                    <Button type="submit" size="sm" variant="secondary">
                      Make main
                    </Button>
                  </form>
                )}
                <form action={deleteImage.bind(null, product.id, img.id)}>
                  <Button type="submit" size="sm" variant="ghost">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <ImageUpload productId={product.id} />
      </section>
    </section>
  );
}
