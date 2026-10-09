import type { OpenRouterModel } from "./types";

function entry(id: string, name: string, context: number): OpenRouterModel {
  // "-1" is OpenRouter's own "price not stated" marker, so cost shows as n/a
  // instead of an invented number.
  return {
    id,
    name,
    context_length: context,
    pricing: { prompt: "-1", completion: "-1" },
  };
}

/**
 * A short list shown only when the live catalog cannot be fetched and there is
 * no cached copy, so the app stays usable. Ids may drift from the live catalog;
 * a failed request later surfaces that.
 */
export const FALLBACK_MODELS: readonly OpenRouterModel[] = [
  entry(
    "anthropic/claude-sonnet-4.5",
    "Anthropic: Claude Sonnet 4.5",
    1_000_000,
  ),
  entry("anthropic/claude-haiku-4.5", "Anthropic: Claude Haiku 4.5", 200_000),
  entry("openai/gpt-5", "OpenAI: GPT-5", 400_000),
  entry("openai/gpt-5-mini", "OpenAI: GPT-5 Mini", 400_000),
  entry("google/gemini-2.5-pro", "Google: Gemini 2.5 Pro", 1_048_576),
  entry("google/gemini-2.5-flash", "Google: Gemini 2.5 Flash", 1_048_576),
  entry("deepseek/deepseek-chat-v3.1", "DeepSeek: DeepSeek V3.1", 163_840),
  entry(
    "meta-llama/llama-3.3-70b-instruct",
    "Meta: Llama 3.3 70B Instruct",
    131_072,
  ),
];
