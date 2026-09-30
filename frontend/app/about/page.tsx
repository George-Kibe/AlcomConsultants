import type { Metadata } from "next";
import { EyeIcon, ShieldCheckIcon, TargetIcon } from "lucide-react";

import { CtaBand } from "@/components/site/cta-band";
import { PageHeader } from "@/components/site/page-header";
import { ServicesGrid } from "@/components/site/services-grid";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About us",
  description: `Learn about ${siteConfig.name}, a Kenyan real estate consultancy offering agency, management and valuation services.`,
};

// TODO(content): replace with Alcom's own story, mission, vision and values.
const pillars = [
  {
    Icon: TargetIcon,
    title: "Our mission",
    text: "To help our clients make confident property decisions through honest advice and dependable service.",
  },
  {
    Icon: EyeIcon,
    title: "Our vision",
    text: "To be a trusted name in Kenyan real estate for buyers, tenants, landlords and institutions alike.",
  },
  {
    Icon: ShieldCheckIcon,
    title: "Our values",
    text: "Integrity, professionalism, responsiveness and respect for every client and every property.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About us"
        intro={`${siteConfig.name} is a Kenyan real estate consultancy providing property agency, property management and valuation services.`}
      />
      <section className="container-page grid gap-6 py-12 sm:py-16 md:grid-cols-3">
        {pillars.map(({ Icon, title, text }) => (
          <div key={title} className="bg-card rounded-2xl border p-6">
            <Icon className="text-success mb-4 size-8" aria-hidden />
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-muted-foreground mt-2">{text}</p>
          </div>
        ))}
      </section>
      <section
        className="bg-muted/60 py-12 sm:py-16"
        aria-labelledby="about-services"
      >
        <div className="container-page">
          <h2 id="about-services" className="mb-8 text-3xl font-bold">
            What we do
          </h2>
          <ServicesGrid />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
