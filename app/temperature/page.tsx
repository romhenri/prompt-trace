"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { KeyGate } from "@/components/key-gate";
import { ModelPicker } from "@/components/model-picker";
import { PromptTextarea } from "@/components/prompt-textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_CONTAINER } from "@/lib/layout";
import { streamChatCompletion } from "@/lib/openrouter/client";
import { OpenRouterError } from "@/lib/openrouter/types";
import { overlap, parseTemperatures } from "@/lib/temperature";
import { useAppStore } from "@/store/app-store";

interface Sample {
  temperature: number;
  text: string;
  running: boolean;
  error: string | null;
}

export default function TemperaturePage() {
  return (
    <KeyGate>
      <Temperature />
    </KeyGate>
  );
}

function Temperature() {
  const apiKey = useAppStore((s) => s.apiKey);
  const favorites = useAppStore((s) => s.favorites);

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string | null>(favorites[0] ?? null);
  const [raw, setRaw] = useState("0, 0.7, 1.4");
  const [samples, setSamples] = useState<Sample[]>([]);
  const controller = useRef<AbortController | null>(null);

  // Leaving the page must not leave streams billing against the user's key.
  useEffect(() => () => controller.current?.abort(), []);

  const temperatures = parseTemperatures(raw);
  const busy = samples.some((sample) => sample.running);
  const canRun =
    prompt.trim() !== "" && model !== null && temperatures.length > 0;

  function patch(index: number, change: (sample: Sample) => Partial<Sample>) {
    setSamples((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...change(s) } : s)),
    );
  }

  async function sample(
    index: number,
    temperature: number,
    signal: AbortSignal,
  ) {
    try {
      await streamChatCompletion({
        apiKey: apiKey!,
        model: model!,
        messages: [{ role: "user", content: prompt }],
        temperature,
        signal,
        onDelta: (delta) => patch(index, (s) => ({ text: s.text + delta })),
      });
      patch(index, () => ({ running: false }));
    } catch (error) {
      const aborted =
        error instanceof OpenRouterError && error.kind === "aborted";
      patch(index, () => ({
        running: false,
        error: aborted
          ? "Cancelled."
          : error instanceof Error
            ? error.message
            : String(error),
      }));
    }
  }

  function run() {
    if (!canRun || !apiKey) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setSamples(
      temperatures.map((temperature) => ({
        temperature,
        text: "",
        running: true,
        error: null,
      })),
    );
    temperatures.forEach((t, i) => void sample(i, t, abort.signal));
  }

  const base = samples[0];

  return (
    <main className={`flex-1 space-y-4 py-6 ${PAGE_CONTAINER}`}>
      <div className="space-y-3 rounded-xl border p-4">
        <PromptTextarea
          label="Prompt"
          required
          value={prompt}
          onChange={setPrompt}
          onSubmit={run}
          rows={6}
          placeholder="The prompt to run at every temperature."
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1 space-y-1.5">
            <Label>Model</Label>
            <ModelPicker
              mode="single"
              value={model}
              onChange={setModel}
              placeholder="Pick a model"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="temps">Temperatures (0 to 2, up to 6)</Label>
            <Input
              id="temps"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="w-56"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={run} disabled={!canRun || busy}>
            <Play /> Sweep
          </Button>
          {busy && (
            <Button
              variant="outline"
              onClick={() => controller.current?.abort()}
            >
              <Square /> Cancel all
            </Button>
          )}
        </div>
      </div>

      {samples.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Pick a model and a few temperatures, and see how far the answer drifts
          as randomness goes up.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-flow-col sm:auto-cols-[minmax(21rem,1fr)] sm:overflow-x-auto sm:pb-2">
          {samples.map((s, i) => (
            <section
              key={s.temperature}
              className="space-y-2 rounded-xl border p-3"
            >
              <div className="flex items-baseline gap-2">
                <h2 className="font-mono text-sm">T = {s.temperature}</h2>
                {i > 0 && !s.running && base && !base.running && s.text && (
                  <span className="text-muted-foreground ml-auto text-xs">
                    {Math.round(overlap(base.text, s.text) * 100)}% word overlap
                    with T = {base.temperature}
                  </span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">
                {s.text || (s.running ? "…" : "")}
              </p>
              {s.error && <p className="text-sm text-red-500">{s.error}</p>}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
