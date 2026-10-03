"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Flame, KeyRound, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeySettingsDialog } from "@/components/key-settings-dialog";
import { cn } from "@/lib/utils";
import { PAGE_CONTAINER } from "@/lib/layout";
import { useAppStore } from "@/store/app-store";

const NAV = [
  { href: "/generate", label: "Generate" },
  { href: "/compare", label: "Compare" },
  { href: "/ats", label: "Resume" },
  { href: "/backtranslate", label: "Backtranslate" },
  { href: "/agents", label: "Agents" },
  { href: "/temperature", label: "Temperature" },
  { href: "/history", label: "History" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);
  const apiKey = useAppStore((s) => s.apiKey);
  const openSettings = useAppStore((s) => s.openSettings);

  // localStorage only exists in the browser, and these pages are prerendered.
  useEffect(() => hydrate(), [hydrate]);

  return (
    <>
      <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className={`flex h-16 items-center gap-3 ${PAGE_CONTAINER}`}>
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-semibold"
          >
            <Flame className="size-4 text-orange-400" />
            <span className="hidden sm:inline">Prompt Forge</span>
          </Link>

          <nav className="flex items-center gap-0.5">
            {NAV.map((item) => (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  pathname.startsWith(item.href) && "bg-muted text-foreground",
                )}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {hydrated && !apiKey && (
              <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
                <KeyRound className="size-3.5" /> No key set
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={openSettings}
              aria-label="Settings"
            >
              <Settings />
            </Button>
          </div>
        </div>
      </header>

      <KeySettingsDialog />
    </>
  );
}
