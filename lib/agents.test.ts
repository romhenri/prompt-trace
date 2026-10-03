import { describe, expect, it } from "vitest";
import { buildTurnMessages, turnOrder, type Participant } from "./agents";

const people: Participant[] = [
  { modelId: "a/x", role: "Pro. Argue for." },
  { modelId: "b/y", role: "Con. Argue against." },
];

describe("turnOrder", () => {
  it("lets everyone speak once per round, in order", () => {
    expect(turnOrder(2, 2)).toEqual([0, 1, 0, 1]);
  });
});

describe("buildTurnMessages", () => {
  it("tells the first speaker nothing was said yet", () => {
    const [, user] = buildTurnMessages("Tabs or spaces", people, [], 0);
    expect(user.content).toContain("you speak first");
  });

  it("shows the next speaker what the first one said", () => {
    const [system, user] = buildTurnMessages(
      "Tabs or spaces",
      people,
      [{ speaker: 0, text: "Tabs, obviously." }],
      1,
    );
    expect(system.content).toContain("Agent 2 (Con)");
    expect(user.content).toContain("Agent 1 (Pro): Tabs, obviously.");
  });
});
