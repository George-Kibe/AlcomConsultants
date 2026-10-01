"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/** Leaflet needs the browser, so the map is only rendered on the client. */
export const SearchMapLoader = dynamic(() => import("./search-map"), {
  ssr: false,
  loading: () => (
    <Skeleton className="h-[65vh] min-h-[420px] w-full rounded-2xl" />
  ),
});
