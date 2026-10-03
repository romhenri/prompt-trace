/**
 * A conversation between models: they take turns in a fixed order, and each
 * one sees the topic and the whole transcript so far, so the reply it writes
 * answers what the others actually said.
 */
import type { ChatMessage } from "./openrouter/types";

export interface Participant {
  modelId: string | null;
  role: string;
}

export interface Turn {
  /** Index into the participants list. */
  speaker: number;
  text: string;
}

export const PRESETS = [
  {
    name: "Debate",
    roles: [
      "Argue strongly in favour of the topic.",
      "Argue strongly against the topic and rebut the previous message.",
      "Judge. Weigh both sides fairly and say who is winning and why.",
    ],
  },
  {
    name: "Writer and editor",
    roles: [
      "Writer. Draft, then rewrite the text applying the editor's notes.",
      "Editor. Give three sharp, specific notes on the latest draft.",
    ],
  },
  {
    name: "Brainstorm",
    roles: [
      "Take the latest idea and expand it with one concrete new angle.",
      "Take the latest idea and expand it with one concrete new angle.",
      "Skeptic. Point out the weakest part of the latest idea and fix it.",
    ],
  },
  {
    name: "Interview",
    roles: [
      "Interviewer. Ask one probing follow-up question.",
      "Expert. Answer the latest question directly and concretely.",
    ],
  },
] as const;

/** Round-robin speaker indices: every participant speaks once per round. */
export function turnOrder(participants: number, rounds: number): number[] {
  return Array.from(
    { length: participants * rounds },
    (_, i) => i % participants,
  );
}

/** Roles may repeat, so the number keeps speakers apart in the transcript. */
export function speakerLabel(participants: Participant[], index: number) {
  const role = participants[index].role.trim().split(/[.:]/)[0].slice(0, 30);
  return `Agent ${index + 1}${role ? ` (${role})` : ""}`;
}

export function buildTurnMessages(
  topic: string,
  participants: Participant[],
  transcript: Turn[],
  speaker: number,
): ChatMessage[] {
  const history = transcript
    .map((turn) => `${speakerLabel(participants, turn.speaker)}: ${turn.text}`)
    .join("\n\n");
  return [
    {
      role: "system",
      content: `You are ${speakerLabel(participants, speaker)} in a conversation between AI agents. Your role: ${participants[speaker].role.trim() || "take part naturally."}
Reply with your next message only, under 150 words, without a speaker label.`,
    },
    {
      role: "user",
      content: `Topic: ${topic.trim()}

Conversation so far:
${history || "(nothing yet, you speak first)"}

Write your next message.`,
    },
  ];
}
