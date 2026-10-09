import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PAGE_GUTTER } from "@/lib/layout";
import { PROMPTED_SERVICES } from "@/lib/prompted";

export default function PromptedPage() {
  return (
    <main className={`mx-auto w-full max-w-4xl py-12 sm:py-16 ${PAGE_GUTTER}`}>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Prompted
      </h1>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">
        Services with the prompt already written. Bring your input, pick a
        model, and run.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {PROMPTED_SERVICES.map((service) => (
          <Link
            key={service.slug}
            href={`/prompted/${service.slug}`}
            className="hover:border-foreground/25 hover:bg-muted/40 focus-visible:ring-ring group rounded-xl border p-5 transition-colors focus-visible:ring-3 focus-visible:outline-none"
          >
            <service.icon className="size-5 text-orange-400" />
            <h2 className="mt-3 flex items-center gap-1.5 font-medium">
              {service.title}
              <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {service.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
