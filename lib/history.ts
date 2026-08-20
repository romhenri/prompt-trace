import { STORAGE_KEYS, isQuotaError, readJson, writeJson } from "./storage";

export const HISTORY_LIMIT = 50;

export interface HistoryEntry {
  id: string;
  tool: "generate" | "compare";
  createdAt: number;
  /** Tool-shaped payloads; localStorage is untrusted, so read them defensively. */
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  models: string[];
  metrics: Record<string, unknown>;
}

/** Newest first, de-duplicated by id, capped at HISTORY_LIMIT. */
export function addEntry(
  entries: HistoryEntry[],
  entry: HistoryEntry,
): HistoryEntry[] {
  const existing = entries.findIndex((e) => e.id === entry.id);
  if (existing !== -1) {
    const next = entries.slice();
    next[existing] = entry;
    return next;
  }
  return [entry, ...entries].slice(0, HISTORY_LIMIT);
}

/**
 * Persist a newest-first list, shedding the oldest entries one at a time
 * until it fits. Returns what actually got written.
 */
export function writeWithQuotaRetry<T>(
  items: T[],
  write: (items: T[]) => void,
): T[] {
  let candidate = items;
  for (;;) {
    try {
      write(candidate);
      return candidate;
    } catch (error) {
      if (!isQuotaError(error)) throw error;
      if (candidate.length === 0) return candidate;
      candidate = candidate.slice(0, -1);
    }
  }
}

export function loadHistory(): HistoryEntry[] {
  const entries = readJson<HistoryEntry[]>(STORAGE_KEYS.history, []);
  return Array.isArray(entries) ? entries : [];
}

export function saveHistory(entries: HistoryEntry[]): {
  entries: HistoryEntry[];
  dropped: boolean;
} {
  const written = writeWithQuotaRetry(entries, (items) =>
    writeJson(STORAGE_KEYS.history, items),
  );
  return { entries: written, dropped: written.length < entries.length };
}

/** Warn about a full localStorage once per session, not on every save. */
let warnedAboutQuota = false;

/**
 * Appends one entry to the stored history. Returns true the first time
 * entries had to be shed to make room, so the caller warns exactly once.
 */
export function recordEntry(entry: HistoryEntry): { shouldWarn: boolean } {
  const { dropped } = saveHistory(addEntry(loadHistory(), entry));
  if (!dropped || warnedAboutQuota) return { shouldWarn: false };
  warnedAboutQuota = true;
  return { shouldWarn: true };
}
