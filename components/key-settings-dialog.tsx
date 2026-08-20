"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { KeyForm, maskKey } from "@/components/key-form";
import { fetchKeyInfo } from "@/lib/openrouter/client";
import { OpenRouterError, type OpenRouterKeyInfo } from "@/lib/openrouter/types";
import { useAppStore } from "@/store/app-store";

type Check =
  | { ok: true; info: OpenRouterKeyInfo }
  | { ok: false; message: string };

/**
 * Mounted per key, so switching keys or reopening the dialog re-checks from
 * scratch without any state to reset.
 */
function KeyStatusLine({ apiKey }: { apiKey: string }) {
  const [check, setCheck] = useState<Check | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchKeyInfo(apiKey, controller.signal)
      .then((info) => setCheck({ ok: true, info }))
      .catch((error: unknown) => {
        if (error instanceof OpenRouterError && error.kind === "aborted") return;
        setCheck({
          ok: false,
          message:
            error instanceof OpenRouterError
              ? error.message
              : "Could not check this key.",
        });
      });
    return () => controller.abort();
  }, [apiKey]);

  if (check === null) {
    return (
      <span className="flex items-center gap-1.5">
        <Loader2 className="size-3 animate-spin" /> Checking…
      </span>
    );
  }

  if (!check.ok) return <span className="text-destructive">{check.message}</span>;

  const { info } = check;
  return (
    <>
      {info.label || "unlabelled key"} · used ${info.usage.toFixed(2)}
      {info.limit === null ? " · no spend limit" : ` of $${info.limit.toFixed(2)}`}
    </>
  );
}

export function KeySettingsDialog() {
  const open = useAppStore((s) => s.settingsOpen);
  const setOpen = useAppStore((s) => s.setSettingsOpen);
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>OpenRouter key</DialogTitle>
          <DialogDescription>
            Stored in this browser under <code>pf:openrouter_key</code>. It is
            sent only to openrouter.ai. This app has no server.
          </DialogDescription>
        </DialogHeader>

        {apiKey && (
          <div className="space-y-3">
            <div className="bg-muted/40 rounded-lg border p-3">
              <div className="font-mono text-sm">{maskKey(apiKey)}</div>
              <div className="text-muted-foreground mt-1 text-xs">
                <KeyStatusLine key={apiKey} apiKey={apiKey} />
              </div>
            </div>

            <Button variant="destructive" onClick={() => setApiKey(null)}>
              <Trash2 /> Delete key
            </Button>

            <Separator />
            <p className="text-muted-foreground text-sm">
              Replace it with a different key:
            </p>
          </div>
        )}

        <KeyForm />
      </DialogContent>
    </Dialog>
  );
}
