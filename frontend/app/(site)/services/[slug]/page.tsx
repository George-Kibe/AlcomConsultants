import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CheckCircle2Icon } from "lucide-react";

import { WhatsAppIcon } from "@/components/icons";
import { EnquiryForm } from "@/components/enquiries/enquiry-form";
import { CtaBand } from "@/components/site/cta-band";
import { FaqList, loadFaqs } from "@/components/site/faq-list";
import { PageHeader } from "@/components/site/page-header";
import { ServiceIcon } from "@/components/site/service-icon";
import { Button } from "@/components/ui/button";
import { services, whatsappLink } from "@/lib/site-config";

export const dynamicParams = false;

function getService(slug: string) {
  return services.find((service) => service.slug === slug);
}

export async function generateMetadata({
  params,
}: PageProps<"/services/[slug]">): Promise<Metadata> {
  const service = getService((await params).slug);
  return service ? { title: service.title, description: service.summary } : {};
}

export default async function ServicePage({
  params,
}: PageProps<"/services/[slug]">) {
  const service = getService((await params).slug);
  if (!service) notFound();
  await connection(); // FAQs come from the dashboard
  const faqs = await loadFaqs(service.faqCategories);

  const others = services.filter((s) => s.slug !== service.slug);

  return (
    <>
      <PageHeader
        title={service.title}
        intro={service.summary}
        breadcrumbs={[{ title: "Services", href: "/services" }]}
      />
      <section className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {service.tagline && (
            <p className="text-success mb-4 text-sm font-semibold tracking-wide uppercase">
              {service.tagline}
            </p>
          )}
          <p className="text-lg leading-relaxed">{service.description}</p>
          <h2 className="mt-10 mb-5 text-2xl font-bold">What we offer</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {service.highlights.map((item) => (
              <li key={item} className="bg-muted/70 flex gap-3 rounded-xl p-4">
                <CheckCircle2Icon
                  className="text-success mt-0.5 size-5 shrink-0"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <aside className="flex flex-col gap-6">
          <div className="bg-card rounded-2xl border p-6 lg:sticky lg:top-24">
            <span className="bg-secondary text-primary mb-4 flex size-12 items-center justify-center rounded-xl">
              <ServiceIcon slug={service.slug} className="size-6" />
            </span>
            <h2 className="text-xl font-semibold">Get started</h2>
            <p className="text-muted-foreground mt-2">
              Tell us what you need and we will get back to you promptly.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Button asChild size="xl">
                <Link href={service.cta.href}>{service.cta.label}</Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <a
                  href={whatsappLink(
                    `Hello Alcom, I'd like to ask about ${service.title}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon
                    className="text-success size-5"
                    data-icon="inline-start"
                  />
                  Ask on WhatsApp
                </a>
              </Button>
            </div>
          </div>
          <nav
            aria-labelledby="other-services"
            className="rounded-2xl border p-6"
          >
            <h2 id="other-services" className="mb-3 font-semibold">
              Other services
            </h2>
            <ul className="flex flex-col gap-2">
              {others.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="text-primary hover:underline"
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </section>
      {faqs.length > 0 && (
        <section
          aria-labelledby="service-faqs"
          className="container-page pb-12 sm:pb-16"
        >
          <h2 id="service-faqs" className="mb-4 text-2xl font-bold">
            Frequently asked questions
          </h2>
          <div className="max-w-3xl">
            <FaqList faqs={faqs} />
          </div>
        </section>
      )}
      <section
        id="enquire"
        aria-labelledby="enquire-title"
        className="container-page scroll-mt-24 pb-12 sm:pb-16"
      >
        <div className="bg-card max-w-3xl rounded-2xl border p-5 sm:p-8">
          <h2 id="enquire-title" className="text-2xl font-bold">
            {service.enquiry.title}
          </h2>
          <p className="text-muted-foreground mt-1 mb-6">
            {service.enquiry.intro}
          </p>
          <EnquiryForm kind={service.enquiry.kind} />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
