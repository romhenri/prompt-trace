/**
 * Minimal SSE frame parser. Splits a rolling buffer on blank lines and
 * returns the `data:` payload of each complete event, keeping whatever is
 * left mid-frame in `rest` for the next chunk.
 *
 * Comment lines (OpenRouter sends `: OPENROUTER PROCESSING` keepalives) and
 * non-data fields are dropped; the `[DONE]` sentinel is passed straight
 * through so the caller decides what it means.
 */
export function parseSseBuffer(buffer: string): {
  events: string[];
  rest: string;
} {
  const normalised = buffer.replace(/\r\n/g, "\n");
  const frames = normalised.split("\n\n");
  const rest = frames.pop() ?? "";

  const events: string[] = [];
  for (const frame of frames) {
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).replace(/^ /, ""))
      .join("\n");
    if (data !== "") events.push(data);
  }

  return { events, rest };
}
