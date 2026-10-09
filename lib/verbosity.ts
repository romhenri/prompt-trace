import type { ChatMessage } from "./openrouter/types";

/**
 * What a service produces. Only `text` is free prose a verbosity style can
 * shape; the others have a format of their own that a style would fight.
 */
export type OutputType = "text" | "decision" | "prompt" | "translation";

export const SERVICE_OUTPUT_TYPE = {
  compare: "text",
  experiment: "text",
  temperature: "text",
  agents: "text",
  prompted: "text",
  ats: "decision",
  judge: "decision",
  generate: "prompt",
  backtranslate: "translation",
} as const satisfies Record<string, OutputType>;

export type ServiceId = keyof typeof SERVICE_OUTPUT_TYPE;

export function supportsVerbosity(service: ServiceId): boolean {
  return SERVICE_OUTPUT_TYPE[service] === "text";
}

export type VerbosityId = "one-liner" | "tldr" | "bluf" | "deep-dive";

export interface VerbosityStyle {
  id: VerbosityId;
  label: string;
  description: string;
  /** Appended to the system prompt. */
  prompt: string;
}

export const VERBOSITY_STYLES: readonly VerbosityStyle[] = [
  {
    id: "one-liner",
    label: "One-liner",
    description: "A single line or sentence.",
    prompt: `Answer in exactly one sentence, on a single line. Go straight to the answer, with no introduction, no restating the question, no closing summary and no offer of further help. Do not use lists or headings.`,
  },
  {
    id: "tldr",
    label: "TL;DR",
    description: "An ultra-short summary of what matters.",
    prompt: `Answer in at most 2 sentences. Go straight to the answer, with no introduction, no restating the question, no closing summary and no offer of further help. Do not use lists or headings unless I ask.`,
  },
  {
    id: "bluf",
    label: "BLUF",
    description: "Bottom line up front, then details if any.",
    prompt: `Lead with the bottom line: put the conclusion or answer in the first sentence. Only then give the supporting detail, as briefly as it allows, and stop once it is covered. If nothing needs adding, stop after the conclusion. No introduction and no restating the question.`,
  },
  {
    id: "deep-dive",
    label: "Deep dive",
    description: "A long, in-depth answer.",
    prompt: `Give a long, in-depth answer. Cover the reasoning, the underlying mechanisms, trade-offs, edge cases and concrete examples. Use headings and lists where they help the reader, and be rigorous rather than padded.`,
  },
];

/**
 * Adds the chosen style to the system prompt, appending to an existing one so
 * the user's own instructions survive. Returns the input as is for no style.
 */
export function withVerbosity(
  messages: ChatMessage[],
  style: VerbosityId | null,
): ChatMessage[] {
  if (style === null) return messages;
  const prompt = VERBOSITY_STYLES.find((s) => s.id === style)?.prompt;
  if (!prompt) return messages;

  const [first, ...rest] = messages;
  if (first?.role === "system" && typeof first.content === "string") {
    return [
      { role: "system", content: `${first.content}\n\n${prompt}` },
      ...rest,
    ];
  }
  return [{ role: "system", content: prompt }, ...messages];
}
