import type { OpenRouterModel, TokenUsage } from "./openrouter/types";

/**
 * OpenRouter quotes prices in USD per token as strings, and uses "-1" for
 * models whose price it cannot state up front. Returns the price per 1M
 * tokens, or null when there is no usable number.
 */
export function pricePerMillion(price: string | undefined): number | null {
  if (price === undefined || price === "") return null;
  const perToken = Number(price);
  if (!Number.isFinite(perToken) || perToken < 0) return null;
  return perToken * 1_000_000;
}

/**
 * Estimated USD for one completion. Null whenever we cannot be honest about
 * the number: unknown model, no reported usage, or variable pricing.
 */
export function estimateCost(
  model: OpenRouterModel | undefined,
  usage: TokenUsage | undefined,
): number | null {
  if (!model || !usage) return null;
  const prompt = pricePerMillion(model.pricing?.prompt);
  const completion = pricePerMillion(model.pricing?.completion);
  if (prompt === null || completion === null) return null;
  return (
    (usage.prompt_tokens * prompt + usage.completion_tokens * completion) /
    1_000_000
  );
}

/** Sub-cent costs are the common case here, so don't round them away. */
export function formatUsd(amount: number | null): string {
  if (amount === null) return "n/a";
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toPrecision(3).replace(/0+$/, "")}`;
  return `$${amount.toFixed(2)}`;
}
