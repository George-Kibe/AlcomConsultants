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
    cta: { label: "Talk to us about your property", href: "/contact" },
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
    cta: { label: "Request a valuation", href: "/contact" },
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
