"use client";

import {
  BusIcon,
  GraduationCapIcon,
  HospitalIcon,
  ShoppingBagIcon,
  TreePineIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { components } from "@/lib/api/schema";

type Group = components["schemas"]["NearbyGroup"];
const ICONS: Record<string, LucideIcon> = {
  Schools: GraduationCapIcon,
  Health: HospitalIcon,
  Shopping: ShoppingBagIcon,
  Transport: BusIcon,
  Parks: TreePineIcon,
};

const distance = (m: number) =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;

/** Loaded after the page so a slow OpenStreetMap lookup never delays the listing. */
export function NearbyPlaces({
  slug,
  approximate,
}: {
  slug: string;
  approximate: boolean;
}) {
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/properties/${slug}/nearby/`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then(setGroups)
      .catch(() => setGroups([]));
    return () => controller.abort();
  }, [slug]);

  if (groups === null) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold">Nearby</h3>
      <ul className="grid gap-4 sm:grid-cols-2">
        {groups.map((g) => {
          const Icon = ICONS[g.category] ?? GraduationCapIcon;
          return (
            <li key={g.category} className="bg-muted/60 rounded-xl p-4">
              <p className="mb-2 flex items-center gap-2 font-medium">
                <Icon className="text-success size-5" aria-hidden />
                {g.category}
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {g.places.map((p) => (
                  <li key={p.name} className="flex justify-between gap-3">
                    <span className="truncate">{p.name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {distance(p.distance_m)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground text-xs">
        {approximate ? "Distances are approximate. " : ""}Map data ©
        OpenStreetMap contributors.
      </p>
    </div>
  );
}
