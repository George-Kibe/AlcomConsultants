import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  BathIcon,
  BedDoubleIcon,
  CarIcon,
  ChevronRightIcon,
  HashIcon,
  HomeIcon,
  MailIcon,
  MapIcon,
  PhoneIcon,
  RulerIcon,
  SofaIcon,
  type LucideIcon,
} from "lucide-react";

import { WhatsAppIcon } from "@/components/icons";
import { AmenityIcon } from "@/components/listings/amenity-icon";
import { Gallery } from "@/components/listings/gallery";
import { LocationMapLoader } from "@/components/listings/location-map-loader";
import { NearbyPlaces } from "@/components/listings/nearby-places";
import { VideoFacade } from "@/components/listings/video-facade";
import { PropertyCard } from "@/components/site/property-card";
import { CloudImage } from "@/components/cloud-image";
import { Button } from "@/components/ui/button";
import { safely, serverApi } from "@/lib/api/server";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { formatListingPrice } from "@/lib/format";
import { jsonLd } from "@/lib/json-ld";
import {
  listingJsonLd,
  locationLabel,
  paragraphs,
  videoEmbed,
} from "@/lib/listings";
import { siteConfig, telLink, whatsappLink } from "@/lib/site-config";

const DEAL_LABEL: Record<string, string> = {
  sale: "For sale",
  rent: "For rent",
  lease: "To lease",
};
const FURNISHING: Record<string, string> = {
  furnished: "Furnished",
  semi: "Semi-furnished",
  unfurnished: "Unfurnished",
};
const CLOSED: Record<string, string> = {
  under_offer: "Under offer — enquire to join the waiting list.",
  sold: "This property has been sold.",
  let: "This property has been let.",
};

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

  const photos = p.media.filter((m) => m.kind === "image");
  const plans = p.media.filter((m) => m.kind === "floor_plan");
  const video = videoEmbed(p.video_url);
  const where = locationLabel(p);
  const pageUrl = `${siteConfig.url}/properties/${p.slug}`;
  const contactPhone = p.agent?.phone || siteConfig.contact.phone;
  const enquiry = `Hello Alcom, I'm interested in ${p.reference}: ${p.title} (${pageUrl})`;
  const closed = p.status ? CLOSED[p.status] : undefined;

  const facts: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: HomeIcon, label: "Type", value: p.property_type.name },
    ...(p.bedrooms != null
      ? [
          {
            icon: BedDoubleIcon,
            label: "Bedrooms",
            value: p.bedrooms === 0 ? "Studio" : String(p.bedrooms),
          },
        ]
      : []),
    ...(p.bathrooms != null
      ? [{ icon: BathIcon, label: "Bathrooms", value: String(p.bathrooms) }]
      : []),
    ...(p.built_area_sqm
      ? [
          {
            icon: RulerIcon,
            label: "Built area",
            value: `${Number(p.built_area_sqm)} m²`,
          },
        ]
      : []),
    ...(p.land_area
      ? [
          {
            icon: MapIcon,
            label: "Land",
            value: `${Number(p.land_area)} ${p.land_area_unit === "sqm" ? "m²" : p.land_area_unit}`,
          },
        ]
      : []),
    ...(p.parking_spaces != null
      ? [{ icon: CarIcon, label: "Parking", value: String(p.parking_spaces) }]
      : []),
    ...(p.furnishing
      ? [
          {
            icon: SofaIcon,
            label: "Furnishing",
            value: FURNISHING[p.furnishing] ?? p.furnishing,
          },
        ]
      : []),
    { icon: HashIcon, label: "Reference", value: p.reference ?? "" },
  ];

  return (
    <article className="container-page flex flex-col gap-8 py-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            listingJsonLd(
              p,
              pageUrl,
              photos
                .slice(0, 5)
                .map((m) =>
                  cloudinaryUrl(
                    m.public_id,
                    "c_fill,w_1200,h_800,f_jpg,q_auto",
                  ),
                ),
            ),
          ).replace(/</g, "\\u003c"),
        }}
      />

      <nav aria-label="Breadcrumb">
        <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRightIcon className="size-3.5" aria-hidden />
            <Link href="/properties" className="hover:text-foreground">
              Properties
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRightIcon className="size-3.5" aria-hidden />
            <Link
              href={`/properties?county=${p.location.county_slug}&area=${p.location.area_slug}&where=${encodeURIComponent(`${p.location.area}, ${p.location.county}`)}`}
              className="hover:text-foreground"
            >
              {p.location.area}
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRightIcon className="size-3.5" aria-hidden />
            <span aria-current="page" className="text-foreground">
              {p.reference}
            </span>
          </li>
        </ol>
      </nav>

      {closed && (
        <p
          className="bg-secondary rounded-xl px-4 py-3 font-medium"
          role="status"
        >
          {closed}
        </p>
      )}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-success text-sm font-semibold tracking-wide uppercase">
            {DEAL_LABEL[p.deal_type]}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-4xl">{p.title}</h1>
          <p className="text-muted-foreground mt-2">{where}</p>
        </div>
        <p className="text-primary text-2xl font-bold sm:text-3xl">
          {formatListingPrice(p.price, p.price_unit, p.price_on_request)}
        </p>
      </header>

      <Gallery photos={photos} title={p.title} />

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="flex flex-col gap-10 lg:col-span-2">
          <section aria-labelledby="facts">
            <h2 id="facts" className="sr-only">
              Key facts
            </h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-muted/60 rounded-xl p-4">
                  <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </dt>
                  <dd className="mt-1 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="about" className="flex flex-col gap-3">
            <h2 id="about" className="text-xl font-bold">
              About this property
            </h2>
            {paragraphs(p.description).map((para, i) => (
              <p key={i} className="leading-relaxed whitespace-pre-line">
                {para}
              </p>
            ))}
          </section>

          {p.amenities.length > 0 && (
            <section
              aria-labelledby="amenities"
              className="flex flex-col gap-4"
            >
              <h2 id="amenities" className="text-xl font-bold">
                What this place offers
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {p.amenities.map((a) => (
                  <li
                    key={a.slug}
                    className="bg-muted/60 flex items-center gap-3 rounded-xl p-3"
                  >
                    <span className="bg-secondary text-primary flex size-9 items-center justify-center rounded-lg">
                      <AmenityIcon name={a.icon} className="size-5" />
                    </span>
                    {a.name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {video && (
            <section aria-labelledby="video" className="flex flex-col gap-4">
              <h2 id="video" className="text-xl font-bold">
                Video tour
              </h2>
              <VideoFacade
                src={video.src}
                provider={video.provider}
                title={p.title}
              />
            </section>
          )}

          {plans.length > 0 && (
            <section aria-labelledby="plans" className="flex flex-col gap-4">
              <h2 id="plans" className="text-xl font-bold">
                Floor plans
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {plans.map((m, i) => (
                  <li
                    key={m.public_id}
                    className="bg-card relative aspect-[4/3] overflow-hidden rounded-xl border"
                  >
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open floor plan ${i + 1} full size`}
                    >
                      <CloudImage
                        src={m.public_id}
                        alt={m.alt_text || `Floor plan ${i + 1}`}
                        fill
                        sizes="(min-width: 640px) 50vw, 100vw"
                        className="object-contain"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.location.lat != null && p.location.lng != null && (
            <section aria-labelledby="location" className="flex flex-col gap-4">
              <h2 id="location" className="text-xl font-bold">
                Location
              </h2>
              <p className="text-muted-foreground">
                {where}
                {p.location.is_exact
                  ? ""
                  : " · the exact address is shared on enquiry"}
              </p>
              <LocationMapLoader
                lat={p.location.lat}
                lng={p.location.lng}
                exact={p.location.is_exact}
                label={where}
              />
              <NearbyPlaces slug={p.slug} approximate={!p.location.is_exact} />
            </section>
          )}
        </div>

        <aside
          className="lg:sticky lg:top-24 lg:self-start"
          aria-label="Contact"
        >
          <div className="bg-card flex flex-col gap-4 rounded-2xl border p-5 sm:p-6">
            <div>
              <p className="text-muted-foreground text-sm">
                Interested? Talk to
              </p>
              <p className="text-lg font-semibold">
                {p.agent?.name || siteConfig.name}
              </p>
              <p className="text-muted-foreground text-sm">
                Quote reference {p.reference}
              </p>
            </div>
            <Button asChild size="xl" variant="whatsapp">
              <a
                href={whatsappLink(enquiry)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="size-5" data-icon="inline-start" />
                WhatsApp
              </a>
            </Button>
            <Button asChild size="xl">
              <a href={telLink(contactPhone)}>
                <PhoneIcon data-icon="inline-start" />
                Call {contactPhone}
              </a>
            </Button>
            <Button asChild size="xl" variant="outline">
              <a
                href={`mailto:${p.agent?.email || siteConfig.contact.email}?subject=${encodeURIComponent(`Enquiry: ${p.reference} ${p.title}`)}`}
              >
                <MailIcon data-icon="inline-start" />
                Email
              </a>
            </Button>
            {p.project && (
              <p className="text-sm">
                Part of{" "}
                <Link
                  href={`/projects/${p.project.slug}`}
                  className="text-primary font-medium hover:underline"
                >
                  {p.project.name}
                </Link>
              </p>
            )}
          </div>
        </aside>
      </div>

      {similar.data && similar.data.length > 0 && (
        <section
          aria-labelledby="similar"
          className="flex flex-col gap-6 border-t pt-10"
        >
          <h2 id="similar" className="text-2xl font-bold">
            Similar properties
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {similar.data.map((s) => (
              <li key={s.slug}>
                <PropertyCard property={s} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
