"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";

import { useLocalPath } from "@/i18n/client";

/**
 * next/link that keeps the shopper in their language (ADR 0017): "/cart" on
 * a Filipino page goes to "/fil/cart". Shop code links with this one.
 */
export default function Link({
  href,
  ...props
}: ComponentProps<typeof NextLink>) {
  const local = useLocalPath();
  return (
    <NextLink href={typeof href === "string" ? local(href) : href} {...props} />
  );
}
