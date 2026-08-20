"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  RefreshCw,
  Star,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { pricePerMillion } from "@/lib/cost";
import { providerOf, useModelCatalog } from "@/lib/openrouter/models";
import type { OpenRouterModel } from "@/lib/openrouter/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

const ALL_PROVIDERS = "__all__";
/** The list is a few hundred models long; render only what a user can scan. */
const MAX_VISIBLE = 80;

type ModelPickerProps = {
  className?: string;
  placeholder?: string;
} & (
  | {
      mode: "single";
      value: string | null;
      onChange: (modelId: string | null) => void;
    }
  | {
      mode: "multi";
      value: string[];
      onChange: (modelIds: string[]) => void;
      /** Refuses to add beyond this; existing picks can still be removed. */
      max?: number;
    }
);

function formatContext(model: OpenRouterModel): string {
  const length = model.context_length ?? model.top_provider?.context_length;
  if (!length) return "context n/a";
  return length >= 1000
    ? `${Math.round(length / 1000)}k ctx`
    : `${length} ctx`;
}

function formatPrice(model: OpenRouterModel): string {
  const prompt = pricePerMillion(model.pricing?.prompt);
  const completion = pricePerMillion(model.pricing?.completion);
  if (prompt === null || completion === null) return "price varies";
  if (prompt === 0 && completion === 0) return "free";
  return `$${prompt.toFixed(2)} in / $${completion.toFixed(2)} out per 1M`;
}

/** Renders a picked id even when the catalog no longer carries that model. */
function ModelLabel({
  modelId,
  model,
}: {
  modelId: string;
  model: OpenRouterModel | undefined;
}) {
  if (model) return <>{model.name}</>;
  return (
    <span className="flex items-center gap-1">
      <AlertTriangle className="size-3 text-amber-400" />
      <span className="font-mono">{modelId}</span>
    </span>
  );
}

export function ModelPicker(props: ModelPickerProps) {
  const { className, placeholder = "Select a model" } = props;
  const { models, byId, loading, error, refresh } = useModelCatalog();
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState(ALL_PROVIDERS);

  const selected = props.mode === "single" ? props.value : null;
  const selectedMany = props.mode === "multi" ? props.value : [];
  const atMax =
    props.mode === "multi" &&
    props.max !== undefined &&
    selectedMany.length >= props.max;

  const providers = useMemo(
    () => [...new Set(models.map((m) => providerOf(m.id)))].sort(),
    [models],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = models.filter((model) => {
      if (provider !== ALL_PROVIDERS && providerOf(model.id) !== provider) {
        return false;
      }
      if (!needle) return true;
      return (
        model.id.toLowerCase().includes(needle) ||
        model.name.toLowerCase().includes(needle)
      );
    });

    // Favorites pinned to the top, then alphabetical by display name.
    const starred = new Set(favorites);
    return matches
      .sort((a, b) => {
        const byStar = Number(starred.has(b.id)) - Number(starred.has(a.id));
        return byStar !== 0 ? byStar : a.name.localeCompare(b.name);
      })
      .slice(0, MAX_VISIBLE);
  }, [models, query, provider, favorites]);

  function isSelected(modelId: string) {
    return props.mode === "single"
      ? props.value === modelId
      : props.value.includes(modelId);
  }

  function pick(modelId: string) {
    if (props.mode === "single") {
      props.onChange(props.value === modelId ? null : modelId);
      setOpen(false);
      return;
    }
    if (props.value.includes(modelId)) {
      props.onChange(props.value.filter((id) => id !== modelId));
    } else if (!atMax) {
      props.onChange([...props.value, modelId]);
    }
  }

  const triggerLabel =
    props.mode === "single" ? (
      selected ? (
        <ModelLabel modelId={selected} model={byId.get(selected)} />
      ) : (
        <span className="text-muted-foreground">{placeholder}</span>
      )
    ) : selectedMany.length === 0 ? (
      <span className="text-muted-foreground">{placeholder}</span>
    ) : (
      <span>
        {selectedMany.length} model{selectedMany.length === 1 ? "" : "s"}{" "}
        selected
      </span>
    );

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[min(30rem,calc(100vw-2rem))] p-0"
          align="start"
        >
          <div className="flex items-center gap-2 border-b p-2">
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROVIDERS}>All providers</SelectItem>
                {providers.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh model list"
              title="Refresh model list"
            >
              <RefreshCw className={cn(loading && "animate-spin")} />
            </Button>
          </div>

          {/* Filtering is ours so we can pin favourites and cap the list. */}
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search models…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-80">
              {loading && models.length === 0 ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : error ? (
                <div className="p-4 text-sm">
                  <p className="text-destructive">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={refresh}
                  >
                    <RefreshCw /> Try again
                  </Button>
                </div>
              ) : (
                <>
                  <CommandEmpty>No models match that search.</CommandEmpty>
                  <CommandGroup>
                    {visible.map((model) => {
                      const starred = favorites.includes(model.id);
                      const chosen = isSelected(model.id);
                      return (
                        <CommandItem
                          key={model.id}
                          value={model.id}
                          onSelect={() => pick(model.id)}
                          disabled={atMax && !chosen}
                          className="items-start gap-2"
                        >
                          <Check
                            className={cn(
                              "mt-0.5 size-4 shrink-0",
                              chosen ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">
                              {model.name}
                            </span>
                            <span className="text-muted-foreground block truncate font-mono text-xs">
                              {model.id}
                            </span>
                            <span className="text-muted-foreground block truncate text-xs">
                              {formatContext(model)} · {formatPrice(model)}
                            </span>
                          </span>
                          <button
                            type="button"
                            aria-label={
                              starred
                                ? `Unstar ${model.name}`
                                : `Star ${model.name}`
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite(model.id);
                            }}
                            className="hover:bg-muted mt-0.5 shrink-0 rounded p-1"
                          >
                            <Star
                              className={cn(
                                "size-3.5",
                                starred
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground",
                              )}
                            />
                          </button>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>

          {atMax && (
            <p className="text-muted-foreground border-t p-2 text-xs">
              Maximum of {props.mode === "multi" ? props.max : 0} models
              reached. Remove one to add another.
            </p>
          )}
        </PopoverContent>
      </Popover>

      {props.mode === "multi" && selectedMany.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedMany.map((modelId) => (
            <Badge key={modelId} variant="secondary" className="gap-1 pr-1">
              <ModelLabel modelId={modelId} model={byId.get(modelId)} />
              <button
                type="button"
                aria-label={`Remove ${modelId}`}
                onClick={() =>
                  props.onChange(props.value.filter((id) => id !== modelId))
                }
                className="hover:bg-background/60 rounded p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
