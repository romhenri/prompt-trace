/**
 * Typed localStorage helpers.
 *
 * Every access is guarded: this code is bundled into pages that are
 * pre-rendered at build time, where `window` does not exist, and browsers
 * can throw on localStorage in private/blocked contexts. Call these from
 * inside `useEffect`, never at module scope.
 */

export const STORAGE_KEYS = {
  apiKey: "pf:openrouter_key",
  models: "pf:models",
  favorites: "pf:favorites",
  history: "pf:history",
} as const;

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readString(key: string): string | null {
  return store()?.getItem(key) ?? null;
}

export function writeString(key: string, value: string): void {
  store()?.setItem(key, value);
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readString(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt or hand-edited entry: fall back rather than crash the page.
    return fallback;
  }
}

/** Throws on quota so callers that care (history) can shed data and retry. */
export function writeJson(key: string, value: unknown): void {
  store()?.setItem(key, JSON.stringify(value));
}

export function removeKey(key: string): void {
  store()?.removeItem(key);
}

export function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}
