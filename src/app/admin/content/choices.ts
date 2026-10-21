import "server-only";

import { formatPackSize } from "@/components/product/format";
import { productName } from "@/lib/product-name";
import { listProductChoices } from "@/modules/catalog";

import type { ProductChoice } from "./editor-parts";

/** "Silver Swan Soy Sauce, 1 L" for every Product still sold. */
export async function productChoices(): Promise<ProductChoice[]> {
  return (await listProductChoices()).map((p) => ({
    id: p.id,
    label: `${productName(p)}, ${formatPackSize(
      { value: p.packSizeValue, unit: p.packSizeUnit },
      p.isWeighed
    )}`,
  }));
}
