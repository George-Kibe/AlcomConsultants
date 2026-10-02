import type { Metadata } from "next";

import { CtaBand } from "@/components/site/cta-band";
import { PageHeader } from "@/components/site/page-header";
import { ServicesGrid } from "@/components/site/services-grid";

export const metadata: Metadata = {
  alternates: { canonical: "/services" },
  title: "Services",
  description:
    "Property agency, property management and property valuations across Kenya from Alcom Consultants.",
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        title="Our services"
        intro="Everything you need to buy, rent, own and value property in Kenya, with one team."
      />
      <section className="container-page py-12 sm:py-16">
        <ServicesGrid headingLevel="h2" />
      </section>
      <CtaBand />
    </>
  );
}
