/**
 * Company details and navigation used across the site.
 * Moves to the backend SiteSettings model (editable in the dashboard) in a later phase.
 */
export const siteConfig = {
  name: "Alcom Consultants Limited",
  shortName: "Alcom Consultants",
  tagline: "Registered Valuers • Property Managers • Estate Agents",
  description:
    "Registered valuers, property managers and estate agents in Westlands, Nairobi, serving clients across Kenya.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:8080",
  contact: {
    phone: "+254 792 616 015",
    altPhone: "+254 716 014 087",
    whatsapp: "254792616015", // international format, digits only
    email: "info@alcomconsultants.co.ke",
    address: "Westlands, Nairobi, Kenya",
    hours: "Mon – Fri: 8:00am – 5:00pm · Sat: 9:00am – 1:00pm",
  },
  social: {
    // Empty links are hidden; add the URLs once the accounts exist.
    facebook: "",
    instagram: "",
    linkedin: "",
    x: "",
  },
} as const;

export type NavItem = { title: string; href: string };

export const mainNav: NavItem[] = [
  { title: "Home", href: "/" },
  { title: "Properties", href: "/properties" },
  { title: "Services", href: "/services" },
  { title: "About", href: "/about" },
  { title: "Blog", href: "/blog" },
  { title: "Contact", href: "/contact" },
];

export const legalNav: NavItem[] = [
  { title: "Privacy Policy", href: "/privacy" },
  { title: "Terms of Use", href: "/terms" },
  { title: "Cookie Policy", href: "/cookies" },
];

export type Service = {
  slug: "property-agency" | "property-management" | "property-valuations";
  title: string;
  summary: string;
  description: string;
  highlights: string[];
  cta: { label: string; href: string };
  /** The enquiry form at the bottom of the service page (#enquire). */
  enquiry: {
    kind: "contact" | "valuation" | "management";
    title: string;
    intro: string;
  };
};

export const services: Service[] = [
  {
    slug: "property-agency",
    title: "Estate Agency",
    summary:
      "Sale, purchase and letting of residential, commercial and industrial property across Kenya.",
    description:
      "We act as your intermediary in the sale, purchase and letting of property, backed by in-depth market knowledge and a wide client network. Our licensed estate agents market your property professionally, source and qualify buyers and tenants, and negotiate on your behalf through to completion.",
    highlights: [
      "Marketing and sale of residential, commercial and industrial property",
      "Letting and tenant sourcing",
      "Property market research and advisory",
      "Negotiation and closing of sale and lease transactions",
    ],
    cta: { label: "Browse properties", href: "/properties" },
    enquiry: {
      kind: "contact",
      title: "Selling or letting a property?",
      intro:
        "Tell us about the property and what you'd like to achieve. A consultant will call you back.",
    },
  },
  {
    slug: "property-management",
    title: "Property Management",
    summary:
      "Property and facilities management for residential, commercial and mixed-use developments.",
    description:
      "We provide comprehensive property and facilities management for commercial, residential and mixed-use developments, protecting your asset and securing optimal returns for owners and investors.",
    highlights: [
      "Rent collection and tenant management",
      "Lease administration and renewals",
      "Service charge budgeting and management",
      "Facilities and maintenance management",
      "Property inspections and condition reporting",
      "Statutory compliance (NEMA, county rates, fire certificates and more)",
    ],
    cta: { label: "Talk to us about your property", href: "#enquire" },
    enquiry: {
      kind: "management",
      title: "Talk to us about your property",
      intro:
        "Tell us about the property and we'll get back to you with how we would manage it and what it costs.",
    },
  },
  {
    slug: "property-valuations",
    title: "Valuation Services",
    summary:
      "Professional valuations by Registered Valuers for lending, sale, insurance, reporting and more.",
    description:
      "Our valuations are carried out by Registered Valuers in accordance with the Valuers Act and International Valuation Standards (IVS), giving banks, buyers, sellers, insurers and institutions a clear, defensible opinion of value.",
    highlights: [
      "Secured lending and mortgage valuations",
      "Sale and purchase (fair market value)",
      "Insurance (reinstatement cost assessment)",
      "Financial reporting and asset registers",
      "Compulsory acquisition and compensation",
      "Plant and machinery",
      "Probate, estate distribution and litigation support",
    ],
    cta: { label: "Request a valuation", href: "#enquire" },
    enquiry: {
      kind: "valuation",
      title: "Request a valuation",
      intro:
        "Tell us what you need valued and why. We'll reply with our fee and the earliest inspection date.",
    },
  },
];

/** Complementary services offered alongside the three core service lines. */
export const alliedServices = [
  "Real estate investment advisory and feasibility studies",
  "Project management and development consultancy",
  "Due diligence for property transactions",
  "Land economics and market research",
  "Corporate real estate portfolio advisory",
];

export function whatsappLink(message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${siteConfig.contact.whatsapp}${text}`;
}

export function telLink(phone: string = siteConfig.contact.phone) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
