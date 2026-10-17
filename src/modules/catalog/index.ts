// Public interface of the catalog module (docs/03-ARCHITECTURE.md section 3).
// Owns Product, Category, ProductImage and the search index.
export { getCategory, getCategoryTree } from "./internal/categories";
export type { CategoryDetail, CategoryNode } from "./internal/categories";
export { getProduct } from "./internal/products";
export type {
  ProductDetail,
  ProductImageView,
  ProductSummary,
  UnitPrice,
} from "./internal/products";
export { listProducts } from "./internal/list";
export type {
  ListProductsInput,
  ListProductsResult,
  ProductFacets,
  ProductSort,
} from "./internal/list";
export { searchProducts, suggestSearch } from "./internal/search";
export type { SearchResult, SearchSuggestions } from "./internal/search";
export type { SearchIndex } from "./internal/search/search-index";
