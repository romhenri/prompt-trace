import { describe, expect, it } from "vitest";
import { buildTranslatePrompt, planHops } from "./backtranslate";

describe("planHops", () => {
  it("alternates A to B and B to A, ending back on A", () => {
    expect(planHops("English", "French", 2)).toEqual([
      { from: "English", to: "French" },
      { from: "French", to: "English" },
      { from: "English", to: "French" },
      { from: "French", to: "English" },
    ]);
  });
});

describe("buildTranslatePrompt", () => {
  it("names both languages and carries the text", () => {
    const prompt = buildTranslatePrompt(" hello ", {
      from: "English",
      to: "German",
    });
    expect(prompt).toContain("from English to German");
    expect(prompt.endsWith("hello")).toBe(true);
  });
});
