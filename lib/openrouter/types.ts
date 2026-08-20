/** Shapes returned by the OpenRouter HTTP API. */

/** `GET /api/v1/models` entry. Prices are USD *per token*, as strings. */
export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number | null;
  pricing: {
    prompt: string;
    completion: string;
    request?: string;
    image?: string;
  };
  top_provider?: {
    context_length?: number | null;
    max_completion_tokens?: number | null;
    is_moderated?: boolean;
  };
  architecture?: {
    modality?: string;
    tokenizer?: string;
  };
}

/** `GET /api/v1/key` payload, used to validate a key the user pasted. */
export interface OpenRouterKeyInfo {
  label: string;
  usage: number;
  limit: number | null;
  limit_remaining?: number | null;
  is_free_tier?: boolean;
}

/** The `usage` object streamed back when `stream_options.include_usage` is set. */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Categories we render differently in the UI. */
export type OpenRouterErrorKind =
  | "unauthorized"
  | "no_credits"
  | "rate_limited"
  | "aborted"
  | "network"
  | "unknown";

export class OpenRouterError extends Error {
  readonly kind: OpenRouterErrorKind;
  readonly status?: number;

  constructor(kind: OpenRouterErrorKind, message: string, status?: number) {
    super(message);
    this.name = "OpenRouterError";
    this.kind = kind;
    this.status = status;
  }
}
