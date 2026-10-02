import type { Metadata } from "next";
import {
  BadgeCheckIcon,
  BriefcaseIcon,
  CheckIcon,
  EyeIcon,
  LightbulbIcon,
  ShieldCheckIcon,
  TargetIcon,
  TimerIcon,
  UsersIcon,
} from "lucide-react";

import { ClientTypes } from "@/components/site/client-types";
import { CtaBand } from "@/components/site/cta-band";
import { PageHeader } from "@/components/site/page-header";
import { ServicesGrid } from "@/components/site/services-grid";
import { alliedServices, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About us",
  description: `${siteConfig.name} is a Kenyan firm of registered valuers, property managers and estate agents, based in Westlands, Nairobi.`,
};

const values = [
  {
    Icon: ShieldCheckIcon,
    title: "Integrity",
    text: "Conducting our business with honesty, transparency and accountability.",
  },
  {
    Icon: BriefcaseIcon,
    title: "Professionalism",
    text: "Maintaining high standards of technical competence and service delivery.",
  },
  {
    Icon: UsersIcon,
    title: "Client focus",
    text: "Understanding and responding to our clients' unique needs.",
  },
  {
    Icon: LightbulbIcon,
    title: "Innovation",
    text: "Embracing technology and modern approaches to real estate and asset management.",
  },
  {
    Icon: TimerIcon,
    title: "Reliability",
    text: "Providing accurate, timely and dependable professional advice.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader title="About us" intro={siteConfig.tagline} />

      <section className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-5">
        <div className="text-muted-foreground flex flex-col gap-4 text-lg lg:col-span-3">
          <h2 className="text-foreground text-3xl font-bold">Who we are</h2>
          <p>
            {siteConfig.name} is a registered real estate services firm
            incorporated in the Republic of Kenya. We offer specialised,
            reliable and professional services in property valuation, property
            management, estate agency, asset tagging and management, land
            surveying and real estate consultancy to individual, corporate and
            institutional clients across Kenya and the wider East African
            region.
          </p>
          <p>
            The firm is led by registered and experienced professionals,
            including Registered Valuers, Property Managers and Estate Agents
            licensed under the relevant statutory bodies in Kenya, among them
            the Estate Agents Registration Board (EARB) and the Valuers
            Registration Board (VRB).
          </p>
          <p>
            We are registered under the Companies Act, 2015, hold the statutory
            and regulatory approvals required to practise, and serve clients
            across Kenya from our office in {siteConfig.contact.address}.
          </p>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="bg-card rounded-2xl border p-6">
            <EyeIcon className="text-success mb-4 size-8" aria-hidden />
            <h2 className="text-xl font-semibold">Our vision</h2>
            <p className="text-muted-foreground mt-2">
              To be a leading and trusted real estate and asset advisory
              consultancy in Kenya, delivering innovative, professional and
              value-driven property solutions.
            </p>
          </div>
          <div className="bg-card rounded-2xl border p-6">
            <TargetIcon className="text-success mb-4 size-8" aria-hidden />
            <h2 className="text-xl font-semibold">Our mission</h2>
            <p className="text-muted-foreground mt-2">
              To provide reliable, professional and innovative real estate,
              valuation, asset management and property consultancy services that
              enable our clients to make informed decisions, optimise their
              assets and achieve sustainable value.
            </p>
          </div>
        </div>
      </section>

      <section
        className="container-page pb-12 sm:pb-16"
        aria-labelledby="about-values"
      >
        <h2 id="about-values" className="mb-8 text-3xl font-bold">
          Our core values
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {values.map(({ Icon, title, text }) => (
            <li key={title} className="bg-card rounded-2xl border p-5">
              <Icon className="text-success mb-3 size-7" aria-hidden />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="bg-muted/60 py-12 sm:py-16"
        aria-labelledby="about-services"
      >
        <div className="container-page flex flex-col gap-10">
          <div>
            <h2 id="about-services" className="mb-8 text-3xl font-bold">
              What we do
            </h2>
            <ServicesGrid />
          </div>
          <div className="bg-card rounded-2xl border p-6 sm:p-8">
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <BadgeCheckIcon className="text-success size-6" aria-hidden />
              Allied professional services
            </h3>
            <p className="text-muted-foreground mt-2">
              Alongside our core mandates, we support clients&apos; broader real
              estate needs:
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {alliedServices.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckIcon
                    className="text-success mt-1 size-4 shrink-0"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <ClientTypes id="about-clients" />

      <CtaBand />
    </>
  );
}
