import { describe, expect, it } from "vitest";
import { FALLBACK_MODELS } from "./fallback-models";
import { fallbackCatalog } from "./models";

const cached = {
  fetchedAt: 1,
  models: [
    {
      id: "a/b",
      name: "B",
      context_length: 1,
      pricing: { prompt: "0.1", completion: "0.2" },
    },
  ],
};

describe("fallbackCatalog", () => {
  it("prefers a cached catalog even when it is stale", () => {
    expect(fallbackCatalog(cached)).toEqual({
      models: cached.models,
      source: "cache",
    });
  });

  it("uses the bundled list when nothing is cached", () => {
    expect(fallbackCatalog(null)).toEqual({
      models: FALLBACK_MODELS,
      source: "bundled",
    });
  });

  it("ignores a malformed or empty cache", () => {
    expect(fallbackCatalog({ fetchedAt: 1, models: [] }).source).toBe(
      "bundled",
    );
    expect(fallbackCatalog({ fetchedAt: 1, models: "x" } as never).source).toBe(
      "bundled",
    );
  });

  it("gives every bundled model a unique id", () => {
    const ids = FALLBACK_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
