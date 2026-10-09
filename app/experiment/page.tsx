"use client";

import { useState } from "react";
import { ChevronDown, Play, Plus, RotateCw, Square, X } from "lucide-react";
import { KeyGate } from "@/components/key-gate";
import { ModelPicker } from "@/components/model-picker";
import { VerbosityPicker } from "@/components/verbosity-picker";
import { withVerbosity, type VerbosityId } from "@/lib/verbosity";
import { PromptTextarea } from "@/components/prompt-textarea";
import { ResponseColumn } from "@/components/response-column";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_CONTAINER } from "@/lib/layout";
import { useModelCatalog } from "@/lib/openrouter/models";
import type { ChatMessage } from "@/lib/openrouter/types";
import { useModelRuns, type RunRequest } from "@/lib/use-model-runs";
import { useAppStore } from "@/store/app-store";

const MIN_VARIANTS = 2;
const MAX_VARIANTS = 5;

/** Column key per variant; the hook keys runs by it. */
const key = (index: number) => `variant-${index + 1}`;

export default function ExperimentPage() {
  return (
    <KeyGate>
      <Experiment />
    </KeyGate>
  );
}

function Experiment() {
  const apiKey = useAppStore((s) => s.apiKey);
  const favorites = useAppStore((s) => s.favorites);
  const { byId } = useModelCatalog();
  const { runs, busy, start, rerun, cancel, cancelAll, remove } =
    useModelRuns();

  const [model, setModel] = useState<string | null>(favorites[0] ?? null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [verbosity, setVerbosity] = useState<VerbosityId | null>(null);

  const [showSystem, setShowSystem] = useState(false);
  const [variants, setVariants] = useState<string[]>(["", ""]);
  const [temperature, setTemperature] = useState("1");
  /** Requests the columns on screen ran with, so a rerun ignores later edits. */
  const [requests, setRequests] = useState<Record<string, RunRequest>>({});

  const parsedTemperature = Number(temperature);
  const temperatureValid =
    temperature.trim() !== "" &&
    Number.isFinite(parsedTemperature) &&
    parsedTemperature >= 0 &&
    parsedTemperature <= 2;
  const canRun =
    model !== null &&
    temperatureValid &&
    variants.every((variant) => variant.trim() !== "");

  function setVariant(index: number, text: string) {
    setVariants((prev) => prev.map((v, i) => (i === index ? text : v)));
  }

  function run() {
    if (!canRun || !apiKey) return;
    const next: Record<string, RunRequest> = {};
    variants.forEach((variant, i) => {
      const messages: ChatMessage[] = [];
      if (systemPrompt.trim()) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: variant });
      next[key(i)] = {
        apiKey,
        model,
        messages: withVerbosity(messages, verbosity),
        temperature: parsedTemperature,
      };
    });
    setRequests(next);
    start(Object.keys(next), (k) => next[k]);
  }

  return (
    <main className={`flex flex-1 flex-col gap-8 py-8 ${PAGE_CONTAINER}`}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-10">
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
            System prompt {systemPrompt.trim() ? "(set)" : "(optional, shared)"}
          </button>
          {showSystem && (
            <PromptTextarea
              label="System prompt"
              value={systemPrompt}
              onChange={setSystemPrompt}
              onSubmit={run}
              rows={3}
              placeholder="You are a…"
            />
          )}

          {variants.map((variant, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1">
                <PromptTextarea
                  label={`Variant ${i + 1}`}
                  required
                  value={variant}
                  onChange={(text) => setVariant(i, text)}
                  onSubmit={run}
                  rows={4}
                  placeholder={
                    i === 0
                      ? "The baseline prompt."
                      : "The same prompt with one thing changed."
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-6"
                disabled={variants.length <= MIN_VARIANTS}
                onClick={() =>
                  setVariants((prev) => prev.filter((_, j) => j !== i))
                }
                aria-label={`Remove variant ${i + 1}`}
              >
                <X />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={variants.length >= MAX_VARIANTS}
            onClick={() => setVariants((prev) => [...prev, prev.at(-1) ?? ""])}
          >
            <Plus /> Add variant
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Model</Label>
            <ModelPicker
              mode="single"
              value={model}
              onChange={setModel}
              placeholder="Pick a model"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              inputMode="decimal"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              aria-invalid={!temperatureValid}
              className="w-24"
            />
            <p className="text-muted-foreground text-xs">
              Same model and settings for every variant, so only the prompt
              changes. Use 0 to cut out sampling noise.
            </p>
          </div>

          <VerbosityPicker
            service="experiment"
            value={verbosity}
            onChange={setVerbosity}
          />

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
          </div>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Write 2 to 5 versions of a prompt, pick one model, and see what each
          change does to the answer.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-flow-col sm:auto-cols-[minmax(21rem,1fr)] sm:overflow-x-auto sm:pb-2">
          {runs.map((columnRun) => {
            const request = requests[columnRun.modelId];
            return (
              <ResponseColumn
                key={columnRun.modelId}
                run={columnRun}
                model={request?.model ? byId.get(request.model) : undefined}
                label={columnRun.modelId.replace("variant-", "Variant ")}
                onRerun={() => request && rerun(columnRun.modelId, request)}
                onCancel={() => cancel(columnRun.modelId)}
                onRemove={() => remove(columnRun.modelId)}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
