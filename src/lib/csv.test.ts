import { describe, expect, it } from "vitest";

import { parseCsv, toCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("reads rows, quoted commas, escaped quotes and line breaks in quotes", () => {
    const text =
      'name,price\n"Milk, fresh",115\n"Say ""hi""",1\n"two\nlines",2\n';
    expect(parseCsv(text)).toEqual([
      ["name", "price"],
      ["Milk, fresh", "115"],
      ['Say "hi"', "1"],
      ["two\nlines", "2"],
    ]);
  });

  it("handles a byte order mark, CRLF and a missing final newline", () => {
    expect(parseCsv("﻿a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps empty fields and skips fully blank lines", () => {
    expect(parseCsv("a,,c\n\n,,\n")).toEqual([
      ["a", "", "c"],
      ["", "", ""],
    ]);
  });
});

describe("toCsv", () => {
  it("quotes only when needed and round-trips with parseCsv", () => {
    const rows = [
      ["name", "note"],
      ["Milk, fresh", 'Say "hi"'],
      ["two\nlines", "plain"],
    ];
    const text = toCsv(rows);
    expect(text.split("\r\n")[0]).toBe("name,note");
    expect(parseCsv(text)).toEqual(rows);
  });

  it("neutralises cells a spreadsheet would run as a formula", () => {
    expect(toCsv([["=1+1", "+cmd", "@SUM(A1)", "-2"]])).toBe(
      "'=1+1,'+cmd,'@SUM(A1),'-2\r\n"
    );
  });
});
