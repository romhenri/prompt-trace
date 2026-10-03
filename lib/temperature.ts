/**
 * Temperature sweep: one prompt on one model at several temperatures, to see
 * how much the output moves as randomness goes up.
 */

export const MAX_TEMPERATURES = 6;
const MAX_TEMPERATURE = 2;

/** Reads "0, 0.5, 1" into clean, sorted, unique values within the API's range. */
export function parseTemperatures(raw: string): number[] {
  const values = raw
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite)
    .map((value) => Math.min(MAX_TEMPERATURE, Math.max(0, value)));
  return [...new Set(values)].sort((a, b) => a - b).slice(0, MAX_TEMPERATURES);
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []);
}

/** Share of distinct words two texts have in common, 0 to 1 (Jaccard). */
export function overlap(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  const union = new Set([...wa, ...wb]).size;
  if (union === 0) return 1;
  let shared = 0;
  for (const word of wa) if (wb.has(word)) shared++;
  return shared / union;
}
