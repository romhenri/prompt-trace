import { describe, expect, it } from "vitest";
import { buildGeneratorPrompt, extractFencedPrompt } from "./generator";

describe("buildGeneratorPrompt", () => {
  it("names the target model so the output is tuned to it", () => {
    const prompt = buildGeneratorPrompt({
      task: "summarise support tickets",
      promptStyle: "system prompt",
      targetModel: "anthropic/claude-haiku-4.5",
    });
    expect(prompt).toContain("anthropic/claude-haiku-4.5");
  });

  it("omits optional sections that were left blank", () => {
    const prompt = buildGeneratorPrompt({
      task: "summarise support tickets",
      promptStyle: "user prompt",
      context: "   ",
    });
    expect(prompt).not.toContain("Background and audience");
    expect(prompt).not.toContain("Constraints (tone");
  });

  it("includes optional sections that were filled in", () => {
    const prompt = buildGeneratorPrompt({
      task: "summarise support tickets",
      promptStyle: "user prompt",
      context: "B2B SaaS helpdesk",
      constraints: "under 200 words",
    });
    expect(prompt).toContain("B2B SaaS helpdesk");
    expect(prompt).toContain("under 200 words");
  });
});

describe("extractFencedPrompt", () => {
  it("returns just the contents of a closed fence", () => {
    expect(extractFencedPrompt("blah\n```text\nthe prompt\n```\ntrailing")).toBe(
      "the prompt",
    );
  });

  it("returns what has arrived so far while the fence is still open", () => {
    expect(extractFencedPrompt("```text\nhalf of the pro")).toBe(
      "half of the pro",
    );
  });

  it("falls back to the raw text when the model ignored the fence", () => {
    expect(extractFencedPrompt("  no fence here  ")).toBe("no fence here");
  });

  it("handles a fence with no language tag", () => {
    expect(extractFencedPrompt("```\nthe prompt\n```")).toBe("the prompt");
  });
});
