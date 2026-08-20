"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { streamChatCompletion } from "./openrouter/client";
import {
  OpenRouterError,
  type ChatMessage,
  type OpenRouterErrorKind,
  type TokenUsage,
} from "./openrouter/types";

export type RunStatus = "queued" | "streaming" | "done" | "error" | "cancelled";

export interface ColumnRun {
  modelId: string;
  status: RunStatus;
  text: string;
  error: string | null;
  errorKind: OpenRouterErrorKind | null;
  /** Time to first token, ms. Null until a token arrives. */
  ttftMs: number | null;
  /** Wall time from request to stream end, ms. */
  totalMs: number | null;
  usage: TokenUsage | null;
}

export interface RunRequest {
  apiKey: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

function blankRun(modelId: string): ColumnRun {
  return {
    modelId,
    status: "queued",
    text: "",
    error: null,
    errorKind: null,
    ttftMs: null,
    totalMs: null,
    usage: null,
  };
}

/**
 * Runs one prompt across several models in parallel, each stream independent:
 * cancelling or failing one column never touches the others.
 *
 * Token deltas are buffered and flushed once per animation frame, so six
 * simultaneous streams cost one render per frame instead of one per token.
 */
export function useModelRuns() {
  const [runs, setRuns] = useState<ColumnRun[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const pending = useRef(new Map<string, string>());
  const frame = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    if (pending.current.size === 0) return;
    const deltas = new Map(pending.current);
    pending.current.clear();
    setRuns((prev) =>
      prev.map((run) => {
        const delta = deltas.get(run.modelId);
        return delta === undefined ? run : { ...run, text: run.text + delta };
      }),
    );
  }, []);

  const queueDelta = useCallback(
    (modelId: string, text: string) => {
      pending.current.set(modelId, (pending.current.get(modelId) ?? "") + text);
      frame.current ??= requestAnimationFrame(flush);
    },
    [flush],
  );

  const patch = useCallback((modelId: string, changes: Partial<ColumnRun>) => {
    setRuns((prev) =>
      prev.map((run) =>
        run.modelId === modelId ? { ...run, ...changes } : run,
      ),
    );
  }, []);

  const runOne = useCallback(
    async (modelId: string, request: RunRequest) => {
      controllers.current.get(modelId)?.abort();
      const controller = new AbortController();
      controllers.current.set(modelId, controller);

      const startedAt = performance.now();
      let firstTokenAt: number | null = null;
      let usage: TokenUsage | null = null;

      try {
        await streamChatCompletion({
          apiKey: request.apiKey,
          model: modelId,
          messages: request.messages,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          signal: controller.signal,
          onDelta: (text) => {
            if (firstTokenAt === null) {
              firstTokenAt = performance.now();
              patch(modelId, {
                status: "streaming",
                ttftMs: firstTokenAt - startedAt,
              });
            }
            queueDelta(modelId, text);
          },
          onUsage: (next) => {
            usage = next;
          },
        });
        flush();
        patch(modelId, {
          status: "done",
          totalMs: performance.now() - startedAt,
          usage,
        });
      } catch (error) {
        flush();
        const openRouterError =
          error instanceof OpenRouterError
            ? error
            : new OpenRouterError("unknown", String(error));
        patch(modelId, {
          status: openRouterError.kind === "aborted" ? "cancelled" : "error",
          error: openRouterError.message,
          errorKind: openRouterError.kind,
          totalMs: performance.now() - startedAt,
          usage,
        });
      } finally {
        controllers.current.delete(modelId);
      }
    },
    [flush, patch, queueDelta],
  );

  /** Starts a fresh set of columns, replacing anything already running. */
  const start = useCallback(
    (modelIds: string[], request: RunRequest) => {
      for (const controller of controllers.current.values()) controller.abort();
      controllers.current.clear();
      pending.current.clear();
      setRuns(modelIds.map(blankRun));
      for (const modelId of modelIds) void runOne(modelId, request);
    },
    [runOne],
  );

  const rerun = useCallback(
    (modelId: string, request: RunRequest) => {
      pending.current.delete(modelId);
      setRuns((prev) =>
        prev.map((run) => (run.modelId === modelId ? blankRun(modelId) : run)),
      );
      void runOne(modelId, request);
    },
    [runOne],
  );

  const cancel = useCallback((modelId: string) => {
    controllers.current.get(modelId)?.abort();
  }, []);

  const cancelAll = useCallback(() => {
    for (const controller of controllers.current.values()) controller.abort();
  }, []);

  const clear = useCallback(() => {
    for (const controller of controllers.current.values()) controller.abort();
    controllers.current.clear();
    pending.current.clear();
    setRuns([]);
  }, []);

  // Leaving the page must not leave streams billing against the user's key.
  useEffect(() => {
    const inFlight = controllers.current;
    return () => {
      for (const controller of inFlight.values()) controller.abort();
    };
  }, []);

  const busy = runs.some(
    (run) => run.status === "queued" || run.status === "streaming",
  );

  return { runs, busy, start, rerun, cancel, cancelAll, clear };
}
