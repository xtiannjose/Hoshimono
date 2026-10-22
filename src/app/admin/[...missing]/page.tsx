import { notFound } from "next/navigation";

/** Any staff address no screen claims. */
export default function Missing(): never {
  notFound();
}
