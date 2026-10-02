import type { Metadata } from "next";
import { connection } from "next/server";
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";

import { WhatsAppIcon } from "@/components/icons";
import { EnquiryForm } from "@/components/enquiries/enquiry-form";
import { FaqList, loadFaqs } from "@/components/site/faq-list";
import { PageHeader } from "@/components/site/page-header";
import { siteConfig, telLink, whatsappLink } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Contact ${siteConfig.name} by WhatsApp, phone or email about buying, renting, managing or valuing property.`,
};

const channels = [
  {
    Icon: WhatsAppIcon,
    title: "WhatsApp",
    value: "Chat with us",
    href: whatsappLink(),
    external: true,
  },
  {
    Icon: PhoneIcon,
    title: "Call us",
    value: siteConfig.contact.phone + " / " + siteConfig.contact.altPhone,
    href: telLink(),
  },
  {
    Icon: MailIcon,
    title: "Email",
    value: siteConfig.contact.email,
    href: `mailto:${siteConfig.contact.email}`,
  },
];

export default async function ContactPage() {
  await connection(); // FAQs come from the dashboard
  const faqs = await loadFaqs();
  return (
    <>
      <PageHeader
        title="Contact us"
        intro="Questions about a property, or want to discuss management or a valuation? We are happy to help."
      />
      <section className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-2xl font-bold">Get in touch</h2>
          <ul className="flex flex-col gap-3">
            {channels.map(({ Icon, title, value, href, external }) => (
              <li key={title}>
                <a
                  href={href}
                  {...(external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="bg-card hover:border-primary/40 flex items-center gap-4 rounded-2xl border p-4 transition-colors"
                >
                  <span className="bg-secondary text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-muted-foreground text-sm">
                      {title}
                    </span>
                    <span className="font-medium">{value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="bg-muted/70 flex flex-col gap-3 rounded-2xl p-5 text-sm">
            <p className="flex gap-3">
              <MapPinIcon
                className="text-success size-5 shrink-0"
                aria-hidden
              />
              {siteConfig.contact.address}
            </p>
            <p className="flex gap-3">
              <ClockIcon className="text-success size-5 shrink-0" aria-hidden />
              {siteConfig.contact.hours}
            </p>
          </div>
        </div>
        <div className="lg:col-span-3" id="message">
          <div className="bg-card rounded-2xl border p-5 sm:p-8">
            <h2 className="text-2xl font-bold">Send us a message</h2>
            <p className="text-muted-foreground mt-1 mb-6">
              We reply within one working day.
            </p>
            <EnquiryForm kind="contact" submitLabel="Send message" />
          </div>
        </div>
      </section>
      {faqs.length > 0 && (
        <section className="container-page pb-12 sm:pb-16" id="faqs">
          <h2 className="mb-4 text-2xl font-bold">
            Frequently asked questions
          </h2>
          <div className="max-w-3xl">
            <FaqList faqs={faqs} />
          </div>
        </section>
      )}
    </>
  );
}
