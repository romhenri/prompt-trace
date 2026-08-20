"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS, readJson, writeJson } from "../storage";
import { fetchModels } from "./client";
import type { OpenRouterModel } from "./types";

const TTL_MS = 24 * 60 * 60 * 1000;

interface CachedCatalog {
  fetchedAt: number;
  models: OpenRouterModel[];
}

/** Shared across every picker on the page, so one mount means one request. */
let memoryCache: CachedCatalog | null = null;
let inFlight: Promise<OpenRouterModel[]> | null = null;

function isFresh(cache: CachedCatalog | null): cache is CachedCatalog {
  return (
    cache !== null &&
    Array.isArray(cache.models) &&
    cache.models.length > 0 &&
    Date.now() - cache.fetchedAt < TTL_MS
  );
}

/**
 * The catalog, from memory, then localStorage (24h TTL), then the network.
 * Never read at build time: prices and model ids go stale in a bundle.
 */
export async function loadModels(force = false): Promise<OpenRouterModel[]> {
  if (!force) {
    if (isFresh(memoryCache)) return memoryCache.models;
    const stored = readJson<CachedCatalog | null>(STORAGE_KEYS.models, null);
    if (isFresh(stored)) {
      memoryCache = stored;
      return stored.models;
    }
  }

  inFlight ??= fetchModels()
    .then((models) => {
      memoryCache = { fetchedAt: Date.now(), models };
      try {
        writeJson(STORAGE_KEYS.models, memoryCache);
      } catch {
        // Catalog cache is a nicety; a full localStorage must not break it.
      }
      return models;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Provider slug from the id prefix, e.g. `anthropic/claude-…` -> `anthropic`. */
export function providerOf(modelId: string): string {
  const slash = modelId.indexOf("/");
  return slash === -1 ? modelId : modelId.slice(0, slash);
}

export interface ModelCatalog {
  models: OpenRouterModel[];
  byId: Map<string, OpenRouterModel>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useModelCatalog(): ModelCatalog {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadAt, setReloadAt] = useState(0);

  useEffect(() => {
    let live = true;
    loadModels(reloadAt > 0)
      .then((next) => {
        if (!live) return;
        setModels(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load the model catalog.",
        );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [reloadAt]);

  const refresh = useCallback(() => {
    setLoading(true);
    setReloadAt(Date.now());
  }, []);

  const byId = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models],
  );

  return { models, byId, loading, error, refresh };
}
