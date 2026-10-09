import { cn } from "@/lib/utils";
import {
  VERBOSITY_STYLES,
  supportsVerbosity,
  type ServiceId,
  type VerbosityId,
} from "@/lib/verbosity";

/**
 * One row of radio-style options for the answer style. Clicking the chosen one
 * again clears it, so "no style" needs no option of its own. Renders nothing
 * for services whose output is not free text.
 */
export function VerbosityPicker({
  service,
  value,
  onChange,
}: {
  service: ServiceId;
  value: VerbosityId | null;
  onChange: (next: VerbosityId | null) => void;
}) {
  if (!supportsVerbosity(service)) return null;

  return (
    <div className="space-y-1.5">
      <span id={`verbosity-${service}`} className="block text-sm font-medium">
        Answer style
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`verbosity-${service}`}
        className="flex flex-wrap gap-x-4 gap-y-1.5"
      >
        {VERBOSITY_STYLES.map((style) => {
          const checked = value === style.id;
          return (
            <button
              key={style.id}
              type="button"
              role="radio"
              aria-checked={checked}
              title={style.description}
              onClick={() => onChange(checked ? null : style.id)}
              className="focus-visible:ring-ring flex items-center gap-1.5 rounded text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-4 place-items-center rounded-full border",
                  checked && "border-orange-400",
                )}
              >
                {checked && (
                  <span className="size-2 rounded-full bg-orange-400" />
                )}
              </span>
              {style.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
