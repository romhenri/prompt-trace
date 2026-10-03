import { describe, expect, it } from "vitest";
import { overlap, parseTemperatures } from "./temperature";

describe("parseTemperatures", () => {
  it("sorts, dedupes, clamps and drops junk", () => {
    expect(parseTemperatures("1, 0 ; 0.5 abc 1 9 -3")).toEqual([0, 0.5, 1, 2]);
  });

  it("caps the number of columns", () => {
    expect(parseTemperatures("0 0.1 0.2 0.3 0.4 0.5 0.6")).toHaveLength(6);
  });
});

describe("overlap", () => {
  it("is 1 for the same words and 0 for none shared", () => {
    expect(overlap("The cat sat", "the CAT sat")).toBe(1);
    expect(overlap("alpha beta", "gamma delta")).toBe(0);
  });

  it("is the shared share of distinct words", () => {
    expect(overlap("a b c", "b c d")).toBe(0.5);
  });
});
