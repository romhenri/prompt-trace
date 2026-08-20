"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  Play,
  RotateCw,
  Sliders,
  Square,
} from "lucide-react";
import { KeyGate } from "@/components/key-gate";
import { ModelPicker } from "@/components/model-picker";
import { PromptTextarea } from "@/components/prompt-textarea";
import { ResponseColumn } from "@/components/response-column";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { downloadText, toJson, toMarkdown } from "@/lib/export";
import { recordEntry } from "@/lib/history";
import { useModelCatalog } from "@/lib/openrouter/models";
import type { ChatMessage } from "@/lib/openrouter/types";
import { useModelRuns } from "@/lib/use-model-runs";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

export const MIN_MODELS = 2;
export const MAX_MODELS = 6;

export default function ComparePage() {
  return (
    <KeyGate>
      <Compare />
    </KeyGate>
  );
}

function Compare() {
  const apiKey = useAppStore((s) => s.apiKey);
  const favorites = useAppStore((s) => s.favorites);
  // Read once at mount: a preset is initial state, not something to sync.
  const [preset] = useState(() => useAppStore.getState().comparePreset);
  const { byId } = useModelCatalog();
  const { runs, busy, start, rerun, cancel, cancelAll } = useModelRuns();

  const [systemPrompt, setSystemPrompt] = useState(preset?.systemPrompt ?? "");
  const [userPrompt, setUserPrompt] = useState(preset?.userPrompt ?? "");
  const [models, setModels] = useState<string[]>(
    () => preset?.models ?? favorites.slice(0, MIN_MODELS),
  );
  const [temperature, setTemperature] = useState(preset?.temperature ?? "1");
  const [maxTokens, setMaxTokens] = useState(preset?.maxTokens ?? "");
  const [showSystem, setShowSystem] = useState(
    Boolean(preset?.systemPrompt?.trim()),
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [syncScroll, setSyncScroll] = useState(false);
  const [scrollRatio, setScrollRatio] = useState<number | null>(null);
  /**
   * Identity and inputs of the run in progress, captured when it starts so a
   * later edit to the prompt cannot rewrite what history says was run.
   */
  const savedRun = useRef<{
    id: string;
    inputs: Record<string, string>;
  } | null>(null);

  // Consumed, so a later visit to /compare starts clean.
  useEffect(() => useAppStore.getState().setComparePreset(null), []);

  const parsedTemperature = Number(temperature);
  const parsedMaxTokens = maxTokens.trim() === "" ? null : Number(maxTokens);
  const temperatureValid =
    temperature.trim() !== "" &&
    Number.isFinite(parsedTemperature) &&
    parsedTemperature >= 0 &&
    parsedTemperature <= 2;
  const maxTokensValid =
    parsedMaxTokens === null ||
    (Number.isInteger(parsedMaxTokens) && parsedMaxTokens > 0);

  const canRun =
    userPrompt.trim() !== "" &&
    models.length >= MIN_MODELS &&
    models.length <= MAX_MODELS &&
    temperatureValid &&
    maxTokensValid;

  /** The exact same request every column gets, so the comparison is fair. */
  function buildRequest() {
    if (!apiKey) return null;
    const messages: ChatMessage[] = [];
    if (systemPrompt.trim()) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });
    return {
      apiKey,
      messages,
      temperature: parsedTemperature,
      maxTokens: parsedMaxTokens ?? undefined,
    };
  }

  function run() {
    const request = canRun ? buildRequest() : null;
    if (!request) return;
    savedRun.current = {
      id: crypto.randomUUID(),
      inputs: { systemPrompt, userPrompt, temperature, maxTokens },
    };
    start(models, request);
  }

  // Persist once every column has settled, so metrics are complete.
  useEffect(() => {
    const saved = savedRun.current;
    if (!saved || runs.length === 0 || busy) return;

    const { shouldWarn } = recordEntry({
      id: saved.id,
      tool: "compare",
      createdAt: Date.now(),
      inputs: saved.inputs,
      outputs: {
        responses: runs.map((r) => ({
          modelId: r.modelId,
          text: r.text,
          status: r.status,
          error: r.error,
        })),
      },
      models: runs.map((r) => r.modelId),
      metrics: {
        perModel: runs.map((r) => ({
          modelId: r.modelId,
          ttftMs: r.ttftMs,
          totalMs: r.totalMs,
          usage: r.usage,
        })),
      },
    });
    if (shouldWarn) {
      toast.warning("History was trimmed to fit your browser's storage limit.");
    }
  }, [busy, runs]);

  const exportData = useMemo(
    () => ({
      systemPrompt,
      userPrompt,
      temperature: parsedTemperature,
      maxTokens: parsedMaxTokens,
      runs,
      byId,
    }),
    [systemPrompt, userPrompt, parsedTemperature, parsedMaxTokens, runs, byId],
  );

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-3 py-5 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowSystem((open) => !open)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            aria-expanded={showSystem}
          >
            <ChevronDown
              className={`size-3.5 transition-transform ${showSystem ? "" : "-rotate-90"}`}
            />
            System prompt {systemPrompt.trim() ? "(set)" : "(optional)"}
          </button>
          {showSystem && (
            <PromptTextarea
              label="System prompt"
              value={systemPrompt}
              onChange={setSystemPrompt}
              onSubmit={run}
              rows={4}
              placeholder="You are a…"
            />
          )}

          <PromptTextarea
            label="User prompt"
            value={userPrompt}
            onChange={setUserPrompt}
            onSubmit={run}
            required
            rows={8}
            hint="⌘/Ctrl + Enter to run"
            placeholder="The prompt every model will answer."
          />
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>
              Models{" "}
              <span className="text-muted-foreground font-normal">
                ({models.length} of {MIN_MODELS}–{MAX_MODELS})
              </span>
            </Label>
            <ModelPicker
              mode="multi"
              value={models}
              onChange={setModels}
              max={MAX_MODELS}
              placeholder="Pick 2 to 6 models"
            />
            {models.length < MIN_MODELS && (
              <p className="text-muted-foreground text-xs">
                Pick at least {MIN_MODELS} models to compare.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((open) => !open)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            aria-expanded={showAdvanced}
          >
            <Sliders className="size-3.5" /> Advanced
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  inputMode="decimal"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  aria-invalid={!temperatureValid}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-tokens">Max tokens</Label>
                <Input
                  id="max-tokens"
                  inputMode="numeric"
                  placeholder="provider default"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                  aria-invalid={!maxTokensValid}
                />
              </div>
              <p className="text-muted-foreground col-span-2 text-xs">
                Applied identically to every model so the comparison is fair.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={run} disabled={!canRun || busy}>
              <Play /> Run
            </Button>
            {busy ? (
              <Button variant="outline" onClick={cancelAll}>
                <Square /> Cancel all
              </Button>
            ) : (
              runs.length > 0 && (
                <Button variant="outline" onClick={run} disabled={!canRun}>
                  <RotateCw /> Rerun all
                </Button>
              )
            )}

            {runs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onSelect={() =>
                      downloadText(
                        `prompt-forge-${stamp}.md`,
                        toMarkdown(exportData),
                        "text/markdown",
                      )
                    }
                  >
                    Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      downloadText(
                        `prompt-forge-${stamp}.json`,
                        toJson(exportData),
                        "application/json",
                      )
                    }
                  >
                    JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {runs.length > 1 && (
              <label className="text-muted-foreground ml-auto flex items-center gap-2 text-xs">
                <Switch
                  checked={syncScroll}
                  onCheckedChange={(checked) => {
                    setSyncScroll(checked);
                    setScrollRatio(null);
                  }}
                />
                Sync scroll
              </label>
            )}
          </div>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Pick your models, write a prompt, and hit Run. Every model streams in
          its own column, straight from your browser.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-flow-col sm:auto-cols-[minmax(21rem,1fr)] sm:overflow-x-auto sm:pb-2">
          {runs.map((columnRun) => (
            <ResponseColumn
              key={columnRun.modelId}
              run={columnRun}
              model={byId.get(columnRun.modelId)}
              onRerun={() => {
                const request = buildRequest();
                if (!request) return;
                // Reuse the run's identity so the rerun updates that history
                // entry in place instead of being dropped.
                savedRun.current ??= {
                  id: crypto.randomUUID(),
                  inputs: { systemPrompt, userPrompt, temperature, maxTokens },
                };
                rerun(columnRun.modelId, request);
              }}
              onCancel={() => cancel(columnRun.modelId)}
              onScroll={syncScroll ? setScrollRatio : undefined}
              scrollRatio={syncScroll ? scrollRatio : null}
            />
          ))}
        </div>
      )}
    </main>
  );
}
