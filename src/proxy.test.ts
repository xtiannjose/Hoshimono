import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

const run = (path: string) => proxy(new NextRequest(`http://shop.test${path}`));
const rewrite = (path: string) =>
  run(path)?.headers.get("x-middleware-rewrite") ?? null;

describe("language proxy", () => {
  it("serves English addresses from /en inside", () => {
    expect(rewrite("/")).toBe("http://shop.test/en");
    expect(rewrite("/cart")).toBe("http://shop.test/en/cart");
    // A signed stop link has a dot in it and is still a page.
    expect(rewrite("/stop/abc.def")).toBe("http://shop.test/en/stop/abc.def");
  });

  it("sends /en addresses to the one without a prefix", () => {
    const res = run("/en/cart");
    expect(res?.status).toBe(308);
    expect(res?.headers.get("location")).toBe("http://shop.test/cart");
  });

  it("leaves Filipino pages and root files alone", () => {
    expect(rewrite("/fil/cart")).toBeNull();
    expect(run("/robots.txt")).toBeUndefined();
    expect(run("/sw.js")).toBeUndefined();
  });

  it("names both languages of the page for search engines", () => {
    const link = run("/fil/c/milk")?.headers.get("link");
    expect(link).toContain(
      '<http://shop.test/c/milk>; rel="alternate"; hreflang="en-PH"'
    );
    expect(link).toContain(
      '<http://shop.test/fil/c/milk>; rel="alternate"; hreflang="fil"'
    );
    expect(link).toContain(
      '<http://shop.test/c/milk>; rel="alternate"; hreflang="x-default"'
    );
  });
});
