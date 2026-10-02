import type { Metadata } from "next";

import {
  LocationLanding,
  locationMetadata,
} from "@/components/listings/location-landing";

export async function generateMetadata({
  params,
}: PageProps<"/property-for-rent/[location]">): Promise<Metadata> {
  return locationMetadata("rent", (await params).location);
}

export default async function Page({
  params,
}: PageProps<"/property-for-rent/[location]">) {
  return <LocationLanding deal="rent" slug={(await params).location} />;
}
