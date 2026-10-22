import type { ReactNode } from "react";

import { getMessages } from "@/i18n/server";
import type { ProductSummary } from "@/modules/catalog";
import type { StockState } from "@/modules/inventory";

import { ProductCard, ProductCardSkeleton } from "./product-card";

// Six across on wide screens, two on phones (mockup grid6).
const GRID =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-6";

export function ProductGrid({
  products,
  stock,
  empty,
  priorityCount = 0,
}: {
  products: ProductSummary[];
  stock: Record<string, StockState>;
  /** What to say when there is nothing to show, and how to fix that. */
  empty: ReactNode;
  priorityCount?: number;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-card bg-muted px-6 py-10 text-center">
        {empty}
      </div>
    );
  }
  return (
    <ul className={GRID}>
      {products.map((p, i) => (
        <li key={p.id} className="grid">
          <ProductCard
            product={p}
            stock={stock[p.id] ?? "out"}
            priority={i < priorityCount}
          />
        </li>
      ))}
    </ul>
  );
}

export async function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  const t = (await getMessages()).product;
  return (
    <div role="status" className={GRID} aria-busy="true" aria-label={t.loading}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
