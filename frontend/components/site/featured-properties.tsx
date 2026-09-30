import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { PropertyCard } from "@/components/site/property-card";
import type { PropertySummary } from "@/lib/properties";

export function FeaturedProperties({
  properties,
}: {
  properties: PropertySummary[];
}) {
  if (properties.length === 0) return null;

  return (
    <section className="py-16 sm:py-20" aria-labelledby="featured-heading">
      <div className="container-page">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2
              id="featured-heading"
              className="text-3xl font-bold sm:text-4xl"
            >
              Featured properties
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              A selection of homes and investments currently on offer.
            </p>
          </div>
          <Link
            href="/properties"
            className="text-primary flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            View all properties
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* Mobile: swipeable row. Tablet and up: grid. */}
      <ul className="container-page -my-2 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-4 overflow-x-auto py-2 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-6 sm:overflow-visible lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
        {properties.map((property) => (
          <li
            key={property.slug}
            className="w-[85%] shrink-0 snap-start sm:w-auto"
          >
            <PropertyCard property={property} className="h-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
