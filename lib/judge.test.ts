import { describe, expect, it } from "vitest";
import { buildChallengerMessages, parseJudgment, passed } from "./judge";

describe("parseJudgment", () => {
  it("reads a fenced verdict and clamps the score", () => {
    expect(
      parseJudgment('```json\n{"score": 140, "pass": true, "feedback": "ok"}\n```'),
    ).toEqual({ score: 100, pass: true, feedback: "ok" });
  });

  it("returns null without a score", () => {
    expect(parseJudgment('{"pass": true}')).toBeNull();
    expect(parseJudgment("no json here")).toBeNull();
  });
});

describe("passed", () => {
  const j = { score: 70, pass: false, feedback: "" };
  it("lets the judge decide without a minimum", () => {
    expect(passed(j, null)).toBe(false);
  });
  it("lets the score decide with a minimum", () => {
    expect(passed(j, 70)).toBe(true);
    expect(passed(j, 71)).toBe(false);
  });
});

describe("buildChallengerMessages", () => {
  it("feeds the last attempt and feedback into a retry", () => {
    const [, first] = buildChallengerMessages("Write a haiku", "5-7-5");
    expect(first.content).not.toContain("rejected");
    const [, retry] = buildChallengerMessages("Write a haiku", "5-7-5", {
      text: "old try",
      judgment: { score: 40, pass: false, feedback: "wrong syllables" },
    });
    expect(retry.content).toContain("old try");
    expect(retry.content).toContain("wrong syllables");
  });
});
