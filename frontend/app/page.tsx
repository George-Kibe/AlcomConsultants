import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheckIcon,
  HandshakeIcon,
  MapPinnedIcon,
  MessagesSquareIcon,
} from "lucide-react";

import { CtaBand } from "@/components/site/cta-band";
import { HeroSearch } from "@/components/site/hero-search";
import { ServicesGrid } from "@/components/site/services-grid";

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
        <Image
          src="/images/nairobi.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div
          aria-hidden
          className="from-brand-navy via-brand-navy/80 to-brand-navy/40 sm:via-brand-navy/70 sm:to-brand-navy/20 absolute inset-0 -z-10 bg-gradient-to-t sm:bg-gradient-to-r"
        />
        <div className="container-page flex min-h-[560px] flex-col justify-center gap-8 py-16 sm:min-h-[620px]">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/90 ring-1 ring-white/20">
              Property agency · Management · Valuations
            </p>
            <h1 className="text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl">
              Find, manage and value property across Kenya
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/85">
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
