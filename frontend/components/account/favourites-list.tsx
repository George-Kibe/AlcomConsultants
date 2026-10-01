"use client";

import { HeartIcon } from "lucide-react";
import Link from "next/link";

import { PropertyCard } from "@/components/site/property-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavourites } from "@/lib/api/visitor";

export function FavouritesList() {
  const favourites = useFavourites();

  if (favourites.isPending) {
    return (
      <div
        aria-busy="true"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />
        ))}
        <span className="sr-only">Loading saved properties…</span>
      </div>
    );
  }
  if (favourites.isError) {
    return (
      <p role="alert" className="text-destructive">
        Couldn&apos;t load your saved properties. Please try again.
      </p>
    );
  }
  if (favourites.data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
        <HeartIcon className="text-muted-foreground size-10" aria-hidden />
        <h2 className="text-xl font-semibold">No saved properties yet</h2>
        <p className="text-muted-foreground max-w-md">
          Tap the heart on any property to keep it here and compare later.
        </p>
        <Button asChild size="lg">
          <Link href="/properties">Browse properties</Link>
        </Button>
      </div>
    );
  }
  return (
    <section aria-label="Saved properties" className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm" role="status">
        {favourites.data.length} saved{" "}
        {favourites.data.length === 1 ? "property" : "properties"}
      </p>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {favourites.data.map((p) => (
          <li key={p.slug}>
            <PropertyCard property={p} headingLevel="h2" className="h-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
