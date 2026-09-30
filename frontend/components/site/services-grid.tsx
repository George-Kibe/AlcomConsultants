import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { ServiceIcon } from "@/components/site/service-icon";
import { services } from "@/lib/site-config";

export function ServicesGrid({
  headingLevel = "h3",
}: {
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <ul className="grid gap-5 md:grid-cols-3">
      {services.map((service) => (
        <li key={service.slug}>
          <Link
            href={`/services/${service.slug}`}
            className="group bg-card hover:border-primary/40 flex h-full flex-col gap-4 rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none"
          >
            <span className="bg-secondary text-primary flex size-12 items-center justify-center rounded-xl">
              <ServiceIcon slug={service.slug} className="size-6" />
            </span>
            <Heading className="text-xl font-semibold">{service.title}</Heading>
            <p className="text-muted-foreground flex-1">{service.summary}</p>
            <span className="text-primary flex items-center gap-1 font-medium">
              Learn more
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
