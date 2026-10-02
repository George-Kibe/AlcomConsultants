import type { Metadata } from "next";

import {
  LocationLanding,
  locationMetadata,
} from "@/components/listings/location-landing";

export async function generateMetadata({
  params,
}: PageProps<"/property-for-sale/[location]">): Promise<Metadata> {
  return locationMetadata("sale", (await params).location);
}

export default async function Page({
  params,
}: PageProps<"/property-for-sale/[location]">) {
  return <LocationLanding deal="sale" slug={(await params).location} />;
}
