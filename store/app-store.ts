"use client";

import { create } from "zustand";
import {
  STORAGE_KEYS,
  readJson,
  readString,
  removeKey,
  writeJson,
  writeString,
} from "@/lib/storage";

export type PromptStyle =
  "system prompt" | "user prompt" | "agent instructions";

/** Prefilled state handed to /compare by the generator or by history. */
export interface ComparePreset {
  systemPrompt?: string;
  userPrompt: string;
  models?: string[];
  temperature?: string;
  maxTokens?: string;
}

/** Prefilled state handed to /generate by history. */
export interface GeneratePreset {
  task: string;
  context?: string;
  outputFormat?: string;
  constraints?: string;
  promptStyle?: PromptStyle;
  targetModel?: string | null;
  generatorModel?: string;
  result?: string;
}

interface AppState {
  /** False until the first client-side read of localStorage has happened. */
  hydrated: boolean;
  apiKey: string | null;
  favorites: string[];
  settingsOpen: boolean;
  /**
   * In-memory only, deliberately: prompts are handed between routes through
   * the store rather than a query string, so nothing ends up in a URL.
   */
  comparePreset: ComparePreset | null;
  generatePreset: GeneratePreset | null;

  hydrate: () => void;
  setApiKey: (key: string | null) => void;
  toggleFavorite: (modelId: string) => void;
  openSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
  setComparePreset: (preset: ComparePreset | null) => void;
  setGeneratePreset: (preset: GeneratePreset | null) => void;
}

/**
 * A model that is fast and cheap, one that is strong at reasoning, and a
 * mid-tier one. Seeded on first run only; the user's list wins after that.
 */
export const DEFAULT_FAVORITES = [
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-sonnet-4.5",
  "openai/gpt-4o-mini",
];

/** The generator's own default: a strong instruction follower. */
export const DEFAULT_GENERATOR_MODEL = "anthropic/claude-sonnet-4.5";

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  apiKey: null,
  favorites: DEFAULT_FAVORITES,
  settingsOpen: false,
  comparePreset: null,
  generatePreset: null,

  hydrate: () => {
    if (get().hydrated) return;
    set({
      hydrated: true,
      apiKey: readString(STORAGE_KEYS.apiKey),
      favorites: readJson<string[]>(STORAGE_KEYS.favorites, DEFAULT_FAVORITES),
    });
  },

  setApiKey: (key) => {
    if (key) writeString(STORAGE_KEYS.apiKey, key);
    else removeKey(STORAGE_KEYS.apiKey);
    set({ apiKey: key });
  },

  toggleFavorite: (modelId) => {
    const favorites = get().favorites.includes(modelId)
      ? get().favorites.filter((id) => id !== modelId)
      : [...get().favorites, modelId];
    writeJson(STORAGE_KEYS.favorites, favorites);
    set({ favorites });
  },

  openSettings: () => set({ settingsOpen: true }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  setComparePreset: (comparePreset) => set({ comparePreset }),
  setGeneratePreset: (generatePreset) => set({ generatePreset }),
}));
