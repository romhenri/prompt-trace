"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Columns3,
  Copy,
  Pencil,
  RotateCw,
  Sparkles,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { KeyGate } from "@/components/key-gate";
import { ModelPicker } from "@/components/model-picker";
import { PromptTextarea } from "@/components/prompt-textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { addEntry, loadHistory, saveHistory } from "@/lib/history";
import {
  buildGeneratorPrompt,
  extractFencedPrompt,
} from "@/lib/meta-prompts/generator";
import { streamChatCompletion } from "@/lib/openrouter/client";
import { OpenRouterError } from "@/lib/openrouter/types";
import { cn } from "@/lib/utils";
import {
  DEFAULT_GENERATOR_MODEL,
  useAppStore,
  type PromptStyle,
} from "@/store/app-store";

const FORMAT_CHIPS = ["JSON", "Markdown", "Bullet list", "Code", "Prose"];
const STYLES: PromptStyle[] = [
  "system prompt",
  "user prompt",
  "agent instructions",
];

export default function GeneratePage() {
  return (
    <KeyGate>
      <Generate />
    </KeyGate>
  );
}

function Generate() {
  const router = useRouter();
  const apiKey = useAppStore((s) => s.apiKey);
  const setComparePreset = useAppStore((s) => s.setComparePreset);
  // Read once at mount: a preset is initial state, not something to sync.
  const [preset] = useState(() => useAppStore.getState().generatePreset);

  const [task, setTask] = useState(preset?.task ?? "");
  const [context, setContext] = useState(preset?.context ?? "");
  const [outputFormat, setOutputFormat] = useState(preset?.outputFormat ?? "");
  const [constraints, setConstraints] = useState(preset?.constraints ?? "");
  const [promptStyle, setPromptStyle] = useState<PromptStyle>(
    preset?.promptStyle ?? "system prompt",
  );
  const [targetModel, setTargetModel] = useState<string | null>(
    preset?.targetModel ?? null,
  );
  const [generatorModel, setGeneratorModel] = useState<string | null>(
    preset?.generatorModel ?? DEFAULT_GENERATOR_MODEL,
  );

  const [raw, setRaw] = useState(preset?.result ?? "");
  const [edited, setEdited] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const controller = useRef<AbortController | null>(null);
  const buffer = useRef("");
  const frame = useRef<number | null>(null);

  useEffect(() => useAppStore.getState().setGeneratePreset(null), []);

  // Abort an in-flight generation if the user navigates away mid-stream.
  useEffect(() => {
    return () => {
      controller.current?.abort();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  /** What the user acts on: their edit if they made one, else the model's. */
  const prompt = useMemo(
    () => (edited === null ? extractFencedPrompt(raw) : edited),
    [edited, raw],
  );

  const canRun = task.trim() !== "" && generatorModel !== null && !running;

  async function generate() {
    if (!canRun || !apiKey || !generatorModel) return;

    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;

    setRunning(true);
    setError(null);
    setEdited(null);
    setRaw("");
    buffer.current = "";

    try {
      await streamChatCompletion({
        apiKey,
        model: generatorModel,
        signal: abort.signal,
        messages: [
          {
            role: "user",
            content: buildGeneratorPrompt({
              task,
              context,
              outputFormat,
              constraints,
              promptStyle,
              targetModel,
            }),
          },
        ],
        onDelta: (text) => {
          // Coalesce onto frames so long streams stay smooth.
          buffer.current += text;
          frame.current ??= requestAnimationFrame(() => {
            frame.current = null;
            setRaw(buffer.current);
          });
        },
      });
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
      setRaw(buffer.current);

      const generated = extractFencedPrompt(buffer.current);
      if (generated) {
        const { dropped } = saveHistory(
          addEntry(loadHistory(), {
            id: crypto.randomUUID(),
            tool: "generate",
            createdAt: Date.now(),
            inputs: {
              task,
              context,
              outputFormat,
              constraints,
              promptStyle,
              targetModel,
              generatorModel,
            },
            outputs: { prompt: generated },
            models: [generatorModel],
            metrics: {},
          }),
        );
        if (dropped) {
          toast.warning(
            "History was trimmed to fit your browser's storage limit.",
          );
        }
      }
    } catch (cause) {
      const openRouterError =
        cause instanceof OpenRouterError
          ? cause
          : new OpenRouterError("unknown", String(cause));
      if (openRouterError.kind !== "aborted") setError(openRouterError.message);
    } finally {
      setRunning(false);
    }
  }

  function sendToComparison() {
    if (!prompt) return;
    setComparePreset(
      promptStyle === "user prompt"
        ? { userPrompt: prompt }
        : { systemPrompt: prompt, userPrompt: "" },
    );
    router.push("/compare");
  }

  return (
    <main className="mx-auto grid w-full max-w-[1600px] flex-1 gap-5 px-3 py-5 sm:px-6 lg:grid-cols-2">
      <div className="space-y-4">
        <PromptTextarea
          label="Task"
          value={task}
          onChange={setTask}
          onSubmit={generate}
          required
          rows={4}
          hint="⌘/Ctrl + Enter to generate"
          placeholder="What should the finished prompt make the model do?"
        />

        <PromptTextarea
          label="Context"
          value={context}
          onChange={setContext}
          onSubmit={generate}
          rows={3}
          hint="optional"
          placeholder="Domain, audience, background the model needs."
        />

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="output-format">Output format</Label>
            <span className="text-muted-foreground text-xs">optional</span>
          </div>
          <Textarea
            id="output-format"
            rows={2}
            value={outputFormat}
            onChange={(event) => setOutputFormat(event.target.value)}
            placeholder="e.g. a JSON object with keys summary and severity"
            className="resize-y font-mono text-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {FORMAT_CHIPS.map((chip) => (
              <Button
                key={chip}
                type="button"
                variant="outline"
                size="xs"
                onClick={() =>
                  setOutputFormat((current) =>
                    current.trim() === "" ? chip : `${current.trim()}, ${chip}`,
                  )
                }
              >
                {chip}
              </Button>
            ))}
          </div>
        </div>

        <PromptTextarea
          label="Constraints"
          value={constraints}
          onChange={setConstraints}
          onSubmit={generate}
          rows={2}
          hint="optional"
          placeholder="Tone, length, things to avoid."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="prompt-style">Prompt style</Label>
            <Select
              value={promptStyle}
              onValueChange={(value) => setPromptStyle(value as PromptStyle)}
            >
              <SelectTrigger id="prompt-style" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((style) => (
                  <SelectItem key={style} value={style}>
                    {style}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Target model</Label>
            <ModelPicker
              mode="single"
              value={targetModel}
              onChange={setTargetModel}
              placeholder="Any model (optional)"
            />
            <p className="text-muted-foreground text-xs">
              The model the prompt is written for.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Generator model</Label>
          <ModelPicker
            mode="single"
            value={generatorModel}
            onChange={setGeneratorModel}
            placeholder="Pick the model that writes the prompt"
          />
          <p className="text-muted-foreground text-xs">
            The model that writes the prompt.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={generate} disabled={!canRun}>
            <Sparkles /> Generate prompt
          </Button>
          {running && (
            <Button
              variant="outline"
              onClick={() => controller.current?.abort()}
            >
              <Square /> Stop
            </Button>
          )}
        </div>
      </div>

      <section className="flex min-h-[24rem] flex-col overflow-hidden rounded-xl border lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
        <header className="flex items-center gap-2 border-b px-3 py-2">
          <h2 className="flex-1 text-sm font-medium">Generated prompt</h2>
          {prompt && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Copy prompt"
                title="Copy prompt"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(prompt)
                    .then(() => setCopied(true));
                }}
              >
                {copied ? <Check className="text-emerald-400" /> : <Copy />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={edited === null ? "Edit prompt" : "Stop editing"}
                title={edited === null ? "Edit prompt" : "Stop editing"}
                onClick={() => setEdited(edited === null ? prompt : null)}
              >
                <Pencil className={cn(edited !== null && "text-sky-400")} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Regenerate"
                title="Regenerate"
                onClick={generate}
                disabled={!canRun}
              >
                <RotateCw />
              </Button>
            </>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {error ? (
            <div className="text-sm">
              <p className="text-destructive flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={generate}
                disabled={!canRun}
              >
                <RotateCw /> Try again
              </Button>
            </div>
          ) : edited !== null ? (
            <Textarea
              value={edited}
              onChange={(event) => setEdited(event.target.value)}
              className="h-full min-h-[20rem] resize-none font-mono text-[13px]"
              aria-label="Edit generated prompt"
            />
          ) : prompt ? (
            <pre className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
              {prompt}
            </pre>
          ) : running ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-[90%]" />
              <Skeleton className="h-3 w-[75%]" />
              <Skeleton className="h-3 w-[85%]" />
              <Skeleton className="h-3 w-[60%]" />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Describe the task on the left. The generated prompt streams in
              here, structured with role, context, instructions, constraints
              and output format.
            </p>
          )}
        </div>

        {prompt && !running && (
          <footer className="border-t p-3">
            <Button variant="outline" onClick={sendToComparison}>
              <Columns3 /> Send to Comparison
            </Button>
          </footer>
        )}
      </section>
    </main>
  );
}
