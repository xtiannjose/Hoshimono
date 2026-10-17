/**
 * The seam between catalog and its search engine. Postgres implements it
 * today; Meilisearch or Typesense can replace it without touching callers
 * (docs/03-ARCHITECTURE.md section 10).
 */
export interface SearchIndex {
  /** Active Product ids, best match first. */
  search(
    query: string,
    page: { limit: number; offset: number }
  ): Promise<{ ids: string[]; total: number; correctedQuery: string | null }>;

  /** As-you-type suggestions. */
  suggest(
    query: string,
    limit: number
  ): Promise<{ productIds: string[]; brands: string[]; categoryIds: string[] }>;
}
