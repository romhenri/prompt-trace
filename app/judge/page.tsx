"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { KeyGate } from "@/components/key-gate";
import { ModelPicker } from "@/components/model-picker";
import { PromptTextarea } from "@/components/prompt-textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildChallengerMessages,
  buildJudgeMessages,
  parseJudgment,
  passed,
  type Attempt,
} from "@/lib/judge";
import { PAGE_CONTAINER } from "@/lib/layout";
import { streamChatCompletion } from "@/lib/openrouter/client";
import { OpenRouterError } from "@/lib/openrouter/types";
import { useAppStore } from "@/store/app-store";

const MAX_ROUNDS = 10;

export default function JudgePage() {
  return (
    <KeyGate>
      <Judge />
    </KeyGate>
  );
}

function Judge() {
  const apiKey = useAppStore((s) => s.apiKey);
  const favorites = useAppStore((s) => s.favorites);

  const [task, setTask] = useState("");
  const [requirement, setRequirement] = useState("");
  const [minScore, setMinScore] = useState("");
  const [challenger, setChallenger] = useState<string | null>(
    favorites[0] ?? null,
  );
  const [judge, setJudge] = useState<string | null>(favorites[1] ?? null);
  const [rounds, setRounds] = useState(5);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  // Leaving the page must not leave the loop billing against the key.
  useEffect(() => () => controller.current?.abort(), []);

  const threshold =
    minScore.trim() === ""
      ? null
      : Math.min(100, Math.max(0, Number(minScore) || 0));
  const canRun =
    task.trim() !== "" &&
    requirement.trim() !== "" &&
    challenger !== null &&
    judge !== null;
  const last = attempts.at(-1)?.judgment;
  const won = last ? passed(last, threshold) : false;

  async function run() {
    if (!canRun || !apiKey) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setAttempts([]);
    setError(null);
    setRunning(true);

    const done: Attempt[] = [];
    try {
      for (let round = 0; round < rounds; round++) {
        const attempt: Attempt = { text: "", judgment: null };
        await streamChatCompletion({
          apiKey,
          model: challenger!,
          messages: buildChallengerMessages(task, requirement, done.at(-1)),
          signal: abort.signal,
          onDelta: (delta) => {
            attempt.text += delta;
            setAttempts([...done, { ...attempt }]);
          },
        });

        let verdict = "";
        await streamChatCompletion({
          apiKey,
          model: judge!,
          messages: buildJudgeMessages(
            task,
            requirement,
            attempt.text,
            threshold,
          ),
          temperature: 0,
          signal: abort.signal,
          onDelta: (delta) => (verdict += delta),
        });
        attempt.judgment = parseJudgment(verdict);
        if (!attempt.judgment) {
          throw new Error(`The judge did not reply with a verdict: ${verdict}`);
        }
        done.push(attempt);
        setAttempts([...done]);
        if (passed(attempt.judgment, threshold)) break;
      }
    } catch (e) {
      if (!(e instanceof OpenRouterError && e.kind === "aborted")) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className={`flex-1 space-y-4 py-6 ${PAGE_CONTAINER}`}>
      <div className="space-y-3 rounded-xl border p-4">
        <PromptTextarea
          label="Task"
          required
          value={task}
          onChange={setTask}
          onSubmit={run}
          rows={3}
          placeholder="What should the challenger write?"
        />
        <PromptTextarea
          label="Requirement"
          required
          value={requirement}
          onChange={setRequirement}
          onSubmit={run}
          rows={2}
          placeholder="What the judge checks, e.g. Under 50 words, no jargon, ends with a question."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Challenger</Label>
            <ModelPicker
              mode="single"
              value={challenger}
              onChange={setChallenger}
              placeholder="Pick a model"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Judge</Label>
            <ModelPicker
              mode="single"
              value={judge}
              onChange={setJudge}
              placeholder="Pick a model"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rounds">Max rounds</Label>
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
          <div className="space-y-1.5">
            <Label htmlFor="min-score">Min score</Label>
            <Input
              id="min-score"
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="Judge decides"
              className="w-32"
            />
          </div>
          <p className="text-muted-foreground pb-2 text-xs">
            Up to {rounds * 2} model calls. Stops at the first pass.
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

      {attempts.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Set a task and a requirement, and the challenger keeps rewriting
          until the judge is satisfied.
        </div>
      ) : (
        <>
          {!running && last && (
            <p className="text-sm font-medium">
              {won
                ? `Passed in round ${attempts.length}.`
                : `Did not pass in ${attempts.length} rounds.`}
            </p>
          )}
          <ul className="space-y-3">
            {attempts.map((attempt, i) => (
              <li key={i} className="rounded-xl border p-3">
                <div className="text-muted-foreground mb-1 flex gap-2 text-xs">
                  <span className="text-foreground font-medium">
                    Round {i + 1}
                  </span>
                  {attempt.judgment && (
                    <span
                      className={
                        passed(attempt.judgment, threshold)
                          ? "text-green-600"
                          : "text-red-500"
                      }
                    >
                      {attempt.judgment.score}/100{" "}
                      {passed(attempt.judgment, threshold) ? "pass" : "fail"}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {attempt.text || "…"}
                </p>
                {attempt.judgment?.feedback && (
                  <p className="text-muted-foreground mt-2 border-t pt-2 text-xs">
                    Judge: {attempt.judgment.feedback}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </main>
  );
}
