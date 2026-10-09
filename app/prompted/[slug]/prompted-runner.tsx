"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Play, Square } from "lucide-react";
import { KeyGate } from "@/components/key-gate";
import { ModelPicker } from "@/components/model-picker";
import { Markdown, MarkdownToggle } from "@/components/markdown";
import { VerbosityPicker } from "@/components/verbosity-picker";
import { PromptTextarea } from "@/components/prompt-textarea";
import { CopyButton } from "@/components/response-column";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PAGE_CONTAINER } from "@/lib/layout";
import { streamChatCompletion } from "@/lib/openrouter/client";
import { OpenRouterError } from "@/lib/openrouter/types";
import { withVerbosity, type VerbosityId } from "@/lib/verbosity";
import { DEFAULT_GENERATOR_MODEL, useAppStore } from "@/store/app-store";

interface Props {
  title: string;
  description: string;
  systemPrompt: string;
  inputLabel: string;
  inputPlaceholder: string;
}

export function PromptedRunner(props: Props) {
  return (
    <KeyGate>
      <Runner {...props} />
    </KeyGate>
  );
}

function Runner({
  title,
  description,
  systemPrompt,
  inputLabel,
  inputPlaceholder,
}: Props) {
  const apiKey = useAppStore((s) => s.apiKey);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string | null>(DEFAULT_GENERATOR_MODEL);
  const [output, setOutput] = useState("");
  const [verbosity, setVerbosity] = useState<VerbosityId | null>(null);
  const [rendered, setRendered] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controller = useRef<AbortController | null>(null);
  const buffer = useRef("");
  const frame = useRef<number | null>(null);

  // Abort an in-flight run if the user navigates away mid-stream.
  useEffect(() => {
    return () => {
      controller.current?.abort();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  const canRun = input.trim() !== "" && model !== null && !running;

  async function run() {
    if (!canRun || !apiKey || !model) return;

    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;

    setRunning(true);
    setError(null);
    setOutput("");
    buffer.current = "";

    try {
      await streamChatCompletion({
        apiKey,
        model,
        signal: abort.signal,
        messages: withVerbosity(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: input },
          ],
          verbosity,
        ),
        onDelta: (text) => {
          buffer.current += text;
          frame.current ??= requestAnimationFrame(() => {
            frame.current = null;
            setOutput(buffer.current);
          });
        },
      });
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
      setOutput(buffer.current);
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

  return (
    <main
      className={`grid flex-1 gap-8 py-8 lg:grid-cols-2 lg:gap-12 ${PAGE_CONTAINER}`}
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        </div>

        <PromptTextarea
          label={inputLabel}
          value={input}
          onChange={setInput}
          onSubmit={run}
          required
          rows={12}
          hint="⌘/Ctrl + Enter to run"
          placeholder={inputPlaceholder}
        />

        <div className="space-y-1.5">
          <Label>Model</Label>
          <ModelPicker
            mode="single"
            value={model}
            onChange={setModel}
            placeholder="Pick a model"
          />
        </div>

        <VerbosityPicker
          service="prompted"
          value={verbosity}
          onChange={setVerbosity}
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={!canRun}>
            <Play /> Run
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
        <header className="flex items-center gap-2 border-b px-4 py-2.5">
          <h2 className="flex-1 text-sm font-medium">Result</h2>
          {output && (
            <>
              <MarkdownToggle
                pressed={rendered}
                onToggle={() => setRendered((value) => !value)}
              />
              <CopyButton text={output} label="Copy result" />
            </>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="text-destructive flex items-start gap-1.5 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </p>
          ) : output && rendered ? (
            <Markdown>{output}</Markdown>
          ) : output ? (
            <pre className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
              {output}
            </pre>
          ) : (
            <p className="text-muted-foreground text-sm">
              {running
                ? "Waiting for the first tokens…"
                : "The result streams in here."}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
