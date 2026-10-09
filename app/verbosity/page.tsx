import Link from "next/link";
import { CopyButton } from "@/components/response-column";
import { PAGE_GUTTER } from "@/lib/layout";
import {
  SERVICE_OUTPUT_TYPE,
  VERBOSITY_STYLES,
  supportsVerbosity,
  type ServiceId,
} from "@/lib/verbosity";

const APPLIES_TO = (Object.keys(SERVICE_OUTPUT_TYPE) as ServiceId[]).filter(
  supportsVerbosity,
);

export default function VerbosityPage() {
  return (
    <main className={`mx-auto w-full max-w-3xl py-12 sm:py-16 ${PAGE_GUTTER}`}>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Verbosity
      </h1>
      <p className="text-muted-foreground mt-2 text-sm sm:text-base">
        The answer style you pick on a form is appended to the system prompt
        (added if there is none). These are the exact instructions each style
        sends.
      </p>
      <p className="text-muted-foreground mt-2 text-xs">
        Applies to services with free-text output:{" "}
        <span className="font-mono">{APPLIES_TO.join(", ")}</span>. Services
        that return a score, a prompt or a translation do not offer it. See{" "}
        <Link href="/types" className="underline underline-offset-2">
          Types
        </Link>
        .
      </p>

      <ul className="mt-8 space-y-4">
        {VERBOSITY_STYLES.map((style) => (
          <li key={style.id} className="rounded-xl border">
            <header className="flex items-center gap-2 border-b px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-medium">{style.label}</h2>
                <p className="text-muted-foreground text-xs">
                  {style.description}
                </p>
              </div>
              <CopyButton
                text={style.prompt}
                label={`Copy ${style.label} prompt`}
              />
            </header>
            <pre className="p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
              {style.prompt}
            </pre>
          </li>
        ))}
      </ul>
    </main>
  );
}
