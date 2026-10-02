import type { Metadata } from "next";
import { ArrowRightIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { JsonLd } from "@/components/json-ld";
import { CtaBand } from "@/components/site/cta-band";
import { PageHeader } from "@/components/site/page-header";
import { PropertyCard } from "@/components/site/property-card";
import { Button } from "@/components/ui/button";
import { safely, serverApi } from "@/lib/api/server";
import { formatListingPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { searchHref } from "@/lib/listings";
import {
  DEALS,
  locationHref,
  placeName,
  type Deal,
  type LocationPage,
} from "@/lib/seo";

const SHOWN = 24;

/** Every location page (cached per request; shared by metadata and the page). */
export const loadLocationPages = cache(async (): Promise<LocationPage[]> => {
  const result = await safely(() => serverApi.GET("/api/v1/seo/locations/"));
  return result.data ?? [];
});

async function loadPage(deal: Deal, slug: string) {
  const pages = await loadLocationPages();
  const page =
    pages.find(
      (p) => p.deal === deal && p.slug === slug && p.kind === "area",
    ) ?? pages.find((p) => p.deal === deal && p.slug === slug);
  if (!page) notFound();
  return { page, pages };
}

function heading(deal: Deal, page: LocationPage) {
  return `${DEALS[deal].title} in ${page.name}`;
}

export async function locationMetadata(
  deal: Deal,
  slug: string,
): Promise<Metadata> {
  const { page } = await loadPage(deal, slug);
  const title = `${heading(deal, page)}${page.kind === "area" ? `, ${page.county}` : ""}`;
  const n = page.listings;
  return {
    title,
    description: `${DEALS[deal].title} in ${placeName(page)}: ${n} ${n === 1 ? "listing" : "listings"} with photos, prices and locations. Talk to Alcom Consultants, registered valuers and estate agents.`,
    alternates: { canonical: locationHref(page) },
    // Only pages with real (non-demo) listings are worth a place in Google's index.
    ...(page.real_listings === 0 && { robots: { index: false, follow: true } }),
  };
}

export async function LocationLanding({
  deal,
  slug,
}: {
  deal: Deal;
  slug: string;
}) {
  const { page, pages } = await loadPage(deal, slug);
  const filter =
    page.kind === "area" ? { area: page.slug } : { county: page.slug };
  const result = await safely(() =>
    serverApi.GET("/api/v1/properties/", {
      params: {
        query: { deal, ...filter, sort: "newest", page_size: SHOWN } as never,
      },
    }),
  );
  const items = result.data?.results ?? [];
  const total = result.data?.count ?? page.listings;
  const prices = items
    .filter(
      (p) =>
        p.price && !p.price_on_request && p.price_unit === items[0]?.price_unit,
    )
    .map((p) => p.price!);
  const types = [...new Set(items.map((p) => p.property_type.name))];
  const searchLink = searchHref({
    deal,
    ...filter,
    where: placeName(page),
  });

  // Nearby: other areas in the same county with this kind of listing.
  const nearby = pages
    .filter(
      (p) =>
        p.deal === deal &&
        p.kind === "area" &&
        p.county_slug === page.county_slug &&
        p.slug !== page.slug,
    )
    .slice(0, 12);
  const otherDeals = pages.filter(
    (p) => p.slug === page.slug && p.kind === page.kind && p.deal !== deal,
  );
  const county =
    page.kind === "area"
      ? pages.find(
          (p) =>
            p.deal === deal &&
            p.kind === "county" &&
            p.slug === page.county_slug,
        )
      : undefined;

  const breadcrumbs = [
    { title: "Properties", href: "/properties" },
    ...(county
      ? [{ title: heading(deal, county), href: locationHref(county) }]
      : []),
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: heading(deal, page),
          numberOfItems: total,
          itemListElement: items.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: new URL(`/properties/${p.slug}`, siteConfig.url).toString(),
            name: p.title,
          })),
        }}
      />
      <PageHeader
        title={heading(deal, page)}
        intro={`${total} ${total === 1 ? "listing" : "listings"} in ${placeName(page)}${
          types.length
            ? `, including ${types.slice(0, 4).join(", ").toLowerCase()}`
            : ""
        }${
          prices.length
            ? `, from ${formatListingPrice(Math.min(...prices), items[0]?.price_unit ?? "total")}`
            : ""
        }.`}
        breadcrumbs={breadcrumbs}
      />

      <section
        aria-label="Listings"
        className="container-page flex flex-col gap-8 py-10 sm:py-14"
      >
        {items.length === 0 ? (
          <p className="text-muted-foreground">
            Nothing listed here right now. Ask us on WhatsApp: we often have
            properties that aren&apos;t listed yet.
          </p>
        ) : (
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
        )}
        <div className="flex flex-wrap gap-3">
          <Button asChild size="xl">
            <Link href={searchLink}>
              {total > items.length
                ? `See all ${total} on the search page`
                : "Filter and see them on a map"}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>

      {(nearby.length > 0 || otherDeals.length > 0) && (
        <section
          aria-labelledby="related-locations"
          className="container-page pb-12 sm:pb-16"
        >
          <h2 id="related-locations" className="mb-4 text-2xl font-bold">
            {nearby.length > 0
              ? `Nearby in ${page.county}`
              : "Also in this area"}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {[...nearby, ...otherDeals].map((p) => (
              <li key={`${p.deal}-${p.kind}-${p.slug}`}>
                <Link
                  href={locationHref(p)}
                  className="bg-card hover:border-primary/40 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm"
                >
                  <MapPinIcon className="text-success size-4" aria-hidden />
                  {heading(p.deal as Deal, p)}
                  <span className="text-muted-foreground">({p.listings})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CtaBand
        title={`Selling or letting in ${page.name}?`}
        text="Tell us about your property and one of our consultants will get back to you with a valuation and a plan to market it."
      />
    </>
  );
}
