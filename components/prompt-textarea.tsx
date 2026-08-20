"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PromptTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Fired on Cmd/Ctrl+Enter. */
  onSubmit?: () => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
  required?: boolean;
  className?: string;
}

export function PromptTextarea({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  hint,
  rows = 6,
  required,
  className,
}: PromptTextareaProps) {
  const id = useId();

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-muted-foreground"> *</span>}
        </Label>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      </div>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            onSubmit?.();
          }
        }}
        className="resize-y font-mono text-sm"
      />
    </div>
  );
}
