import {
  SERVICE_OUTPUT_TYPE,
  type OutputType,
  type ServiceId,
} from "./verbosity";

export interface OutputTypeInfo {
  id: OutputType;
  label: string;
  description: string;
}

export const OUTPUT_TYPES: readonly OutputTypeInfo[] = [
  {
    id: "text",
    label: "Text",
    description:
      "Free prose from the model. The answer style (verbosity) can shape it.",
  },
  {
    id: "decision",
    label: "Decision",
    description:
      "A verdict with a score, such as a grade out of 100. The format is fixed, so no answer style applies.",
  },
  {
    id: "prompt",
    label: "Prompt",
    description:
      "A finished prompt meant to be copied or reused. Its structure is the product, so no answer style applies.",
  },
  {
    id: "translation",
    label: "Translation",
    description:
      "Text carried between languages. It must stay faithful to the source, so no answer style applies.",
  },
];

export const SERVICE_INFO: Record<ServiceId, { title: string; href: string }> =
  {
    compare: { title: "Model Comparison", href: "/compare" },
    experiment: { title: "Prompt Comparison", href: "/experiment" },
    temperature: { title: "Temperature Sweep", href: "/temperature" },
    agents: { title: "Agent Conversation", href: "/agents" },
    prompted: { title: "Prompted", href: "/prompted" },
    ats: { title: "Resume Scorer", href: "/ats" },
    judge: { title: "Judge Brute Force", href: "/judge" },
    generate: { title: "Prompt Generator", href: "/generate" },
    backtranslate: { title: "Backtranslation", href: "/backtranslate" },
  };

export function servicesOfType(type: OutputType): ServiceId[] {
  return (Object.keys(SERVICE_OUTPUT_TYPE) as ServiceId[]).filter(
    (id) => SERVICE_OUTPUT_TYPE[id] === type,
  );
}
