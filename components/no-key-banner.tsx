"use client";

import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_CONTAINER } from "@/lib/layout";
import { useAppStore } from "@/store/app-store";

/**
 * Persistent nudge shown app-wide until a key is saved. Renders nothing
 * before hydration so the prerendered HTML and the first client render agree.
 */
export function NoKeyBanner() {
  const hydrated = useAppStore((s) => s.hydrated);
  const apiKey = useAppStore((s) => s.apiKey);
  const openSettings = useAppStore((s) => s.openSettings);

  if (!hydrated || apiKey) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10">
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 text-sm ${PAGE_CONTAINER}`}
      >
        <KeyRound className="size-4 shrink-0 text-amber-400" />
        <span className="text-amber-200">
          No OpenRouter key set. Nothing can run until you add one.
        </span>
        <Button size="xs" variant="outline" onClick={openSettings}>
          Add key
        </Button>
      </div>
    </div>
  );
}
