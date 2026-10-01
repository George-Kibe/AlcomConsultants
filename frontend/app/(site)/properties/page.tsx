import type { Metadata } from "next";
import { HomeIcon } from "lucide-react";

import { WhatsAppIcon } from "@/components/icons";
import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Properties",
  description: "Properties for sale and rent across Kenya.",
};

// Placeholder until property search and listings are built in Phase 2.
export default function PropertiesPage() {
  return (
    <>
      <PageHeader
        title="Properties"
        intro="Homes, land and commercial property for sale and rent across Kenya."
      />
      <section className="container-page flex flex-col items-center gap-5 py-16 text-center sm:py-24">
        <span className="bg-secondary text-primary flex size-16 items-center justify-center rounded-2xl">
          <HomeIcon className="size-8" aria-hidden />
        </span>
        <h2 className="text-2xl font-bold">
          Our online listings are coming soon
        </h2>
        <p className="text-muted-foreground max-w-md">
          In the meantime, tell us what you are looking for and we will share
          available properties with you directly.
        </p>
        <Button asChild size="xl" variant="whatsapp">
          <a
            href={whatsappLink("Hello Alcom, I'm looking for a property.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon className="size-5" data-icon="inline-start" />
            Tell us what you need
          </a>
        </Button>
      </section>
    </>
  );
}
