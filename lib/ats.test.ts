import { describe, expect, it } from "vitest";
import { buildAtsPrompt, consensus, parseVerdict } from "./ats";

describe("buildAtsPrompt", () => {
  it("includes the job description when given one", () => {
    expect(buildAtsPrompt("resume text", "Senior Go engineer")).toContain(
      "Senior Go engineer",
    );
  });

  it("says so when there is no job description", () => {
    expect(buildAtsPrompt("resume text", "  ")).toContain(
      "No job description was supplied",
    );
  });
});

describe("parseVerdict", () => {
  it("reads a bare JSON reply", () => {
    const verdict = parseVerdict(
      '{"score": 72, "summary": "solid", "strengths": ["impact"], "gaps": ["no metrics"]}',
    );
    expect(verdict).toEqual({
      score: 72,
      summary: "solid",
      strengths: ["impact"],
      gaps: ["no metrics"],
    });
  });

  it("digs the object out of fences and commentary", () => {
    const verdict = parseVerdict(
      'Sure!\n```json\n{"score": 40, "summary": "thin"}\n```\nHope that helps',
    );
    expect(verdict?.score).toBe(40);
    expect(verdict?.summary).toBe("thin");
  });

  it("clamps and rounds out-of-range scores", () => {
    expect(parseVerdict('{"score": 130.6}')?.score).toBe(100);
    expect(parseVerdict('{"score": -5}')?.score).toBe(0);
    expect(parseVerdict('{"score": "83"}')?.score).toBe(83);
  });

  it("returns null for a half-streamed or scoreless reply", () => {
    expect(parseVerdict('{"score": 7')).toBeNull();
    expect(parseVerdict("thinking about it")).toBeNull();
    expect(parseVerdict('{"summary": "nice"}')).toBeNull();
  });

  it("drops non-string list items instead of trusting them", () => {
    expect(
      parseVerdict('{"score": 50, "strengths": ["a", 3], "gaps": "no"}'),
    ).toEqual({ score: 50, summary: "", strengths: ["a"], gaps: [] });
  });
});

describe("consensus", () => {
  it("summarises agreement across models", () => {
    expect(consensus([80, 60, 70])).toEqual({
      count: 3,
      mean: 70,
      min: 60,
      max: 80,
      spread: 20,
    });
  });

  it("has nothing to say about no scores", () => {
    expect(consensus([])).toBeNull();
  });
});
