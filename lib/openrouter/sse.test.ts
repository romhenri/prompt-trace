import { describe, expect, it } from "vitest";
import { parseSseBuffer } from "./sse";

describe("parseSseBuffer", () => {
  it("returns one payload per complete event", () => {
    const { events, rest } = parseSseBuffer('data: {"a":1}\n\ndata: {"a":2}\n\n');
    expect(events).toEqual(['{"a":1}', '{"a":2}']);
    expect(rest).toBe("");
  });

  it("holds a half-arrived event back in rest until it completes", () => {
    const first = parseSseBuffer('data: {"a":1}\n\ndata: {"a":');
    expect(first.events).toEqual(['{"a":1}']);
    expect(first.rest).toBe('data: {"a":');

    const second = parseSseBuffer(first.rest + '2}\n\n');
    expect(second.events).toEqual(['{"a":2}']);
    expect(second.rest).toBe("");
  });

  it("handles CRLF line endings", () => {
    const { events } = parseSseBuffer('data: {"a":1}\r\n\r\n');
    expect(events).toEqual(['{"a":1}']);
  });

  it("skips OpenRouter's comment keepalives", () => {
    const { events } = parseSseBuffer(
      ': OPENROUTER PROCESSING\n\ndata: {"a":1}\n\n',
    );
    expect(events).toEqual(['{"a":1}']);
  });

  it("joins multi-line data fields with newlines, per the SSE spec", () => {
    const { events } = parseSseBuffer("data: line one\ndata: line two\n\n");
    expect(events).toEqual(["line one\nline two"]);
  });

  it("ignores non-data fields such as event and id", () => {
    const { events } = parseSseBuffer("event: message\nid: 7\ndata: hi\n\n");
    expect(events).toEqual(["hi"]);
  });

  it("passes the [DONE] sentinel through for the caller to act on", () => {
    const { events } = parseSseBuffer("data: [DONE]\n\n");
    expect(events).toEqual(["[DONE]"]);
  });

  it("tolerates a data field with no space after the colon", () => {
    const { events } = parseSseBuffer("data:hi\n\n");
    expect(events).toEqual(["hi"]);
  });

  it("emits nothing for an empty buffer", () => {
    expect(parseSseBuffer("")).toEqual({ events: [], rest: "" });
  });
});
