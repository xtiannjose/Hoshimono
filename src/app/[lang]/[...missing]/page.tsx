import { notFound } from "next/navigation";

/** Any address no page claims: the not-found page in its language. */
export default function Missing(): never {
  notFound();
}
