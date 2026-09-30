import Link from "next/link";
import {
  BadgeCheckIcon,
  HandshakeIcon,
  MapPinnedIcon,
  MessagesSquareIcon,
} from "lucide-react";

import { CtaBand } from "@/components/site/cta-band";
import { HeroSearch } from "@/components/site/hero-search";
import { HeroSlideshow } from "@/components/site/hero-slideshow";
import { ServicesGrid } from "@/components/site/services-grid";
import { heroSlides } from "@/lib/hero-slides";

// TODO(content): review marketing copy with Alcom.
const reasons = [
  {
    Icon: BadgeCheckIcon,
    title: "Professional and transparent",
    text: "Clear advice, honest pricing and written agreements at every step.",
  },
  {
    Icon: MapPinnedIcon,
    title: "Local market knowledge",
    text: "We know Kenya's neighbourhoods, prices and what makes a property a good investment.",
  },
  {
    Icon: HandshakeIcon,
    title: "One partner, three services",
    text: "Agency, management and valuations under one roof, so your property is in consistent hands.",
  },
  {
    Icon: MessagesSquareIcon,
    title: "Easy to reach",
    text: "Talk to us on WhatsApp, by phone or by email, whichever suits you.",
  },
];

export default function Home() {
  return (
    <>
      <section className="bg-brand-navy relative isolate overflow-hidden text-white">
        <HeroSlideshow
          slides={heroSlides}
          controlsClassName="absolute bottom-4 left-1/2 -translate-x-1/2 sm:right-6 sm:bottom-6 sm:left-auto sm:translate-x-0"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/45 to-black/30 sm:bg-gradient-to-r sm:from-black/70 sm:via-black/35 sm:via-45% sm:to-transparent sm:to-80%"
        />
        <div className="container-page flex min-h-[600px] flex-col justify-center gap-8 pt-16 pb-24 sm:min-h-[640px] sm:py-20">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex rounded-full bg-black/35 px-3 py-1 text-sm font-medium text-white/90 ring-1 ring-white/20 backdrop-blur-sm">
              Property agency · Management · Valuations
            </p>
            <h1 className="text-4xl leading-tight font-bold text-shadow-black/40 text-shadow-lg sm:text-5xl lg:text-6xl">
              Find, manage and value property across Kenya
            </h1>
            <p className="mt-4 max-w-xl text-lg font-medium text-white text-shadow-black/60 text-shadow-lg">
              Homes, land and commercial space to buy or rent, and expert help
              looking after the property you own.
            </p>
          </div>
          <HeroSearch />
        </div>
      </section>

      <section
        className="container-page py-16 sm:py-20"
        aria-labelledby="services-heading"
      >
        <div className="mb-10 max-w-2xl">
          <h2 id="services-heading" className="text-3xl font-bold sm:text-4xl">
            How we can help
          </h2>
          <p className="text-muted-foreground mt-3 text-lg">
            Whether you are buying, renting, investing or already own property,
            we have you covered.
          </p>
        </div>
        <ServicesGrid />
      </section>

      <section
        className="bg-muted/60 py-16 sm:py-20"
        aria-labelledby="why-heading"
      >
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

      <CtaBand />
    </>
  );
}
