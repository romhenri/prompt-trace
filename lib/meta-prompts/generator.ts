import type { PromptStyle } from "@/store/app-store";

export interface GeneratorInput {
  /** What the finished prompt should accomplish. Required. */
  task: string;
  context?: string;
  outputFormat?: string;
  constraints?: string;
  promptStyle: PromptStyle;
  /** Id of the model the generated prompt is meant to be run against. */
  targetModel?: string | null;
}

const STYLE_BRIEF: Record<PromptStyle, string> = {
  "system prompt":
    "a system prompt: it sets persistent role, rules and behaviour for an assistant, and is written in the second person to that assistant.",
  "user prompt":
    "a user prompt: a single self-contained request that a person would send in one turn.",
  "agent instructions":
    "agent instructions: an operating manual for a tool-using autonomous agent, covering when to act, when to stop, and how to handle failure.",
};

/** The fenced block we parse the finished prompt back out of. */
export const OUTPUT_FENCE = "```";

function section(heading: string, body: string | undefined | null): string {
  const value = body?.trim();
  return value ? `\n${heading}:\n${value}\n` : "";
}

/**
 * Builds the instruction we send to the generator model. Kept as a plain
 * template function so it is cheap to iterate on.
 */
export function buildGeneratorPrompt(input: GeneratorInput): string {
  return `You are a prompt engineer. Write one production-ready prompt for another person to use. You are not answering the task yourself.

What the finished prompt must accomplish:
${input.task.trim()}
${section("Background and audience", input.context)}${section("Required output format", input.outputFormat)}${section("Constraints (tone, length, things to avoid)", input.constraints)}
The finished prompt is ${STYLE_BRIEF[input.promptStyle]}
${
  input.targetModel
    ? `It will be run against the model \`${input.targetModel}\`. Tune the wording, structure and level of explicitness to that model's strengths.\n`
    : ""
}
Structure the finished prompt with these parts, in this order, using plain headings:
1. Role and objective — who the model is and what success looks like.
2. Context — the background it needs, stated as fact.
3. Instructions — numbered, concrete, ordered steps.
4. Constraints — hard rules, including what not to do.
5. Output format — exactly what the response must look like.
6. Examples — one or two short few-shot examples, but only where they remove real ambiguity. Omit this part entirely if they would not.

Rules for your reply:
- Reply with the finished prompt and nothing else.
- Put it inside a single fenced code block, opened with ${OUTPUT_FENCE}text and closed with ${OUTPUT_FENCE}.
- Write no commentary, preamble or explanation outside that block.
- Do not wrap any nested fenced block inside it; use indentation for embedded examples instead.`;
}

/**
 * Pulls the prompt out of the model's fenced reply. Falls back to the raw
 * text so a model that ignores the fence still produces something usable.
 */
export function extractFencedPrompt(raw: string): string {
  const match = raw.match(/```[^\n]*\n([\s\S]*?)```/);
  if (match) return match[1].trim();

  // Streaming, or an unclosed fence: take everything after the opening one.
  const opening = raw.match(/```[^\n]*\n/);
  if (opening) return raw.slice(opening.index! + opening[0].length).trim();

  return raw.trim();
}
