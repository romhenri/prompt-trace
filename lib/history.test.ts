import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HISTORY_LIMIT,
  addEntry,
  recordEntry,
  writeWithQuotaRetry,
} from "./history";
import type { HistoryEntry } from "./history";

function entry(id: string, createdAt: number): HistoryEntry {
  return {
    id,
    tool: "generate",
    createdAt,
    inputs: {},
    outputs: {},
    models: [],
    metrics: {},
  };
}

describe("addEntry", () => {
  it("puts the newest entry first", () => {
    const result = addEntry([entry("old", 1)], entry("new", 2));
    expect(result.map((e) => e.id)).toEqual(["new", "old"]);
  });

  it("caps the list at the 50 most recent entries", () => {
    const existing = Array.from({ length: HISTORY_LIMIT }, (_, i) =>
      entry(`e${i}`, HISTORY_LIMIT - i),
    );
    const result = addEntry(existing, entry("newest", 999));
    expect(result).toHaveLength(HISTORY_LIMIT);
    expect(result[0].id).toBe("newest");
    expect(result.at(-1)!.id).toBe(`e${HISTORY_LIMIT - 2}`);
  });

  it("replaces an entry that has the same id instead of duplicating it", () => {
    const result = addEntry([entry("a", 1), entry("b", 2)], entry("a", 3));
    expect(result.map((e) => e.id)).toEqual(["a", "b"]);
    expect(result).toHaveLength(2);
  });
});

describe("writeWithQuotaRetry", () => {
  it("writes once when there is room", () => {
    const write = vi.fn();
    const kept = writeWithQuotaRetry([entry("a", 1), entry("b", 2)], write);
    expect(write).toHaveBeenCalledTimes(1);
    expect(kept).toHaveLength(2);
  });

  it("drops the oldest entries until the write fits", () => {
    // Oldest-first ids are at the end; only two entries ever fit.
    const write = vi.fn((items: HistoryEntry[]) => {
      if (items.length > 2)
        throw new DOMException("full", "QuotaExceededError");
    });
    const kept = writeWithQuotaRetry(
      [entry("a", 3), entry("b", 2), entry("c", 1)],
      write,
    );
    expect(kept.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("gives up and returns an empty list rather than looping forever", () => {
    const write = vi.fn((items: HistoryEntry[]) => {
      if (items.length > 0)
        throw new DOMException("full", "QuotaExceededError");
    });
    expect(writeWithQuotaRetry([entry("a", 1)], write)).toEqual([]);
  });

  it("rethrows errors that are not about quota", () => {
    const write = vi.fn(() => {
      throw new TypeError("something else broke");
    });
    expect(() => writeWithQuotaRetry([entry("a", 1)], write)).toThrow(
      TypeError,
    );
  });
});

describe("recordEntry", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("does not ask the caller to warn while there is room", () => {
    expect(recordEntry(entry("a", 1)).shouldWarn).toBe(false);
    expect(recordEntry(entry("b", 2)).shouldWarn).toBe(false);
  });

  it("asks the caller to warn only the first time entries are shed", async () => {
    // Fresh module so the once-per-session flag starts unset.
    vi.resetModules();
    const { recordEntry: record } = await import("./history");

    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation((_key, value) => {
        if (String(value).length > 200) {
          throw new DOMException("full", "QuotaExceededError");
        }
      });

    try {
      const big = (id: string): HistoryEntry => ({
        ...entry(id, 1),
        outputs: { text: "x".repeat(400) },
      });
      expect(record(big("a")).shouldWarn).toBe(true);
      expect(record(big("b")).shouldWarn).toBe(false);
      expect(record(big("c")).shouldWarn).toBe(false);
    } finally {
      setItem.mockRestore();
    }
  });
});
