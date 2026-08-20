"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchKeyInfo } from "@/lib/openrouter/client";
import {
  OpenRouterError,
  type OpenRouterKeyInfo,
} from "@/lib/openrouter/types";
import { useAppStore } from "@/store/app-store";

/** `sk-or-v1-abc…wxyz` -> `sk-or-v1-••••wxyz` */
export function maskKey(key: string): string {
  const prefix = key.slice(0, 9);
  const suffix = key.slice(-4);
  return `${prefix}••••${suffix}`;
}

/**
 * Paste-and-validate form for an OpenRouter key. Shared by the onboarding
 * screen and the settings dialog.
 */
export function KeyForm({ onSaved }: { onSaved?: () => void }) {
  const setApiKey = useAppStore((s) => s.setApiKey);
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<OpenRouterKeyInfo | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const key = value.trim();
    if (!key) return;

    setChecking(true);
    setError(null);
    setInfo(null);
    try {
      const keyInfo = await fetchKeyInfo(key);
      setApiKey(key);
      setInfo(keyInfo);
      setValue("");
      onSaved?.();
    } catch (cause) {
      setError(
        cause instanceof OpenRouterError
          ? cause.message
          : "Could not reach openrouter.ai to check this key.",
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="openrouter-key">OpenRouter API key</Label>
        <Input
          id="openrouter-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-or-v1-…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="font-mono"
          aria-invalid={error !== null}
          aria-describedby={error ? "openrouter-key-error" : undefined}
        />
      </div>

      {error && (
        <p id="openrouter-key-error" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {info && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-400">
          <CheckCircle2 className="size-4" />
          Saved {info.label ? `"${info.label}"` : "key"}
          {info.limit === null
            ? " (no spend limit)"
            : ` (${(info.limit - info.usage).toFixed(2)} of $${info.limit.toFixed(2)} left)`}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={checking || value.trim() === ""}>
          {checking && <Loader2 className="animate-spin" />}
          {checking ? "Checking…" : "Save key"}
        </Button>
        <Button variant="ghost" asChild>
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer noopener"
          >
            Get a key <ExternalLink />
          </a>
        </Button>
      </div>
    </form>
  );
}
