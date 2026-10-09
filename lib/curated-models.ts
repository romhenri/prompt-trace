import type { OpenRouterModel } from "./openrouter/types";

interface CuratedEntry {
  label: string;
  /** In preference order; a string is an exact id, a RegExp matches an id. */
  candidates: (string | RegExp)[];
}

/**
 * Hand-picked favourites. Ids drift as providers ship new versions, so each
 * entry lists fallbacks and is resolved against the live catalog instead of
 * being hard-wired. Edit this list to change the picks.
 */
export const CURATED: readonly CuratedEntry[] = [
  {
    label: "Nemotron 3 Super (free)",
    candidates: [/nemotron-3-super.*:free$/],
  },
  {
    label: "DeepSeek, best value",
    candidates: [
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-chat-v3.1",
      "deepseek/deepseek-chat",
    ],
  },
  {
    label: "Gemini, best value",
    candidates: ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"],
  },
  {
    label: "GPT (free)",
    candidates: ["openai/gpt-oss-120b:free", "openai/gpt-oss-20b:free"],
  },
];

/** The catalog ids the curated entries currently resolve to. */
export function resolveCuratedIds(models: OpenRouterModel[]): string[] {
  const ids = models.map((m) => m.id);
  const resolved: string[] = [];
  for (const entry of CURATED) {
    for (const candidate of entry.candidates) {
      const hit =
        typeof candidate === "string"
          ? ids.find((id) => id === candidate)
          : ids.find((id) => candidate.test(id));
      if (hit) {
        resolved.push(hit);
        break;
      }
    }
  }
  return resolved;
}
