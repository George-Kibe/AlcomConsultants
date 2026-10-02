import { MapPinIcon } from "lucide-react";
import Link from "next/link";

import { loadLocationPages } from "@/components/listings/location-landing";
import { DEALS, locationHref, type Deal } from "@/lib/seo";

/** Links to the busiest location pages, grouped by deal (internal links for search). */
export async function PopularLocations({ perDeal = 8 }: { perDeal?: number }) {
  const pages = await loadLocationPages();
  const groups = (Object.keys(DEALS) as Deal[])
    .map((deal) => ({
      deal,
      pages: pages.filter((p) => p.deal === deal).slice(0, perDeal),
    }))
    .filter((g) => g.pages.length > 0);
  if (groups.length === 0) return null;

  return (
    <section
      aria-labelledby="popular-locations"
      className="container-page py-12 sm:py-16"
    >
      <h2
        id="popular-locations"
        className="mb-6 text-2xl font-bold sm:text-3xl"
      >
        Browse by location
      </h2>
      <div className="grid gap-8 md:grid-cols-3">
        {groups.map(({ deal, pages: list }) => (
          <div key={deal}>
            <h3 className="mb-3 font-semibold">{DEALS[deal].title}</h3>
            <ul className="flex flex-col gap-2 text-sm">
              {list.map((p) => (
                <li key={`${p.kind}-${p.slug}`}>
                  <Link
                    href={locationHref(p)}
                    className="text-primary inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                  >
                    <MapPinIcon className="text-success size-4" aria-hidden />
                    {DEALS[deal].title} in {p.name}
                    {p.kind === "county" ? " County" : ""}
                    <span className="text-muted-foreground">
                      ({p.listings})
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
