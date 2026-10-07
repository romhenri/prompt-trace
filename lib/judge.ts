/**
 * Judge brute force: a challenger model keeps rewriting its answer until a
 * judge model says it meets the requirement, or the rounds run out. Each
 * rewrite sees its last attempt and the judge's feedback on it.
 */
import type { ChatMessage } from "./openrouter/types";

export interface Judgment {
  /** 0 to 100. */
  score: number;
  pass: boolean;
  feedback: string;
}

export interface Attempt {
  text: string;
  judgment: Judgment | null;
}

export function buildChallengerMessages(
  task: string,
  requirement: string,
  previous?: Attempt,
): ChatMessage[] {
  const retry = previous?.judgment
    ? `

Your previous attempt was rejected.

Previous attempt:
${previous.text}

Judge's feedback (score ${previous.judgment.score}/100):
${previous.judgment.feedback}

Rethink it and rewrite it from scratch so it fixes every point above.`
    : "";
  return [
    {
      role: "system",
      content:
        "You produce work that a strict judge will grade against a requirement. Reply with the work only, no preamble and no commentary about it.",
    },
    {
      role: "user",
      content: `Task:
${task.trim()}

Requirement the judge will check:
${requirement.trim()}${retry}`,
    },
  ];
}

export function buildJudgeMessages(
  task: string,
  requirement: string,
  attempt: string,
  minScore: number | null,
): ChatMessage[] {
  const rule =
    minScore === null
      ? "Set pass to true only if the work fully meets the requirement."
      : `The work passes only with a score of ${minScore} or more, so score carefully.`;
  return [
    {
      role: "system",
      content: "You are a strict, fair judge. You never do the work yourself.",
    },
    {
      role: "user",
      content: `Task given to the writer:
${task.trim()}

Requirement:
${requirement.trim()}

Work to judge:
${attempt}

Score how well the work meets the requirement, from 0 to 100. ${rule}
If it falls short, the feedback must say exactly what to change.

Reply with one JSON object and nothing else, no prose and no code fence:
{"score": <integer 0-100>, "pass": <true|false>, "feedback": "<what is missing or wrong, at most three sentences>"}`,
    },
  ];
}

/**
 * Takes the widest brace-delimited span, since models wrap JSON in fences
 * and commentary anyway. Null if there is no usable verdict.
 */
export function parseJudgment(raw: string): Judgment | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let record: Record<string, unknown>;
  try {
    record = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  const score = Number(record?.score);
  if (!Number.isFinite(score)) return null;
  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    pass: record.pass === true,
    feedback: typeof record.feedback === "string" ? record.feedback : "",
  };
}

/** With a minimum score the number decides; without one the judge does. */
export function passed(judgment: Judgment, minScore: number | null) {
  return minScore === null ? judgment.pass : judgment.score >= minScore;
}
