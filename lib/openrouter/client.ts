import { parseSseBuffer } from "./sse";
import {
  OpenRouterError,
  type ChatMessage,
  type OpenRouterKeyInfo,
  type OpenRouterModel,
  type TokenUsage,
} from "./types";

/** The only host this app ever talks to. */
export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

function headers(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer":
      typeof window === "undefined" ? "" : window.location.origin,
    "X-Title": "Prompt Forge",
    "Content-Type": "application/json",
  };
}

/** Turns a failed response into an error the UI can phrase for a human. */
async function toError(response: Response): Promise<OpenRouterError> {
  let message = response.statusText || `HTTP ${response.status}`;
  try {
    const body = await response.json();
    if (body?.error?.message) message = body.error.message;
  } catch {
    // Non-JSON error body; the status line is all we have.
  }

  switch (response.status) {
    case 401:
    case 403:
      return new OpenRouterError(
        "unauthorized",
        `Your OpenRouter key was rejected. ${message}`,
        response.status,
      );
    case 402:
      return new OpenRouterError(
        "no_credits",
        `Not enough OpenRouter credits for this request. ${message}`,
        response.status,
      );
    case 429:
      return new OpenRouterError(
        "rate_limited",
        `Rate limited by OpenRouter. Wait a moment and retry. ${message}`,
        response.status,
      );
    default:
      return new OpenRouterError("unknown", message, response.status);
  }
}

function toNetworkError(error: unknown): OpenRouterError {
  if (error instanceof OpenRouterError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new OpenRouterError("aborted", "Cancelled.");
  }
  return new OpenRouterError(
    "network",
    error instanceof Error ? error.message : "Could not reach openrouter.ai.",
  );
}

/** Validates a pasted key and returns its label and credit info. */
export async function fetchKeyInfo(
  apiKey: string,
  signal?: AbortSignal,
): Promise<OpenRouterKeyInfo> {
  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE}/key`, {
      headers: headers(apiKey),
      signal,
    });
  } catch (error) {
    throw toNetworkError(error);
  }
  if (!response.ok) throw await toError(response);
  const body = await response.json();
  return body.data as OpenRouterKeyInfo;
}

/** The catalog is public, so this works before the user has pasted a key. */
export async function fetchModels(
  signal?: AbortSignal,
): Promise<OpenRouterModel[]> {
  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE}/models`, { signal });
  } catch (error) {
    throw toNetworkError(error);
  }
  if (!response.ok) throw await toError(response);
  const body = await response.json();
  return (body.data ?? []) as OpenRouterModel[];
}

export interface StreamChatOptions {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  onUsage?: (usage: TokenUsage) => void;
}

interface StreamChunk {
  choices?: Array<{ delta?: { content?: string | null } }>;
  usage?: TokenUsage;
  error?: { message?: string; code?: number };
}

/**
 * Streams one chat completion straight from the browser, calling `onDelta`
 * for each token. Throws an OpenRouterError; `kind: "aborted"` when the
 * caller's AbortController fired.
 */
export async function streamChatCompletion({
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
  signal,
  onDelta,
  onUsage,
}: StreamChatOptions): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: headers(apiKey),
      signal,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        ...(temperature === undefined ? {} : { temperature }),
        ...(maxTokens === undefined ? {} : { max_tokens: maxTokens }),
      }),
    });
  } catch (error) {
    throw toNetworkError(error);
  }

  if (!response.ok) throw await toError(response);
  if (!response.body) {
    throw new OpenRouterError("network", "OpenRouter returned no response body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const { events, rest } = parseSseBuffer(buffer);
      buffer = rest;

      for (const event of events) {
        if (event === "[DONE]") return;
        let chunk: StreamChunk;
        try {
          chunk = JSON.parse(event);
        } catch {
          continue; // Not a frame we understand; the stream carries on.
        }
        if (chunk.error?.message) {
          throw new OpenRouterError("unknown", chunk.error.message);
        }
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) onDelta(text);
        if (chunk.usage) onUsage?.(chunk.usage);
      }
    }
  } catch (error) {
    throw toNetworkError(error);
  } finally {
    reader.cancel().catch(() => {});
  }
}
