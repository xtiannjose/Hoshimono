/** "Nescafe 3-in-1 Coffee": a Product's name as shown and as an Order Line keeps it. */
export function productName(product: {
  brand: string | null;
  name: string;
}): string {
  return product.brand ? `${product.brand} ${product.name}` : product.name;
}
