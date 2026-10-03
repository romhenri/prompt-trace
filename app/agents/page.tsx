"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Plus, Square, X } from "lucide-react";
import { KeyGate } from "@/components/key-gate";
import { ModelPicker } from "@/components/model-picker";
import { PromptTextarea } from "@/components/prompt-textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PRESETS,
  buildTurnMessages,
  speakerLabel,
  turnOrder,
  type Participant,
  type Turn,
} from "@/lib/agents";
import { PAGE_CONTAINER } from "@/lib/layout";
import { streamChatCompletion } from "@/lib/openrouter/client";
import { OpenRouterError } from "@/lib/openrouter/types";
import { useAppStore } from "@/store/app-store";

const MIN_AGENTS = 2;
const MAX_AGENTS = 4;
const MAX_ROUNDS = 8;

export default function AgentsPage() {
  return (
    <KeyGate>
      <Agents />
    </KeyGate>
  );
}

function Agents() {
  const apiKey = useAppStore((s) => s.apiKey);
  const favorites = useAppStore((s) => s.favorites);

  const [topic, setTopic] = useState("");
  const [rounds, setRounds] = useState(3);
  const [people, setPeople] = useState<Participant[]>(() =>
    PRESETS[0].roles
      .slice(0, 2)
      .map((role, i) => ({ modelId: favorites[i] ?? null, role })),
  );
  const [turns, setTurns] = useState<Turn[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  // Leaving the page must not leave a conversation billing against the key.
  useEffect(() => () => controller.current?.abort(), []);

  const ready = people.every((p) => p.modelId);
  const canRun = topic.trim() !== "" && ready;

  function setPerson(index: number, change: Partial<Participant>) {
    setPeople((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...change } : p)),
    );
  }

  /** A preset swaps the roles and keeps whichever models are already picked. */
  function applyPreset(roles: readonly string[]) {
    setPeople((prev) =>
      roles.map((role, i) => ({ modelId: prev[i]?.modelId ?? null, role })),
    );
  }

  async function run() {
    if (!canRun || !apiKey) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setTurns([]);
    setError(null);
    setRunning(true);

    const transcript: Turn[] = [];
    try {
      for (const speaker of turnOrder(people.length, rounds)) {
        const turn: Turn = { speaker, text: "" };
        setTurns([...transcript, turn]);
        await streamChatCompletion({
          apiKey,
          model: people[speaker].modelId!,
          messages: buildTurnMessages(topic, people, transcript, speaker),
          signal: abort.signal,
          onDelta: (delta) => {
            turn.text += delta;
            setTurns([...transcript, { ...turn }]);
          },
        });
        transcript.push(turn);
      }
    } catch (e) {
      if (!(e instanceof OpenRouterError && e.kind === "aborted")) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setRunning(false);
    }
  }

  const calls = people.length * rounds;

  return (
    <main className={`flex-1 space-y-4 py-6 ${PAGE_CONTAINER}`}>
      <div className="space-y-3 rounded-xl border p-4">
        <PromptTextarea
          label="Topic"
          required
          value={topic}
          onChange={setTopic}
          onSubmit={run}
          rows={3}
          placeholder="What should they talk about?"
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Preset</span>
          {PRESETS.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.roles)}
            >
              {preset.name}
            </Button>
          ))}
        </div>

        <ul className="space-y-2">
          {people.map((person, i) => (
            <li
              key={i}
              className="grid items-center gap-2 sm:grid-cols-[6rem_minmax(0,18rem)_1fr_auto]"
            >
              <span className="text-muted-foreground text-xs">
                Agent {i + 1}
              </span>
              <ModelPicker
                mode="single"
                value={person.modelId}
                onChange={(modelId) => setPerson(i, { modelId })}
                placeholder="Pick a model"
              />
              <Input
                value={person.role}
                onChange={(e) => setPerson(i, { role: e.target.value })}
                placeholder="Role, e.g. Argue against the topic."
                aria-label={`Role of agent ${i + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={people.length <= MIN_AGENTS}
                onClick={() =>
                  setPeople((prev) => prev.filter((_, j) => j !== i))
                }
                aria-label={`Remove agent ${i + 1}`}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-end gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={people.length >= MAX_AGENTS}
            onClick={() =>
              setPeople((prev) => [...prev, { modelId: null, role: "" }])
            }
          >
            <Plus /> Add agent
          </Button>
          <div className="space-y-1.5">
            <Label htmlFor="rounds">Rounds</Label>
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
          <p className="text-muted-foreground pb-2 text-xs">
            {calls} model calls, each with a longer transcript than the last.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={run} disabled={!canRun || running}>
            <Play /> Start
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

      {turns.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Give them a topic and a role each, and let them talk.
        </div>
      ) : (
        <ul className="space-y-3">
          {turns.map((turn, i) => (
            <li key={i} className="rounded-xl border p-3">
              <div className="text-muted-foreground mb-1 flex gap-2 text-xs">
                <span className="text-foreground font-medium">
                  {speakerLabel(people, turn.speaker)}
                </span>
                <span className="truncate font-mono">
                  {people[turn.speaker]?.modelId}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{turn.text || "…"}</p>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </main>
  );
}
