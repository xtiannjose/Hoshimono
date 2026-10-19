import { z } from "zod";

const guid = z.guid();

/** True for any 8-4-4-4-12 hex id, the shape of every id we store. */
export function isUuid(value: string): boolean {
  return guid.safeParse(value).success;
}
