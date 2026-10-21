// Public interface of the catalog module (docs/03-ARCHITECTURE.md section 3).
// Owns Product, Category, ProductImage and the search index.
export { getCategory, getCategoryTree } from "./internal/categories";
export type { CategoryDetail, CategoryNode } from "./internal/categories";
export {
  getProduct,
  loadSummaries as getProductSummaries,
} from "./internal/products";
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
export { listRelatedProducts } from "./internal/related";

// Admin (merchandiser) writes. Callers check requireStaff first.
export {
  createProduct,
  getProductForAdmin,
  listProductsForAdmin,
  updateProduct,
} from "./internal/admin/products";
export type {
  AdminProductRow,
  FieldErrors,
  WriteResult,
} from "./internal/admin/products";
export {
  CSV_IMPORT_TIMEOUT_MS,
  exportProductsCsv,
  importProductsCsv,
} from "./internal/admin/import";
export type {
  ImportChange,
  ImportError,
  ImportResult,
} from "./internal/admin/import";
export {
  createCategory,
  deleteCategory,
  getCategoryForAdmin,
  listCategoriesForAdmin,
  updateCategory,
} from "./internal/admin/categories";
export {
  addProductImage,
  removeProductImage,
  setPrimaryImage,
} from "./internal/admin/images";
export { basisFor, productFields } from "./internal/admin/schema";
export type { ProductFields } from "./internal/admin/schema";
export { listSitemapEntries } from "./internal/sitemap";
