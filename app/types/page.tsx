import Link from "next/link";
import { PAGE_GUTTER } from "@/lib/layout";
import { OUTPUT_TYPES, SERVICE_INFO, servicesOfType } from "@/lib/output-types";
import { supportsVerbosity } from "@/lib/verbosity";

export default function TypesPage() {
  return (
    <main className={`mx-auto w-full max-w-3xl py-12 sm:py-16 ${PAGE_GUTTER}`}>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Types
      </h1>
      <p className="text-muted-foreground mt-2 text-sm sm:text-base">
        Every service declares what kind of output it produces. The type decides
        which options make sense for it, such as an{" "}
        <Link href="/verbosity" className="underline underline-offset-2">
          answer style
        </Link>
        .
      </p>

      <ul className="mt-8 space-y-4">
        {OUTPUT_TYPES.map((type) => {
          const services = servicesOfType(type.id);
          return (
            <li key={type.id} className="rounded-xl border">
              <header className="flex items-center gap-2 border-b px-4 py-2.5">
                <h2 className="flex-1 font-mono text-sm font-medium">
                  {type.id}
                </h2>
                <span className="text-muted-foreground text-xs">
                  {services.length} service{services.length === 1 ? "" : "s"}
                  {supportsVerbosity(services[0]) && " · answer style"}
                </span>
              </header>
              <div className="space-y-3 p-4">
                <p className="text-sm">{type.description}</p>
                <ul className="flex flex-wrap gap-2">
                  {services.map((id) => (
                    <li key={id}>
                      <Link
                        href={SERVICE_INFO[id].href}
                        className="hover:bg-muted/50 rounded-md border px-2.5 py-1 text-sm transition-colors"
                      >
                        {SERVICE_INFO[id].title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
