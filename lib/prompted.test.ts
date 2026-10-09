import { describe, expect, it } from "vitest";
import { PROMPTED_SERVICES, getPromptedService } from "./prompted";

describe("PROMPTED_SERVICES", () => {
  it("has unique, url-safe slugs", () => {
    const slugs = PROMPTED_SERVICES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("gives every service a non-empty prompt and copy", () => {
    for (const s of PROMPTED_SERVICES) {
      expect(s.title.trim()).not.toBe("");
      expect(s.description.trim()).not.toBe("");
      expect(s.systemPrompt.trim()).not.toBe("");
      expect(s.inputLabel.trim()).not.toBe("");
    }
  });
});

describe("getPromptedService", () => {
  it("finds a service by slug", () => {
    const first = PROMPTED_SERVICES[0];
    expect(getPromptedService(first.slug)).toBe(first);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getPromptedService("nope")).toBeUndefined();
  });
});
