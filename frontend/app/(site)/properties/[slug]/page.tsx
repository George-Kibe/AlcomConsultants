import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PropertyDetailView } from "@/components/listings/property-detail";
import { safely, serverApi } from "@/lib/api/server";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { formatListingPrice } from "@/lib/format";

/** One fetch per request, shared by generateMetadata and the page. */
const getProperty = cache(async (slug: string) =>
  safely(() =>
    serverApi.GET("/api/v1/properties/{slug}/", { params: { path: { slug } } }),
  ),
);

export async function generateMetadata({
  params,
}: PageProps<"/properties/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { data: p } = await getProperty(slug);
  if (!p) return { title: "Property not found" };
  const cover = p.media.find((m) => m.kind === "image");
  const title = p.seo_title || `${p.title}, ${p.location.area}`;
  const description =
    p.seo_description ||
    `${formatListingPrice(p.price, p.price_unit, p.price_on_request)} · ${p.description.slice(0, 120)}`;
  return {
    title,
    description,
    alternates: { canonical: `/properties/${p.slug}` },
    // Demo listings stay out of search engines.
    ...(p.is_demo && { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      type: "website",
      images: cover
        ? [
            {
              url: cloudinaryUrl(
                cover.public_id,
                "c_fill,w_1200,h_630,g_auto,f_jpg,q_auto",
              ),
              width: 1200,
              height: 630,
            },
          ]
        : undefined,
    },
  };
}

export default async function PropertyPage({
  params,
}: PageProps<"/properties/[slug]">) {
  const { slug } = await params;
  const [{ data: p, status }, similar] = await Promise.all([
    getProperty(slug),
    safely(() =>
      serverApi.GET("/api/v1/properties/{slug}/similar/", {
        params: { path: { slug } },
      }),
    ),
  ]);
  if (!p) {
    if (status === 404) notFound();
    throw new Error("Listing temporarily unavailable");
  }

  return <PropertyDetailView p={p} similar={similar.data ?? []} />;
}
