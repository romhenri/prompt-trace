/**
 * Round-trip translation: text goes A to B and back to A, repeated. Each hop
 * is translated from the previous hop's output, so meaning drift compounds
 * and shows up in the text that comes back.
 */

export interface Hop {
  from: string;
  to: string;
}

/** `rounds` round trips become 2 * rounds hops, alternating A to B, B to A. */
export function planHops(a: string, b: string, rounds: number): Hop[] {
  return Array.from({ length: rounds }, () => [
    { from: a, to: b },
    { from: b, to: a },
  ]).flat();
}

export function buildTranslatePrompt(text: string, hop: Hop): string {
  return `Translate the following text from ${hop.from} to ${hop.to}. Reply with the translation only, no notes, no quotes, no commentary.

${text.trim()}`;
}
