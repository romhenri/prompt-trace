"use client";

import type { ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/app-store";

/** Blocks a tool until a key is present, with a way to fix it in place. */
export function KeyGate({ children }: { children: ReactNode }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const apiKey = useAppStore((s) => s.apiKey);
  const openSettings = useAppStore((s) => s.openSettings);

  if (!hydrated) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <KeyRound className="text-muted-foreground mx-auto size-8" />
        <h2 className="mt-4 text-lg font-semibold">An API key is required</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          This tool calls OpenRouter directly from your browser, using your own
          key. Add one to continue.
        </p>
        <Button className="mt-5" onClick={openSettings}>
          Add your OpenRouter key
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
