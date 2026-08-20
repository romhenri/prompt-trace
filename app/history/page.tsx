"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Columns3, History, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { STORAGE_KEYS, writeJson } from "@/lib/storage";
import { loadHistory, saveHistory, type HistoryEntry } from "@/lib/history";
import type { ComparePreset, GeneratePreset } from "@/store/app-store";
import { useAppStore, type PromptStyle } from "@/store/app-store";

/** localStorage is untrusted input; read every field defensively. */
function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function preview(entry: HistoryEntry): string {
  const source =
    entry.tool === "generate"
      ? str(entry.inputs.task)
      : str(entry.inputs.userPrompt);
  const trimmed = source.replace(/\s+/g, " ").trim();
  if (!trimmed) return "(empty)";
  return trimmed.length > 140 ? `${trimmed.slice(0, 139)}…` : trimmed;
}

function toComparePreset(entry: HistoryEntry): ComparePreset {
  return {
    systemPrompt: str(entry.inputs.systemPrompt),
    userPrompt: str(entry.inputs.userPrompt),
    models: Array.isArray(entry.models) ? entry.models : undefined,
    temperature: str(entry.inputs.temperature, "1"),
    maxTokens: str(entry.inputs.maxTokens),
  };
}

function toGeneratePreset(entry: HistoryEntry): GeneratePreset {
  const style = str(entry.inputs.promptStyle);
  return {
    task: str(entry.inputs.task),
    context: str(entry.inputs.context),
    outputFormat: str(entry.inputs.outputFormat),
    constraints: str(entry.inputs.constraints),
    promptStyle: (style || "system prompt") as PromptStyle,
    targetModel: str(entry.inputs.targetModel) || null,
    generatorModel: str(entry.inputs.generatorModel) || undefined,
    result: str(entry.outputs.prompt),
  };
}

export default function HistoryPage() {
  const router = useRouter();
  const setComparePreset = useAppStore((s) => s.setComparePreset);
  const setGeneratePreset = useAppStore((s) => s.setGeneratePreset);

  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  // Reading localStorage is exactly the "synchronise with an external system"
  // case this rule carves out. It cannot move into a lazy initialiser: this
  // page is prerendered, so a render-time read would make the server HTML and
  // the first client render disagree.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setEntries(loadHistory()), []);

  function persist(next: HistoryEntry[]) {
    setEntries(next);
    saveHistory(next);
  }

  function restore(entry: HistoryEntry) {
    if (entry.tool === "compare") {
      setComparePreset(toComparePreset(entry));
      router.push("/compare");
    } else {
      setGeneratePreset(toGeneratePreset(entry));
      router.push("/generate");
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-6 sm:px-6">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-lg font-semibold">History</h1>
        {entries && entries.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEntries([]);
              writeJson(STORAGE_KEYS.history, []);
            }}
          >
            <Trash2 /> Clear all
          </Button>
        )}
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        The 50 most recent runs, kept in this browser only.
      </p>

      {entries === null ? (
        <div className="mt-6 space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-muted-foreground mt-6 rounded-xl border border-dashed p-10 text-center text-sm">
          <History className="mx-auto size-6" />
          <p className="mt-3">Nothing here yet.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/generate">Generate a prompt</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/compare">Compare models</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => restore(entry)}
                className="hover:border-foreground/25 hover:bg-muted/40 focus-visible:ring-ring min-w-0 flex-1 rounded-lg border p-3 text-left transition-colors focus-visible:ring-3 focus-visible:outline-none"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    {entry.tool === "generate" ? (
                      <Sparkles className="size-3" />
                    ) : (
                      <Columns3 className="size-3" />
                    )}
                    {entry.tool}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                  {entry.models.length > 0 && (
                    <span className="text-muted-foreground truncate font-mono text-xs">
                      {entry.models.join(", ")}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 truncate text-sm">{preview(entry)}</p>
              </button>

              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete entry"
                title="Delete entry"
                onClick={() =>
                  persist(entries.filter((other) => other.id !== entry.id))
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
