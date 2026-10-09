"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Styled per element because the project has no typography plugin. Raw HTML in
 * the source is not rendered (react-markdown's default), so model output
 * cannot inject markup.
 */
const COMPONENTS: Components = {
  h1: (p) => <h1 className="mt-5 mb-2 text-xl font-semibold" {...p} />,
  h2: (p) => <h2 className="mt-5 mb-2 text-lg font-semibold" {...p} />,
  h3: (p) => <h3 className="mt-4 mb-1.5 font-semibold" {...p} />,
  p: (p) => <p className="my-2 leading-relaxed" {...p} />,
  ul: (p) => <ul className="my-2 list-disc space-y-1 pl-5" {...p} />,
  ol: (p) => <ol className="my-2 list-decimal space-y-1 pl-5" {...p} />,
  blockquote: (p) => (
    <blockquote
      className="text-muted-foreground my-2 border-l-2 pl-3 italic"
      {...p}
    />
  ),
  a: (p) => (
    <a
      className="text-sky-400 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...p}
    />
  ),
  pre: (p) => (
    <pre
      className="bg-muted my-3 overflow-x-auto rounded-md p-3 font-mono text-[13px]"
      {...p}
    />
  ),
  code: ({ className, ...p }) => (
    <code
      className={
        className ?? "bg-muted rounded px-1 py-0.5 font-mono text-[0.9em]"
      }
      {...p}
    />
  ),
  table: (p) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...p} />
    </div>
  ),
  th: (p) => <th className="border px-2 py-1 text-left font-medium" {...p} />,
  td: (p) => <td className="border px-2 py-1" {...p} />,
  hr: () => <hr className="my-4" />,
};

/** Renders Markdown (with GFM tables and task lists) as formatted content. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm [&>*:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** The "md" button that flips a result between raw text and rendered Markdown. */
export function MarkdownToggle({
  pressed,
  onToggle,
}: {
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Render as Markdown"
      aria-pressed={pressed}
      title="Render as Markdown"
      onClick={onToggle}
      className={cn("font-mono text-xs", pressed && "bg-muted text-sky-400")}
    >
      md
    </Button>
  );
}

/**
 * Plain text with its own md toggle pinned to the top-right, for result cards
 * that have no header row to put the button in.
 */
export function RenderableText({
  text,
  placeholder = "",
}: {
  text: string;
  placeholder?: string;
}) {
  const [rendered, setRendered] = useState(false);

  return (
    <div className="relative">
      {text && (
        <div className="absolute top-0 right-0">
          <MarkdownToggle
            pressed={rendered}
            onToggle={() => setRendered((value) => !value)}
          />
        </div>
      )}
      {rendered && text ? (
        <div className="pr-8">
          <Markdown>{text}</Markdown>
        </div>
      ) : (
        <p className={cn("text-sm whitespace-pre-wrap", text && "pr-8")}>
          {text || placeholder}
        </p>
      )}
    </div>
  );
}
