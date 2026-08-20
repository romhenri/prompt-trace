"use client";

import Link from "next/link";
import { ArrowRight, Columns3, ShieldCheck, Sparkles } from "lucide-react";
import { KeyForm, maskKey } from "@/components/key-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/app-store";

const TOOLS = [
  {
    href: "/generate",
    icon: Sparkles,
    title: "Prompt Generator",
    body: "Describe the job. Get back a structured, production-ready prompt you can copy or send straight to a comparison.",
  },
  {
    href: "/compare",
    icon: Columns3,
    title: "Prompt Comparison",
    body: "Run one prompt across 2 to 6 models at once, streaming side by side, with latency, tokens and estimated cost per column.",
  },
];

export default function Home() {
  const hydrated = useAppStore((s) => s.hydrated);
  const apiKey = useAppStore((s) => s.apiKey);
  const openSettings = useAppStore((s) => s.openSettings);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Prompt Forge
      </h1>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">
        Two small tools for working with LLM prompts, running entirely in your
        browser against your own OpenRouter key.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="hover:border-foreground/25 hover:bg-muted/40 focus-visible:ring-ring group rounded-xl border p-5 transition-colors focus-visible:ring-3 focus-visible:outline-none"
          >
            <tool.icon className="size-5 text-orange-400" />
            <h2 className="mt-3 flex items-center gap-1.5 font-medium">
              {tool.title}
              <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">{tool.body}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10 rounded-xl border p-5">
        {!hydrated ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : apiKey ? (
          <div className="flex flex-wrap items-center gap-3">
            <ShieldCheck className="size-5 shrink-0 text-emerald-400" />
            <div className="min-w-0">
              <div className="text-sm font-medium">Key saved in this browser</div>
              <div className="text-muted-foreground font-mono text-xs">
                {maskKey(apiKey)}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={openSettings}>
              Manage
            </Button>
          </div>
        ) : (
          <>
            <h2 className="font-medium">Start with your OpenRouter key</h2>
            <p className="text-muted-foreground mt-1.5 mb-4 text-sm">
              Prompt Forge has no server and no accounts. Your key is kept in
              this browser&apos;s localStorage and is sent to openrouter.ai and
              nowhere else. Every model call is billed to your own OpenRouter
              account.
            </p>
            <KeyForm />
          </>
        )}
      </section>
    </main>
  );
}
