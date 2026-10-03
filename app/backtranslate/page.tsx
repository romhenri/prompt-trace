"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Play, Square } from "lucide-react";
import { KeyGate } from "@/components/key-gate";
import { ModelPicker } from "@/components/model-picker";
import { PromptTextarea } from "@/components/prompt-textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildTranslatePrompt, planHops, type Hop } from "@/lib/backtranslate";
import { PAGE_CONTAINER } from "@/lib/layout";
import { streamChatCompletion } from "@/lib/openrouter/client";
import { OpenRouterError } from "@/lib/openrouter/types";
import { useAppStore } from "@/store/app-store";

const MAX_MODELS = 6;
const MAX_ROUNDS = 5;
const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Dutch",
  "Russian",
  "Arabic",
  "Hindi",
  "Chinese",
  "Japanese",
  "Korean",
  "Turkish",
  "Swahili",
];

interface Chain {
  hops: Hop[];
  /** texts[i] is the output of hop i; the last one may still be streaming. */
  texts: string[];
  running: boolean;
  error: string | null;
}

export default function BacktranslatePage() {
  return (
    <KeyGate>
      <Backtranslate />
    </KeyGate>
  );
}

function Backtranslate() {
  const apiKey = useAppStore((s) => s.apiKey);
  const favorites = useAppStore((s) => s.favorites);

  const [text, setText] = useState("");
  const [langA, setLangA] = useState("English");
  const [langB, setLangB] = useState("Japanese");
  const [rounds, setRounds] = useState(2);
  const [models, setModels] = useState<string[]>(() => favorites.slice(0, 2));
  const [chains, setChains] = useState<Record<string, Chain>>({});
  const controller = useRef<AbortController | null>(null);

  // Leaving the page must not leave chains billing against the user's key.
  useEffect(() => () => controller.current?.abort(), []);

  const busy = Object.values(chains).some((chain) => chain.running);
  const canRun =
    text.trim() !== "" &&
    langA.trim() !== "" &&
    langB.trim() !== "" &&
    models.length >= 1 &&
    models.length <= MAX_MODELS;

  function patch(modelId: string, change: (chain: Chain) => Partial<Chain>) {
    setChains((prev) => ({
      ...prev,
      [modelId]: { ...prev[modelId], ...change(prev[modelId]) },
    }));
  }

  /** One model's hops run in order, since each needs the last one's output. */
  async function runChain(
    modelId: string,
    hops: Hop[],
    key: string,
    signal: AbortSignal,
  ) {
    let current = text;
    try {
      for (let i = 0; i < hops.length; i++) {
        let out = "";
        await streamChatCompletion({
          apiKey: key,
          model: modelId,
          messages: [
            { role: "user", content: buildTranslatePrompt(current, hops[i]) },
          ],
          temperature: 0,
          signal,
          onDelta: (delta) => {
            out += delta;
            const live = out;
            patch(modelId, (chain) => {
              const texts = [...chain.texts];
              texts[i] = live;
              return { texts };
            });
          },
        });
        current = out;
      }
      patch(modelId, () => ({ running: false }));
    } catch (error) {
      const aborted =
        error instanceof OpenRouterError && error.kind === "aborted";
      patch(modelId, () => ({
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
    const hops = planHops(langA.trim(), langB.trim(), rounds);
    setChains(
      Object.fromEntries(
        models.map((id) => [
          id,
          { hops, texts: [], running: true, error: null },
        ]),
      ),
    );
    for (const id of models) void runChain(id, hops, apiKey, abort.signal);
  }

  const ids = Object.keys(chains);

  return (
    <main className={`flex-1 space-y-4 py-6 ${PAGE_CONTAINER}`}>
      <div className="space-y-3 rounded-xl border p-4">
        <PromptTextarea
          label="Text"
          required
          value={text}
          onChange={setText}
          onSubmit={run}
          rows={6}
          placeholder="Text written in the first language."
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="lang-a">Language A</Label>
            <Input
              id="lang-a"
              list="languages"
              value={langA}
              onChange={(e) => setLangA(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lang-b">Language B</Label>
            <Input
              id="lang-b"
              list="languages"
              value={langB}
              onChange={(e) => setLangB(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rounds">Round trips</Label>
            <Input
              id="rounds"
              type="number"
              min={1}
              max={MAX_ROUNDS}
              value={rounds}
              onChange={(e) =>
                setRounds(
                  Math.min(
                    MAX_ROUNDS,
                    Math.max(1, Number(e.target.value) || 1),
                  ),
                )
              }
              className="w-24"
            />
          </div>
          <datalist id="languages">
            {LANGUAGES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <ModelPicker
          mode="multi"
          value={models}
          onChange={setModels}
          max={MAX_MODELS}
          placeholder="Pick 1 to 6 translators"
        />

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={run} disabled={!canRun || busy}>
            <Play /> Translate
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

      {ids.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Paste some text, pick a language and a few models, and watch what
          survives the round trip.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-flow-col sm:auto-cols-[minmax(21rem,1fr)] sm:overflow-x-auto sm:pb-2">
          {ids.map((id) => {
            const chain = chains[id];
            const last =
              chain.texts.length === chain.hops.length && !chain.running
                ? chain.texts[chain.texts.length - 1]
                : null;
            return (
              <section key={id} className="space-y-3 rounded-xl border p-3">
                <h2 className="truncate font-mono text-xs">{id}</h2>
                <Step label={`Original (${langA})`} body={text} />
                {chain.hops.map((hop, i) => (
                  <Step
                    key={i}
                    label={
                      <>
                        {hop.from} <ArrowRight className="inline size-3" />{" "}
                        {hop.to}
                      </>
                    }
                    body={chain.texts[i]}
                    pending={chain.running && chain.texts[i] === undefined}
                  />
                ))}
                {chain.error && (
                  <p className="text-sm text-red-500">{chain.error}</p>
                )}
                {last !== null && (
                  <p className="text-muted-foreground text-xs">
                    {last.trim() === text.trim()
                      ? "Came back identical to the original."
                      : "Came back different from the original."}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Step({
  label,
  body,
  pending,
}: {
  label: React.ReactNode;
  body?: string;
  pending?: boolean;
}) {
  return (
    <div>
      <div className="text-muted-foreground mb-1 text-xs">{label}</div>
      <p className="bg-muted/40 rounded-md p-2 text-sm whitespace-pre-wrap">
        {body || (pending ? "…" : "")}
      </p>
    </div>
  );
}
