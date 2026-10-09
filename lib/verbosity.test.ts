import { describe, expect, it } from "vitest";
import type { ChatMessage } from "./openrouter/types";
import {
  SERVICE_OUTPUT_TYPE,
  VERBOSITY_STYLES,
  supportsVerbosity,
  withVerbosity,
} from "./verbosity";

const user: ChatMessage = { role: "user", content: "hi" };

describe("withVerbosity", () => {
  it("returns the messages untouched when no style is chosen", () => {
    const messages = [user];
    expect(withVerbosity(messages, null)).toBe(messages);
  });

  it("adds a system message when there is none", () => {
    const out = withVerbosity([user], "tldr");
    expect(out).toHaveLength(2);
    expect(out[0].role).toBe("system");
    expect(out[0].content).toBe(
      VERBOSITY_STYLES.find((s) => s.id === "tldr")!.prompt,
    );
    expect(out[1]).toBe(user);
  });

  it("appends to an existing system message instead of replacing it", () => {
    const system: ChatMessage = { role: "system", content: "Be a pirate." };
    const out = withVerbosity([system, user], "bluf");
    expect(out).toHaveLength(2);
    expect(String(out[0].content).startsWith("Be a pirate.\n\n")).toBe(true);
    expect(String(out[0].content)).toContain("bottom line");
  });

  it("does not mutate its input", () => {
    const system: ChatMessage = { role: "system", content: "Be a pirate." };
    withVerbosity([system, user], "one-liner");
    expect(system.content).toBe("Be a pirate.");
  });
});

describe("VERBOSITY_STYLES", () => {
  it("has the four styles with unique ids and non-empty prompts", () => {
    expect(VERBOSITY_STYLES.map((s) => s.id)).toEqual([
      "one-liner",
      "tldr",
      "bluf",
      "deep-dive",
    ]);
    for (const s of VERBOSITY_STYLES) {
      expect(s.label.trim()).not.toBe("");
      expect(s.prompt.trim()).not.toBe("");
    }
  });
});

describe("supportsVerbosity", () => {
  it("applies to free-text services only", () => {
    expect(supportsVerbosity("compare")).toBe(true);
    expect(supportsVerbosity("prompted")).toBe(true);
    expect(supportsVerbosity("ats")).toBe(false);
    expect(supportsVerbosity("judge")).toBe(false);
    expect(SERVICE_OUTPUT_TYPE.ats).toBe("decision");
  });
});
