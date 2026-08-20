import { estimateCost, formatUsd } from "./cost";
import type { OpenRouterModel } from "./openrouter/types";
import type { ColumnRun } from "./use-model-runs";

export interface ComparisonExport {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number | null;
  runs: ColumnRun[];
  byId: Map<string, OpenRouterModel>;
}

function metricsLine(
  run: ColumnRun,
  byId: Map<string, OpenRouterModel>,
): string {
  const parts = [
    run.ttftMs === null ? null : `first token ${Math.round(run.ttftMs)}ms`,
    run.totalMs === null ? null : `total ${Math.round(run.totalMs)}ms`,
    run.usage
      ? `${run.usage.prompt_tokens} prompt / ${run.usage.completion_tokens} completion tokens`
      : null,
    run.usage
      ? `${formatUsd(estimateCost(byId.get(run.modelId), run.usage))} estimated`
      : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : "no metrics recorded";
}

export function toMarkdown(data: ComparisonExport): string {
  const lines: string[] = ["# Prompt comparison", ""];

  if (data.systemPrompt.trim()) {
    lines.push("## System prompt", "", "```text", data.systemPrompt, "```", "");
  }
  lines.push("## User prompt", "", "```text", data.userPrompt, "```", "");
  lines.push(
    "## Parameters",
    "",
    `- temperature: ${data.temperature}`,
    `- max_tokens: ${data.maxTokens ?? "provider default"}`,
    "",
  );

  for (const run of data.runs) {
    const model = data.byId.get(run.modelId);
    lines.push(`## ${model?.name ?? run.modelId}`, "");
    lines.push(`\`${run.modelId}\` — ${run.status}`, "");
    lines.push(`_${metricsLine(run, data.byId)}_`, "");
    if (run.error) lines.push(`> Error: ${run.error}`, "");
    if (run.text) lines.push(run.text, "");
  }

  return lines.join("\n");
}

export function toJson(data: ComparisonExport): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      systemPrompt: data.systemPrompt,
      userPrompt: data.userPrompt,
      parameters: { temperature: data.temperature, max_tokens: data.maxTokens },
      results: data.runs.map((run) => ({
        modelId: run.modelId,
        modelName: data.byId.get(run.modelId)?.name ?? null,
        status: run.status,
        output: run.text,
        error: run.error,
        metrics: {
          timeToFirstTokenMs: run.ttftMs === null ? null : Math.round(run.ttftMs),
          totalMs: run.totalMs === null ? null : Math.round(run.totalMs),
          usage: run.usage,
          estimatedCostUsd: estimateCost(data.byId.get(run.modelId), run.usage ?? undefined),
        },
      })),
    },
    null,
    2,
  );
}

/** Client-side file download; no server, no upload. */
export function downloadText(
  filename: string,
  contents: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
