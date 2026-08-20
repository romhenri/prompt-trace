import { describe, expect, it } from "vitest";
import { estimateCost, formatUsd, pricePerMillion } from "./cost";
import type { OpenRouterModel } from "./openrouter/types";

function model(prompt: string, completion: string): OpenRouterModel {
  return {
    id: "test/model",
    name: "Test Model",
    context_length: 1000,
    pricing: { prompt, completion },
  };
}

describe("pricePerMillion", () => {
  it("scales a per-token price up to a per-million price", () => {
    expect(pricePerMillion("0.000003")).toBe(3);
  });

  it("treats free models as zero", () => {
    expect(pricePerMillion("0")).toBe(0);
  });

  it("returns null for the -1 variable-pricing sentinel", () => {
    expect(pricePerMillion("-1")).toBeNull();
  });

  it("returns null for missing or unparseable prices", () => {
    expect(pricePerMillion(undefined)).toBeNull();
    expect(pricePerMillion("")).toBeNull();
    expect(pricePerMillion("free")).toBeNull();
  });
});

describe("estimateCost", () => {
  it("charges prompt and completion tokens at their own rates", () => {
    const usage = { prompt_tokens: 1000, completion_tokens: 500 };
    // 1000 * 3e-6 + 500 * 15e-6 = 0.003 + 0.0075
    expect(estimateCost(model("0.000003", "0.000015"), usage)).toBeCloseTo(
      0.0105,
      10,
    );
  });

  it("is zero for a free model", () => {
    expect(
      estimateCost(model("0", "0"), {
        prompt_tokens: 900,
        completion_tokens: 100,
      }),
    ).toBe(0);
  });

  it("returns null when the model is not in the catalog", () => {
    expect(
      estimateCost(undefined, { prompt_tokens: 1, completion_tokens: 1 }),
    ).toBeNull();
  });

  it("returns null when usage was never reported", () => {
    expect(estimateCost(model("0.000003", "0.000015"), undefined)).toBeNull();
  });

  it("returns null when either side has variable pricing", () => {
    const usage = { prompt_tokens: 10, completion_tokens: 10 };
    expect(estimateCost(model("-1", "0.000015"), usage)).toBeNull();
    expect(estimateCost(model("0.000003", "-1"), usage)).toBeNull();
  });
});

describe("formatUsd", () => {
  it("keeps sub-cent amounts readable instead of rounding them to $0.00", () => {
    expect(formatUsd(0.0000123)).toBe("$0.0000123");
  });

  it("uses two decimals once the amount is at least a cent", () => {
    expect(formatUsd(1.2345)).toBe("$1.23");
    expect(formatUsd(0.01)).toBe("$0.01");
  });

  it("prints exact zero plainly", () => {
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("shows an em-free placeholder when there is nothing to show", () => {
    expect(formatUsd(null)).toBe("n/a");
  });
});
