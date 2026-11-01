import { describe, expect, it } from "vitest";

import { localPath, stripLang } from "./lang";

describe("language addresses (ADR 0017)", () => {
  it("prefixes Filipino and leaves English alone", () => {
    expect(localPath("en", "/c/milk")).toBe("/c/milk");
    expect(localPath("fil", "/c/milk")).toBe("/fil/c/milk");
    expect(localPath("fil", "/")).toBe("/fil");
    expect(localPath("fil", "/search?q=gatas")).toBe("/fil/search?q=gatas");
  });

  it("leaves staff screens, files, other sites and prefixed paths alone", () => {
    expect(localPath("fil", "/admin/orders")).toBe("/admin/orders");
    expect(localPath("fil", "/media/a.jpg")).toBe("/media/a.jpg");
    expect(localPath("fil", "https://example.com/")).toBe(
      "https://example.com/"
    );
    expect(localPath("fil", "#main")).toBe("#main");
    expect(localPath("fil", "/fil/cart")).toBe("/fil/cart");
    // "/filter" is a page, not a language.
    expect(localPath("fil", "/filter")).toBe("/fil/filter");
  });

  it("strips a language back off", () => {
    expect(stripLang("/fil/c/milk")).toBe("/c/milk");
    expect(stripLang("/fil")).toBe("/");
    expect(stripLang("/fil?x=1")).toBe("/?x=1");
    expect(stripLang("/en/cart")).toBe("/cart");
    expect(stripLang("/cart")).toBe("/cart");
    expect(stripLang("/filter")).toBe("/filter");
  });
});
