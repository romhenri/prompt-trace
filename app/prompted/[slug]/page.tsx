import { notFound } from "next/navigation";
import { getPromptedService, PROMPTED_SERVICES } from "@/lib/prompted";
import { PromptedRunner } from "./prompted-runner";

export const dynamicParams = false;

export function generateStaticParams() {
  return PROMPTED_SERVICES.map((s) => ({ slug: s.slug }));
}

export default async function PromptedServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getPromptedService(slug);
  if (!service) notFound();

  // Only plain strings cross into the client component; the icon does not.
  return (
    <PromptedRunner
      title={service.title}
      description={service.description}
      systemPrompt={service.systemPrompt}
      inputLabel={service.inputLabel}
      inputPlaceholder={service.inputPlaceholder}
    />
  );
}
