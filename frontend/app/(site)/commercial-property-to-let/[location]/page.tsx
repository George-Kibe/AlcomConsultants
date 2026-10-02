import type { Metadata } from "next";

import {
  LocationLanding,
  locationMetadata,
} from "@/components/listings/location-landing";

export async function generateMetadata({
  params,
}: PageProps<"/commercial-property-to-let/[location]">): Promise<Metadata> {
  return locationMetadata("lease", (await params).location);
}

export default async function Page({
  params,
}: PageProps<"/commercial-property-to-let/[location]">) {
  return <LocationLanding deal="lease" slug={(await params).location} />;
}
