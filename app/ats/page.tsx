"use client";

import { useMemo, useRef, useState } from "react";
import { Play, RotateCw, Square } from "lucide-react";
import { KeyGate } from "@/components/key-gate";
import { ModelPicker } from "@/components/model-picker";
import { PromptTextarea } from "@/components/prompt-textarea";
import { ResponseColumn } from "@/components/response-column";
import { Button } from "@/components/ui/button";
import { buildAtsPrompt, consensus, parseVerdict } from "@/lib/ats";
import { PAGE_CONTAINER } from "@/lib/layout";
import { useModelCatalog } from "@/lib/openrouter/models";
import { useModelRuns, type RunRequest } from "@/lib/use-model-runs";
import { useAppStore } from "@/store/app-store";

const MIN_MODELS = 2;
const MAX_MODELS = 6;

export default function AtsPage() {
  return (
    <KeyGate>
      <Ats />
    </KeyGate>
  );
}

function Ats() {
  const apiKey = useAppStore((s) => s.apiKey);
  const favorites = useAppStore((s) => s.favorites);
  const { byId } = useModelCatalog();
  const { runs, busy, start, add, rerun, cancel, cancelAll, remove } =
    useModelRuns();

  const [resume, setResume] = useState("");
  const [job, setJob] = useState("");
  const [models, setModels] = useState<string[]>(() =>
    favorites.slice(0, MIN_MODELS),
  );
  /**
   * The brief the columns on screen were graded against, captured when the
   * run started. A model added afterwards gets that same brief, so editing
   * the resume mid-run cannot leave two columns scoring different text.
   */
  const scored = useRef<RunRequest | null>(null);

  const canRun =
    resume.trim() !== "" &&
    models.length >= MIN_MODELS &&
    models.length <= MAX_MODELS;

  /** Every model is graded on the identical brief, or the scores mean nothing. */
  function buildRequest() {
    if (!apiKey) return null;
    return {
      apiKey,
      messages: [
        { role: "user" as const, content: buildAtsPrompt(resume, job) },
      ],
      temperature: 0,
    };
  }

  function run() {
    const request = canRun ? buildRequest() : null;
    if (!request) return;
    scored.current = request;
    start(models, request);
  }

  /** Picker changes after a run add or drop one column instead of restarting. */
  function changeModels(next: string[]) {
    setModels(next);
    const request = scored.current;
    if (runs.length === 0 || !request) return;
    for (const modelId of next) {
      if (!runs.some((run) => run.modelId === modelId)) {
        add(modelId, request);
      }
    }
    for (const run of runs) {
      if (!next.includes(run.modelId)) remove(run.modelId);
    }
  }

  const verdicts = useMemo(
    () => runs.map((run) => ({ run, verdict: parseVerdict(run.text) })),
    [runs],
  );
  const agreement = consensus(
    verdicts
      .filter(({ run }) => run.status === "done")
      .map(({ verdict }) => verdict?.score)
      .filter((score): score is number => score !== undefined),
  );

  return (
    <main className={`flex-1 space-y-4 py-6 ${PAGE_CONTAINER}`}>
      <div className="space-y-3 rounded-xl border p-4">
        <PromptTextarea
          label="Resume"
          required
          value={resume}
          onChange={setResume}
          onSubmit={run}
          rows={12}
          placeholder="Paste the full resume text here."
          hint="Sent straight from your browser to each model. Strip anything you would not want a model to see."
        />
        <PromptTextarea
          label="Job description"
          value={job}
          onChange={setJob}
          onSubmit={run}
          rows={4}
          placeholder="Optional. Paste the posting to score against it."
        />

        <div className="space-y-1.5">
          <ModelPicker
            mode="multi"
            value={models}
            onChange={changeModels}
            max={MAX_MODELS}
            placeholder="Pick 2 to 6 graders"
          />
          {models.length < MIN_MODELS && (
            <p className="text-muted-foreground text-xs">
              Pick at least {MIN_MODELS} models, so you can see whether they
              agree.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={run} disabled={!canRun || busy}>
            <Play /> Score
          </Button>
          {busy ? (
            <Button variant="outline" onClick={cancelAll}>
              <Square /> Cancel all
            </Button>
          ) : (
            runs.length > 0 && (
              <Button variant="outline" onClick={run} disabled={!canRun}>
                <RotateCw /> Score again
              </Button>
            )
          )}
        </div>
      </div>

      {agreement && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-xl border p-4">
          <div>
            <span className="text-3xl font-semibold">{agreement.mean}</span>
            <span className="text-muted-foreground text-sm">/100 average</span>
          </div>
          <p className="text-muted-foreground text-sm">
            {agreement.count} models scored it {agreement.min} to{" "}
            {agreement.max}.{" "}
            {agreement.spread <= 10
              ? "They broadly agree."
              : `They disagree by ${agreement.spread} points, so read the reasons below.`}
          </p>
        </div>
      )}

      {runs.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Paste a resume, pick a few models, and see whether they agree on how
          good it is.
        </div>
      ) : (
        <>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {verdicts.map(({ run, verdict }) => (
              <li key={run.modelId} className="rounded-xl border p-3">
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-mono text-xs">
                    {run.modelId}
                  </span>
                  <span className="ml-auto text-2xl font-semibold tabular-nums">
                    {verdict ? verdict.score : "—"}
                  </span>
                </div>
                <div
                  className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full"
                  role="presentation"
                >
                  <div
                    className="bg-foreground h-full transition-[width]"
                    style={{ width: `${verdict?.score ?? 0}%` }}
                  />
                </div>
                <p className="text-muted-foreground mt-2 text-sm">
                  {verdict?.summary ||
                    (run.status === "error"
                      ? "Failed, see the column below."
                      : run.status === "done"
                        ? "No usable JSON verdict came back."
                        : "Scoring…")}
                </p>
                {verdict && verdict.strengths.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs">
                    {verdict.strengths.map((item) => (
                      <li key={item} className="text-emerald-600">
                        + {item}
                      </li>
                    ))}
                  </ul>
                )}
                {verdict && verdict.gaps.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {verdict.gaps.map((item) => (
                      <li key={item} className="text-amber-600">
                        − {item}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <div className="grid gap-3 sm:grid-flow-col sm:auto-cols-[minmax(21rem,1fr)] sm:overflow-x-auto sm:pb-2">
            {runs.map((columnRun) => (
              <ResponseColumn
                key={columnRun.modelId}
                run={columnRun}
                model={byId.get(columnRun.modelId)}
                onRerun={() => {
                  const request = scored.current ?? buildRequest();
                  if (request) rerun(columnRun.modelId, request);
                }}
                onCancel={() => cancel(columnRun.modelId)}
                onRemove={() => {
                  remove(columnRun.modelId);
                  setModels((prev) =>
                    prev.filter((id) => id !== columnRun.modelId),
                  );
                }}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
