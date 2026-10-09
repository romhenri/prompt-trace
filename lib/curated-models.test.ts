import { describe, expect, it } from "vitest";
import type { OpenRouterModel } from "./openrouter/types";
import { resolveCuratedIds } from "./curated-models";

const model = (id: string): OpenRouterModel => ({
  id,
  name: id,
  context_length: 1,
  pricing: { prompt: "0", completion: "0" },
});

describe("resolveCuratedIds", () => {
  it("picks the first candidate present in the catalog", () => {
    const ids = resolveCuratedIds([
      model("google/gemini-2.5-flash-lite"),
      model("google/gemini-2.5-flash"),
    ]);
    expect(ids).toContain("google/gemini-2.5-flash");
    expect(ids).not.toContain("google/gemini-2.5-flash-lite");
  });

  it("falls back to a later candidate when the preferred one is gone", () => {
    expect(resolveCuratedIds([model("openai/gpt-oss-20b:free")])).toEqual([
      "openai/gpt-oss-20b:free",
    ]);
  });

  it("matches the free Nemotron 3 Super by pattern", () => {
    const ids = resolveCuratedIds([
      model("nvidia/nemotron-3-super-120b-a12b"),
      model("nvidia/nemotron-3-super-120b-a12b:free"),
    ]);
    expect(ids).toEqual(["nvidia/nemotron-3-super-120b-a12b:free"]);
  });

  it("skips entries with nothing in the catalog", () => {
    expect(resolveCuratedIds([model("other/thing")])).toEqual([]);
  });
});
