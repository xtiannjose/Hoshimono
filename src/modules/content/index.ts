// Public interface of the content module (docs/03-ARCHITECTURE.md section 3).
// Owns Recipe, RecipeIngredient, Article and ArticleProduct (ADR 0013).
// Admin writes: callers check requireStaff("content") first.
export {
  deleteRecipe,
  getFeaturedRecipe,
  getRecipe,
  getRecipeForAdmin,
  ingredientCount,
  listRecipes,
  listRecipesForAdmin,
  saveRecipe,
} from "./internal/recipes";
export type {
  AdminRecipeRow,
  IngredientInput,
  IngredientView,
  RecipeInput,
  RecipeSummary,
  RecipeView,
} from "./internal/recipes";
export {
  deleteArticle,
  getArticle,
  getArticleForAdmin,
  listArticles,
  listArticlesForAdmin,
  saveArticle,
} from "./internal/articles";
export type {
  ArticleInput,
  ArticleSummary,
  ArticleView,
  Section,
} from "./internal/articles";
export { addRecipeToCart, SIMILAR_LIMIT } from "./internal/to-cart";
export type { AddRecipeResult, RecipePick } from "./internal/to-cart";
export { setContentPhoto } from "./internal/photo";
export type { SaveResult } from "./internal/shared";
