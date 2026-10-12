import { describe, expect, it } from "vitest";
import { parsePageRanges } from "./page-ranges";

describe("parsePageRanges", () => {
  it("expands single pages and ranges in the order given", () => {
    expect(parsePageRanges("1-3, 5, 8-9", 10)).toEqual([1, 2, 3, 5, 8, 9]);
    expect(parsePageRanges("5, 1", 10)).toEqual([5, 1]);
  });

  it("tolerates whitespace and trailing commas", () => {
    expect(parsePageRanges(" 2 - 3 ,", 5)).toEqual([2, 3]);
  });

  it.each([
    ["", /Enter the pages/],
    ["abc", /isn't a valid/],
    ["0", /start at 1/],
    ["5-3", /backwards/],
    ["9", /doesn't exist/],
    ["1-2,x", /isn't a valid/],
  ])("rejects %j", (input, message) => {
    expect(() => parsePageRanges(input, 7)).toThrow(message);
  });
});
