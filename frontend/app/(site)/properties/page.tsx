import type { Metadata } from "next";
import { HomeIcon } from "lucide-react";

import { WhatsAppIcon } from "@/components/icons";
import { Pagination } from "@/components/listings/pagination";
import { SearchFilters } from "@/components/listings/search-filters";
import { SearchMapLoader } from "@/components/listings/search-map-loader";
import { PropertyCard } from "@/components/site/property-card";
import { Button } from "@/components/ui/button";
import { safely, serverApi } from "@/lib/api/server";
import { apiQuery, readSearch, searchHeading } from "@/lib/listings";
import { whatsappLink } from "@/lib/site-config";

async function lookups() {
  const [types, amenities] = await Promise.all([
    safely(() => serverApi.GET("/api/v1/property-types/")),
    safely(() => serverApi.GET("/api/v1/amenities/")),
  ]);
  return { types: types.data ?? [], amenities: amenities.data ?? [] };
}

export async function generateMetadata({
  searchParams,
}: PageProps<"/properties">): Promise<Metadata> {
  const state = readSearch(await searchParams);
  const { types } = await lookups();
  const typeName = types.find((t) => t.slug === state.type)?.name;
  const title = searchHeading(state, typeName);
  return {
    title,
    description: `${title}. Browse photos, prices and locations, and contact Alcom Consultants.`,
    alternates: { canonical: "/properties" },
  };
}

export default async function PropertiesPage({
  searchParams,
}: PageProps<"/properties">) {
  const state = readSearch(await searchParams);
  const query = apiQuery(state);
  const [results, { types, amenities }] = await Promise.all([
    state.view === "map"
      ? Promise.resolve({ data: null, status: 200 })
      : safely(() =>
          serverApi.GET("/api/v1/properties/", {
            params: { query: query as never },
          }),
        ),
    lookups(),
  ]);
  const typeName = types.find((t) => t.slug === state.type)?.name;
  const unavailable = state.view !== "map" && results.data === null;
  const items = results.data?.results ?? [];

  return (
    <>
      <section className="bg-muted/60 border-b">
        <div className="container-page flex flex-col gap-5 py-8 sm:py-10">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {searchHeading(state, typeName)}
          </h1>
          <SearchFilters
            state={state}
            types={types}
            amenities={amenities}
            total={results.data?.count ?? null}
          />
        </div>
      </section>

      <section
        className="container-page flex flex-col gap-8 py-8 sm:py-10"
        aria-label="Search results"
      >
        {state.view === "map" ? (
          <SearchMapLoader state={state} />
        ) : unavailable ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <HomeIcon className="text-muted-foreground size-10" aria-hidden />
            <h2 className="text-xl font-semibold">
              Listings are temporarily unavailable
            </h2>
            <p className="text-muted-foreground max-w-md">
              Please try again in a moment, or tell us what you&apos;re looking
              for on WhatsApp.
            </p>
            <Button asChild size="xl" variant="whatsapp">
              <a
                href={whatsappLink("Hello Alcom, I'm looking for a property.")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="size-5" data-icon="inline-start" />
                Tell us what you need
              </a>
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <h2 className="text-xl font-semibold">
              No properties match your search
            </h2>
            <p className="text-muted-foreground max-w-md">
              Try removing a filter, or ask us — we often have properties that
              aren&apos;t listed yet.
            </p>
            <Button asChild variant="outline" size="lg">
              <a
                href={whatsappLink("Hello Alcom, I'm looking for a property.")}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ask on WhatsApp
              </a>
            </Button>
          </div>
        ) : (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <li key={p.slug}>
                  <PropertyCard
                    property={p}
                    headingLevel="h2"
                    className="h-full"
                  />
                </li>
              ))}
            </ul>
            <Pagination state={state} total={results.data?.count ?? 0} />
          </>
        )}
      </section>
    </>
  );
}
