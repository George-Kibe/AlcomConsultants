import Link from "next/link";
import { connection } from "next/server";
import {
  BadgeCheckIcon,
  HandshakeIcon,
  FileCheckIcon,
  MessagesSquareIcon,
} from "lucide-react";

import { ClientTypes } from "@/components/site/client-types";
import { CtaBand } from "@/components/site/cta-band";
import { FeaturedProperties } from "@/components/site/featured-properties";
import { HeroSearch } from "@/components/site/hero-search";
import { HeroSlideshow } from "@/components/site/hero-slideshow";
import { ServicesGrid } from "@/components/site/services-grid";
import { Testimonials } from "@/components/site/testimonials";
import { heroSlides } from "@/lib/hero-slides";
import { safely, serverApi } from "@/lib/api/server";
import type { PropertyListItem } from "@/lib/listings";

const reasons = [
  {
    Icon: BadgeCheckIcon,
    title: "Registered professionals",
    text: "Valuers, property managers and estate agents licensed by the VRB and EARB.",
  },
  {
    Icon: FileCheckIcon,
    title: "Standards you can rely on",
    text: "Valuations under the Valuers Act and International Valuation Standards, with clear, defensible reports.",
  },
  {
    Icon: HandshakeIcon,
    title: "One Partner, All Property Services",
    text: "Valuation, property management, estate agency, asset management and land surveying under one roof, so your property is in consistent hands.",
  },
  {
    Icon: MessagesSquareIcon,
    title: "Easy to reach",
    text: "Talk to us on WhatsApp, by phone or by email, whichever suits you.",
  },
];

const FEATURED_COUNT = 6;

/** Featured listings, topped up with the newest ones; empty if the API is unavailable. */
async function homeListings(): Promise<PropertyListItem[]> {
  await connection(); // always render with current listings
  const featured = await safely(() =>
    serverApi.GET("/api/v1/properties/", {
      params: { query: { featured: true, page_size: FEATURED_COUNT } },
    }),
  );
  const items = featured.data?.results.slice(0, FEATURED_COUNT) ?? [];
  if (items.length >= FEATURED_COUNT || featured.data === null) return items;
  const latest = await safely(() =>
    serverApi.GET("/api/v1/properties/", {
      params: { query: { sort: "newest", page_size: FEATURED_COUNT * 2 } },
    }),
  );
  const extra = (latest.data?.results ?? []).filter(
    (p) => !items.some((i) => i.slug === p.slug),
  );
  return [...items, ...extra].slice(0, FEATURED_COUNT);
}

export default async function Home() {
  const listings = await homeListings();
  return (
    <>
      <section className="bg-brand-navy relative isolate overflow-hidden text-white">
        <HeroSlideshow
          slides={heroSlides}
          controlsClassName="absolute bottom-4 left-1/2 -translate-x-1/2 sm:right-6 sm:bottom-6 sm:left-auto sm:translate-x-0"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-t from-black/70 via-black/45 to-black/30 sm:bg-linear-to-r sm:from-black/70 sm:via-black/35 sm:via-45% sm:to-transparent sm:to-80%"
        />
        <div className="container-page flex min-h-150 flex-col justify-center gap-8 pt-16 pb-24 sm:min-h-160 sm:py-20">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex rounded-full bg-black/35 px-3 py-1 text-sm font-medium text-white/90 ring-1 ring-white/20 backdrop-blur-sm">
              Your Property. Our Expertise. Better Results.
            </p>
            <h1 className="text-3xl leading-tight font-bold text-shadow-black/40 text-shadow-lg sm:text-4xl lg:text-8xl">
              From finding the right property to managing, selling and valuing
              it, We’ve got you covered across Kenya.
            </h1>
            <p className="mt-4 max-w-xl text-lg font-medium text-white text-shadow-black/60 text-shadow-lg">
              Homes, land and commercial space to buy or rent, and expert help
              looking after the property you own.
            </p>
          </div>
          <HeroSearch />
        </div>
      </section>

      <FeaturedProperties properties={listings} />

      <section
        className="bg-muted/60 py-16 sm:py-20"
        aria-labelledby="services-heading"
      >
        <div className="container-page">
          <div className="mb-10 max-w-2xl">
            <h2
              id="services-heading"
              className="text-3xl font-bold sm:text-4xl"
            >
              How we can help
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Whether you are buying, renting, investing or already own
              property, we have you covered.
            </p>
          </div>
          <ServicesGrid />
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="why-heading">
        <div className="container-page">
          <div className="mb-10 max-w-2xl">
            <h2 id="why-heading" className="text-3xl font-bold sm:text-4xl">
              Why work with Alcom
            </h2>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map(({ Icon, title, text }) => (
              <li
                key={title}
                className="bg-card ring-border rounded-2xl p-6 ring-1"
              >
                <Icon className="text-success mb-4 size-8" aria-hidden />
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-2">{text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8">
            <Link
              href="/about"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              More about us
            </Link>
          </p>
        </div>
      </section>

      <Testimonials />

      <ClientTypes />

      <CtaBand />
    </>
  );
}
