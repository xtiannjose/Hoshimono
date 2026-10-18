import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { categoryOptions } from "../category-options";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New Product" };

export default function NewProductPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/products/new">
        <NewProduct />
      </StaffGate>
    </Suspense>
  );
}

async function NewProduct() {
  const categories = await categoryOptions();
  return (
    <section className="grid gap-5">
      <h1 className="type-h2">New Product</h1>
      <ProductForm
        categories={categories}
        values={{
          name: "",
          brand: "",
          description: "",
          categoryId: categories[0]?.value ?? "",
          packSizeValue: "",
          packSizeUnit: "g",
          price: "",
          compareAt: "",
          taxClass: "vatable",
          isWeighed: false,
          storage: "ambient",
          status: "draft",
          barcode: "",
          allergens: "",
          dietaryTags: "",
        }}
      />
    </section>
  );
}
