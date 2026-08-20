"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Maximize2,
  MoreVertical,
  RotateCw,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { estimateCost, formatUsd } from "@/lib/cost";
import type { OpenRouterModel } from "@/lib/openrouter/types";
import type { ColumnRun, RunStatus } from "@/lib/use-model-runs";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<RunStatus, { dot: string; label: string }> = {
  queued: { dot: "bg-muted-foreground animate-pulse", label: "Queued" },
  streaming: { dot: "bg-sky-400 animate-pulse", label: "Streaming" },
  done: { dot: "bg-emerald-400", label: "Done" },
  error: { dot: "bg-destructive", label: "Error" },
  cancelled: { dot: "bg-amber-400", label: "Cancelled" },
};

/** Turns an OpenRouter failure into something a human can act on. */
function errorAdvice(run: ColumnRun): string | null {
  switch (run.errorKind) {
    case "unauthorized":
      return "Check your key in Settings, it may have been revoked.";
    case "no_credits":
      return "Top up your OpenRouter account, then retry.";
    case "rate_limited":
      return "This provider is throttling you. Wait a few seconds and retry.";
    case "network":
      return "The request never reached openrouter.ai. Check your connection.";
    default:
      return null;
  }
}

/** Copy-to-clipboard with a brief confirmation tick. */
export function CopyButton({
  text,
  size = "icon-sm",
  label = "Copy output",
}: {
  text: string;
  size?: "icon-sm" | "sm";
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="ghost"
      size={size}
      aria-label={label}
      title={label}
      disabled={text === ""}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => setCopied(true));
      }}
    >
      {copied ? <Check className="text-emerald-400" /> : <Copy />}
      {size === "sm" && (copied ? "Copied" : "Copy")}
    </Button>
  );
}

function Metrics({
  run,
  model,
}: {
  run: ColumnRun;
  model: OpenRouterModel | undefined;
}) {
  const cost = estimateCost(model, run.usage ?? undefined);

  return (
    <dl className="text-muted-foreground grid grid-cols-3 gap-x-2 border-t px-3 py-2 text-[11px]">
      <div>
        <dt className="uppercase tracking-wide opacity-70">Latency</dt>
        <dd className="text-foreground font-mono">
          {run.ttftMs === null ? "–" : `${Math.round(run.ttftMs)}ms`}
          <span className="text-muted-foreground">
            {run.totalMs === null ? "" : ` / ${Math.round(run.totalMs)}ms`}
          </span>
        </dd>
      </div>
      <div>
        <dt className="uppercase tracking-wide opacity-70">Tokens</dt>
        <dd className="text-foreground font-mono">
          {run.usage
            ? `${run.usage.prompt_tokens}/${run.usage.completion_tokens}`
            : "–"}
        </dd>
      </div>
      <div>
        <dt className="uppercase tracking-wide opacity-70">Est. cost</dt>
        <dd className="text-foreground font-mono">{formatUsd(cost)}</dd>
      </div>
    </dl>
  );
}

interface ResponseColumnProps {
  run: ColumnRun;
  model: OpenRouterModel | undefined;
  onRerun: () => void;
  onCancel: () => void;
  /** Set when sync scroll is on; receives this column's scroll ratio. */
  onScroll?: (ratio: number) => void;
  scrollRatio?: number | null;
}

export function ResponseColumn({
  run,
  model,
  onRerun,
  onCancel,
  onScroll,
  scrollRatio,
}: ResponseColumnProps) {
  const [expanded, setExpanded] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const applyingRemote = useRef(false);

  const active = run.status === "queued" || run.status === "streaming";
  const status = STATUS_STYLE[run.status];
  const advice = errorAdvice(run);

  // Mirror another column's scroll position when sync scroll is enabled.
  useEffect(() => {
    const node = bodyRef.current;
    if (!node || scrollRatio === null || scrollRatio === undefined) return;
    const target = scrollRatio * (node.scrollHeight - node.clientHeight);
    if (Math.abs(node.scrollTop - target) < 2) return;
    applyingRemote.current = true;
    node.scrollTop = target;
  }, [scrollRatio]);

  const body = (
    <div
      ref={bodyRef}
      onScroll={(event) => {
        if (applyingRemote.current) {
          applyingRemote.current = false;
          return;
        }
        const node = event.currentTarget;
        const scrollable = node.scrollHeight - node.clientHeight;
        if (scrollable > 0) onScroll?.(node.scrollTop / scrollable);
      }}
      className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
    >
      {run.error ? (
        <div className="text-sm">
          <p className="text-destructive flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{run.error}</span>
          </p>
          {advice && (
            <p className="text-muted-foreground mt-2 text-xs">{advice}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onRerun}
          >
            <RotateCw /> Retry
          </Button>
        </div>
      ) : run.text ? (
        <pre className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
          {run.text}
        </pre>
      ) : run.status === "cancelled" ? (
        <p className="text-muted-foreground text-sm">
          Cancelled before any output arrived.
        </p>
      ) : active ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-[92%]" />
          <Skeleton className="h-3 w-[78%]" />
          <Skeleton className="h-3 w-[85%]" />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No output.</p>
      )}
    </div>
  );

  return (
    <>
      <section className="bg-card flex min-h-[22rem] flex-col overflow-hidden rounded-xl border sm:min-h-0">
        <header className="flex items-center gap-2 border-b px-3 py-2">
          <span
            className={cn("size-2 shrink-0 rounded-full", status.dot)}
            role="img"
            aria-label={status.label}
            title={status.label}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {model?.name ?? run.modelId}
            </div>
            <div className="text-muted-foreground truncate font-mono text-[11px]">
              {run.modelId}
            </div>
          </div>

          <CopyButton text={run.text} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Column actions"
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setExpanded(true)}>
                <Maximize2 /> Expand
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onRerun}>
                <RotateCw /> Rerun this model
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onCancel} disabled={!active}>
                <Square /> Cancel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {body}
        <Metrics run={run} model={model} />
      </section>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="flex h-[85vh] max-w-[min(64rem,calc(100vw-2rem))] flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {model?.name ?? run.modelId}
              <CopyButton text={run.text} size="sm" />
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {run.text || "No output."}
            </pre>
          </div>
          <Metrics run={run} model={model} />
        </DialogContent>
      </Dialog>
    </>
  );
}
