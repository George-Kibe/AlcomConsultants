import type { components } from "@/lib/api/schema";
import { services, siteConfig } from "@/lib/site-config";

export type LocationPage = components["schemas"]["LocationPage"];
export type Deal = "sale" | "rent" | "lease";

/** URL prefix and wording of the location landing pages for each deal type. */
export const DEALS: Record<
  Deal,
  { path: string; title: string; noun: string; verb: string }
> = {
  sale: {
    path: "/property-for-sale",
    title: "Property for sale",
    noun: "properties for sale",
    verb: "buy",
  },
  rent: {
    path: "/property-for-rent",
    title: "Property for rent",
    noun: "properties to rent",
    verb: "rent",
  },
  lease: {
    path: "/commercial-property-to-let",
    title: "Commercial property to let",
    noun: "commercial spaces to let",
    verb: "lease",
  },
};

export function locationHref(
  page: Pick<LocationPage, "deal" | "slug">,
): string {
  return `${DEALS[page.deal as Deal].path}/${page.slug}`;
}

/** "Kilimani, Nairobi" for an area; "Nairobi County" for a county. */
export function placeName(
  page: Pick<LocationPage, "kind" | "name" | "county">,
) {
  return page.kind === "county"
    ? `${page.name} County`
    : `${page.name}, ${page.county}`;
}

// ------------------------------------------------------------------ structured data

const abs = (path: string) => new URL(path, siteConfig.url).toString();

/** The company, for Google's knowledge panel and local results. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": abs("/#organization"),
    name: siteConfig.name,
    alternateName: siteConfig.shortName,
    url: abs("/"),
    logo: abs("/brand/alcom-logo.png"),
    image: abs("/opengraph-image"),
    description: siteConfig.description,
    telephone: siteConfig.contact.phone.replace(/\s/g, ""),
    email: siteConfig.contact.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Westlands, Nairobi",
      addressRegion: "Nairobi",
      addressCountry: "KE",
    },
    areaServed: { "@type": "Country", name: "Kenya" },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "17:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "13:00",
      },
    ],
    makesOffer: services.map((s) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: s.title,
        url: abs(`/services/${s.slug}`),
      },
    })),
    sameAs: Object.values(siteConfig.social).filter(Boolean),
  };
}

/** The site, with a search box Google can show under the result. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": abs("/#website"),
    name: siteConfig.name,
    url: abs("/"),
    publisher: { "@id": abs("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${abs("/properties")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(crumbs: { title: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.title,
      ...(c.href && { item: abs(c.href) }),
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
