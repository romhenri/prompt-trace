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

/** Prompt handed from the generator to the comparison tool, in memory only. */
export interface PromptHandoff {
  systemPrompt?: string;
  userPrompt: string;
}

interface AppState {
  /** False until the first client-side read of localStorage has happened. */
  hydrated: boolean;
  apiKey: string | null;
  favorites: string[];
  settingsOpen: boolean;
  handoff: PromptHandoff | null;

  hydrate: () => void;
  setApiKey: (key: string | null) => void;
  toggleFavorite: (modelId: string) => void;
  openSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
  setHandoff: (handoff: PromptHandoff) => void;
  takeHandoff: () => PromptHandoff | null;
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

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  apiKey: null,
  favorites: DEFAULT_FAVORITES,
  settingsOpen: false,
  handoff: null,

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

  setHandoff: (handoff) => set({ handoff }),
  takeHandoff: () => {
    const { handoff } = get();
    if (handoff) set({ handoff: null });
    return handoff;
  },
}));
